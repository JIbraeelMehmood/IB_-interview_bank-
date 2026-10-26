/** The AI features from v7, kept as plain functions so screens stay thin.
 *  Every prompt carries the same guardrails: English-only fields stay English,
 *  explanations come back in the chosen language. */

import { aiJson, aiText, AiError } from './ai'
import type {
  JdPack,
  Lang,
  MockEval,
  Profile,
  Question,
  Scorecard,
  SpeakingFeedback,
} from './types'
import { LANG_LABEL } from './translate'
import { stripHtml } from './text'

/** Anything that must stay in English no matter the UI language. */
const ENGLISH_ONLY = (lang: Lang) =>
  lang === 'en'
    ? ''
    : `\n\nIMPORTANT: write these parts in ENGLISH only: the question, the model answer, interview lines the candidate would say, code, commands, and technical terms. Write the explanation parts in ${LANG_LABEL[lang]}.`

function profileBlock(p: Profile): string {
  if (!p || (!p.role && !p.years && !p.about)) return ''
  return `\n\nCANDIDATE PROFILE\nName: ${p.name || 'the candidate'}\nRole: ${p.role || 'senior full-stack developer'}\nExperience: ${p.years || 'not given'} years\nBackground: ${p.about || ''}\n`
}

/* --------------------------- explain to me -------------------------- */

export type ExplainFocus = 'concept' | 'code' | 'both'
export type ExplainStyle = 'simple' | 'interview' | 'deep'

/** D-03: explain in any language, any focus, any depth, as text. */
export async function explain(
  q: Question,
  lang: Lang,
  focus: ExplainFocus,
  style: ExplainStyle,
  signal?: AbortSignal,
): Promise<string> {
  const focusLine = {
    concept: 'Explain the idea and the trade-offs in plain words. No code.',
    code: 'Walk through the code line by line. Say what each line does and why it is there.',
    both: 'Explain the idea first in plain words, then walk through the code line by line.',
  }[focus]
  const styleLine = {
    simple: 'Use very simple words, as if explaining to a smart friend who is new to this.',
    interview: 'Write it the way a strong candidate answers this in an interview: direct, structured, with a concrete example from a real project.',
    deep: 'Go deep. Cover the internals, the alternatives you rejected and why, and the failure modes.',
  }[style]
  const prompt = `${q.q}\n\n${stripHtml(q.a).slice(0, 6000)}

${focusLine}
${styleLine}
Use markdown: short paragraphs, bullet points, and fenced code blocks for code.${ENGLISH_ONLY(lang)}`
  return aiText(prompt, { task: 'explain', signal })
}

export function explainKey(
  q: Question,
  lang: Lang,
  focus: ExplainFocus,
  style: ExplainStyle,
): string {
  return `${q.code}|x|${lang}|${focus}|${style}`
}

/* ------------------------ more like these --------------------------- */

/** D-08: generate questions for the current filter, deduplicated by listing. */
export async function generateQuestions(opts: {
  topic: string
  existing: string[]
  lang: Lang
  count?: number
  signal?: AbortSignal
}): Promise<{ q: string; a: string }[]> {
  const count = opts.count || 8
  const prompt = `Write ${count} new interview questions about "${opts.topic}", at the level of a senior Laravel / full-stack engineer.

These questions already exist, so do NOT repeat them:
${opts.existing.slice(0, 40).map((q) => `- ${q}`).join('\n')}

For each question give a focused answer (3–6 sentences) plus a one-line English sentence the candidate can say in the interview.${ENGLISH_ONLY(opts.lang)}

Reply with JSON only: {"items":[{"q":"...","a":"...","key":"..."}]}`
  const data = await aiJson<{ items?: { q: string; a: string; key?: string }[] }>(prompt, {
    task: 'quick',
    signal: opts.signal,
  })
  return (data.items || []).map((i) => ({ q: i.q, a: i.a }))
}

/* ---------------------------- JD analysis --------------------------- */

/** A-08 offline analysis: no AI, just keyword and seniority detection. */
export function analyseJdOffline(text: string, techs: { slug: string; label: string; keywords: string[] }[]): {
  techs: string[]
  niceTechs: string[]
  seniority: string
} {
  const lower = text.toLowerCase()
  const must: string[] = []
  const nice: string[] = []
  for (const t of techs) {
    const hits = t.keywords.filter((k) => lower.includes(k.replace(/\*$/, '')))
    if (!hits.length) continue
    const strong = hits.some((h) => {
      const re = new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*$/, '')}\\b`, 'i')
      return (
        re.test(text) &&
        new RegExp(`(required|must|strong|essential|proficient|in-depth|expert|solid)\\b[^.]{0,60}${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(
          text,
        )
      )
    })
    if (strong) must.push(t.slug)
    else nice.push(t.slug)
  }
  const years = text.match(/(\d{1,2})\+?\s*(?:-\s*\d{1,2})?\s*years?/i)
  let seniority = 'Mid'
  if (/principal|staff|lead|architect|head of/i.test(text)) seniority = 'Lead'
  else if (/\bsenior\b|\bsr\.?\b|\b8\+|\b7\+|\b5\+.*years/i.test(text)) seniority = 'Senior'
  else if (/\bjunior\b|\bmid\b|\b2\b.*\b4\b.*years/i.test(text)) seniority = 'Mid'
  if (years) {
    const n = Number(years[1])
    if (n >= 8) seniority = 'Lead'
    else if (n >= 5) seniority = 'Senior'
    else if (n >= 2) seniority = 'Mid'
    else seniority = 'Junior'
  }
  return { techs: must, niceTechs: nice, seniority }
}

/** A-08 AI deep prep pack. */
export async function jdPrepPack(
  jd: string,
  profile: Profile,
  lang: Lang,
  signal?: AbortSignal,
): Promise<JdPack> {
  const prompt = `Here is a job description:

${jd.slice(0, 9000)}
${profileBlock(profile)}

Build a prep pack for this candidate.

Reply with JSON only:
{
 "summary": "what this role is really about, 3–4 sentences",
 "rounds": ["each likely interview round and what it covers"],
 "qas": [{"q":"a tailored question","a":"a focused model answer"}],
 "gaps": ["what the candidate should brush up or be ready to defend"],
 "stories": ["STAR stories they should prepare, one line each"],
 "questions": ["questions the candidate should ask them"],
 "pitch": "a 60-second self introduction",
 "redFlags": ["things in the JD that are worth clarifying or pushing back on"]
}
16 tailored questions in qas.${ENGLISH_ONLY(lang)}`
  const data = await aiJson<JdPack>(prompt, { task: 'explain', signal })
  return { ...data, at: Date.now() }
}

/* ---------------------------- mock interview ------------------------ */

/** D-04 / A-09: grade one answer 0–10 with a cross-question follow-up. */
export async function gradeAnswer(
  q: Question,
  answer: string,
  profile: Profile,
  lang: Lang,
  signal?: AbortSignal,
): Promise<MockEval> {
  const prompt = `You are an interviewer at a company hiring a senior Laravel engineer.

QUESTION ASKED
${q.q}

IDEAL ANSWER (what a strong candidate says)
${stripHtml(q.a).slice(0, 5000)}

CANDIDATE'S ANSWER
${answer.slice(0, 6000)}
${profileBlock(profile)}

Grade it honestly. Score 0–10. Be specific: quote what they said when something is missing.
- better: rewrite their answer the way a strong candidate would say it, in ENGLISH, ready to speak.
- follow_up: one cross-question a real interviewer would ask next, in ENGLISH.
- tip: one delivery tip, in ${LANG_LABEL[lang]}.${ENGLISH_ONLY(lang)}

Reply with JSON only:
{"score":0,"verdict":"one line","strengths":["..."],"missing":["..."],"better":"...","follow_up":"...","tip":"..."}`
  const data = await aiJson<MockEval>(prompt, { task: 'grade', signal })
  return {
    score: Math.max(0, Math.min(10, Number(data.score) || 0)),
    verdict: data.verdict || '',
    strengths: data.strengths || [],
    missing: data.missing || [],
    better: data.better || '',
    follow_up: data.follow_up || '',
    tip: data.tip || '',
  }
}

/** The next question in a live interview, adapted to how they answered. */
export async function nextInterviewQuestion(opts: {
  question: Question
  asked: number
  lastEval?: MockEval
  lastAnswer?: string
  lang: Lang
  signal?: AbortSignal
}): Promise<{ say: string; kind: 'follow' | 'new' | 'wrap' }> {
  const prompt = `You are interviewing a candidate for a senior Laravel role.

Question ${opts.asked} so far. The current question was:
${opts.question.q}

${opts.lastAnswer ? `The candidate answered:\n${opts.lastAnswer.slice(0, 4000)}\n\nYour assessment:\nscore ${opts.lastEval?.score}/10, ${opts.lastEval?.verdict || ''}` : 'The candidate has not answered yet.'}

Reply with JSON only:
{"say":"what you say next, in ENGLISH, one or two sentences. If they missed something, ask a specific follow-up. If they answered well, move on but raise the difficulty a little. After 8 questions, wrap up.","kind":"follow|new|wrap"}`
  const data = await aiJson<{ say?: string; kind?: 'follow' | 'new' | 'wrap' }>(prompt, {
    task: 'interview',
    signal: opts.signal,
  })
  return { say: data.say || 'Tell me more about that.', kind: data.kind || 'new' }
}

/** Hiring scorecard at the end of a mock. */
export async function mockScorecard(
  turns: { q: string; me: string; score?: number }[],
  profile: Profile,
  lang: Lang,
  signal?: AbortSignal,
): Promise<Scorecard> {
  const transcript = turns
    .slice(0, 40)
    .map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.me.slice(0, 1500)}`)
    .join('\n\n')
  const prompt = `Here is a mock interview transcript:

${transcript}
${profileBlock(profile)}

Produce a hiring scorecard. Be honest and specific. 0–10 for each.
- verdict: would you hire? one paragraph.
- tip: the single most useful thing to work on before the real interview, in ${LANG_LABEL[lang]}.

Reply with JSON only:
{"overall":0,"technical":0,"communication":0,"confidence":0,"verdict":"...","strengths":["..."],"risks":["..."],"tip":"..."}`
  const data = await aiJson<Scorecard>(prompt, { task: 'grade', signal })
  const clamp = (n: unknown) => Math.max(0, Math.min(10, Number(n) || 0))
  return {
    overall: clamp(data.overall),
    technical: clamp(data.technical),
    communication: clamp(data.communication),
    confidence: clamp(data.confidence),
    verdict: data.verdict || '',
    strengths: data.strengths || [],
    risks: data.risks || [],
    tip: data.tip || '',
  }
}

/* --------------------------- speaking coach ------------------------ */

/** Offline metrics from a transcript — no AI needed. */
export function speechMetrics(text: string, durSec: number, pauses = 0) {
  const t = String(text || '').trim()
  const w = t ? t.split(/\s+/).length : 0
  const minutes = Math.max(durSec / 60, 1 / 60)
  const fillers = (t.match(/\b(um+|uh+|erm+|like|basically|actually|you know)\b/gi) || []).length
  const restarts = (t.match(/\b(i mean|sorry|wait|um)\b/gi) || []).length
  return { words: w, wpm: Math.round(w / minutes), fillers, restarts, longPauses: pauses }
}

/** D-05 / speaking coach: fluency, clarity, structure and pronunciation. */
export async function speakingFeedback(opts: {
  question: string
  transcript: string
  metrics: ReturnType<typeof speechMetrics>
  lang: Lang
  hasAudio: boolean
  signal?: AbortSignal
}): Promise<SpeakingFeedback> {
  const pron = opts.hasAudio
    ? 'Also list words the speech recogniser probably misheard — for a Pakistani or Indian speaker these are usually the trouble spots: th sounds, v/w, s-clusters, -ed endings, and tech words.'
    : 'This was a written answer, so skip pronunciation entirely.'
  const prompt = `The candidate was asked: "${opts.question}"

They answered (${opts.metrics.wpm} words per minute, ${opts.metrics.fillers} filler words, ${opts.metrics.restarts} restarts):
${opts.transcript.slice(0, 6000)}

Give feedback. ${pron}
- fluency, clarity and structure: one honest sentence each, in ${LANG_LABEL[opts.lang]}.
- grammar: the specific fixes, as [wrong → right] pairs.
- better: a better spoken version of the answer, in ENGLISH, ready to say out loud.
- practice: 3 lines to practise out loud.
- tip: one thing to do in the next interview, in ${LANG_LABEL[opts.lang]}.

Reply with JSON only:
{"fluency":"...","clarity":"...","structure":"...","grammar":["..."],"mispronounced":["..."],"better":"...","practice":["..."],"tip":"..."}`
  const data = await aiJson<SpeakingFeedback>(prompt, { task: 'grade', signal: opts.signal })
  if (!opts.hasAudio) data.mispronounced = []
  return data
}

/* ------------------------------- agent ----------------------------- */

/**
 * D-02: an assistant that can look things up in the bank and your progress.
 * Tools run client-side, so the model only reaches what is already on this
 * device — and prompt injection from bank text cannot do anything harmful.
 */
export async function agentTurn(opts: {
  history: { role: 'user' | 'assistant'; content: string }[]
  tools: { name: string; description: string }[]
  context: string
  lang: Lang
  onText?: (chunk: string, full: string) => void
  signal?: AbortSignal
}): Promise<string> {
  const toolList = opts.tools.map((t) => `- ${t.name}: ${t.description}`).join('\n') || '- (none right now)'
  const system = `You are the assistant inside Interview Box, an interview prep app for a senior Laravel developer in Lahore.

You can use these tools by writing a fenced block:
${toolList}

To call one tool, output exactly:
\`\`\`tool
{"tool":"name","args":{...}}
\`\`\`

One tool call per message. After the result comes back you get another turn.

${opts.context}

Write short, direct answers. If the candidate asks about their own progress, use the tools rather than guessing.${ENGLISH_ONLY(opts.lang)}`

  const msgs = [{ role: 'user' as const, content: system }, ...opts.history.slice(-16)]
  return aiText(msgs, { task: 'chat', onText: opts.onText, signal: opts.signal })
}

/** Parse a tool call out of a reply, if the model emitted one. */
export function parseToolCall(text: string): { tool: string; args: any } | null {
  const m = text.match(/```tool\s*([\s\S]*?)```/i)
  if (!m) return null
  try {
    const parsed = JSON.parse(m[1].trim())
    if (parsed && typeof parsed.tool === 'string') return parsed
  } catch {
    /* not a valid call */
  }
  return null
}

/** Strip a tool block out of the text shown to the user. */
export function stripToolCall(text: string): string {
  return text.replace(/```tool\s*[\s\S]*?```/gi, '').trim()
}

/* ------------------------------ CV ↔ JD ---------------------------- */

/** D-06: match a CV against a job description. */
export async function cvMatch(
  cv: string,
  jd: string,
  profile: Profile,
  lang: Lang,
  signal?: AbortSignal,
): Promise<{
  score: number
  match: string
  strongerBullets: string[]
  projectQuestions: string[]
  pitch: string
  gaps: string[]
}> {
  const prompt = `CV / resume:
${cv.slice(0, 9000)}

JOB DESCRIPTION:
${jd.slice(0, 9000)}
${profileBlock(profile)}

Compare them. Be specific and honest — point at the actual lines.
- strongerBullets: CV bullets rewritten to match what this job is asking for.
- projectQuestions: questions this JD will ask about the projects on the CV.
- pitch: a 60-second introduction tuned to this role, in ENGLISH.
- gaps: what to fix or prepare before applying.
Write the explanations in ${LANG_LABEL[lang]}; write the bullets, questions and pitch in ENGLISH.

Reply with JSON only:
{"score":0,"match":"...","strongerBullets":["..."],"projectQuestions":["..."],"pitch":"...","gaps":["..."]}`
  return aiJson(prompt, { task: 'explain', signal })
}

/** D-07: build a STAR story with 30 s and 90 s spoken versions. */
export async function buildStory(opts: {
  competency: string
  notes: string
  lang: Lang
  signal?: AbortSignal
}): Promise<{
  situation: string
  task: string
  action: string
  result: string
  spoken30: string
  spoken90: string
}> {
  const prompt = `Turn these rough notes into a STAR interview story about the competency "${opts.competency}".

Notes: ${opts.notes.slice(0, 4000)}

Make the result specific and measurable. Write it in ENGLISH, the way it would be said out loud.
- spoken30: a 30-second version.
- spoken90: a 90-second version with the technical detail an interviewer would probe.

Reply with JSON only:
{"situation":"...","task":"...","action":"...","result":"...","spoken30":"...","spoken90":"..."}`
  return aiJson(prompt, { task: 'quick', signal: opts.signal })
}

/** D-05: a daily plan from the model's view of what is weak. */
export async function planMyDay(opts: {
  weak: { q: string; tech: string }[]
  due: number
  minutes: number
  lang: Lang
  signal?: AbortSignal
}): Promise<string> {
  const topics = [...new Set(opts.weak.map((w) => w.tech))].join(', ') || 'none yet'
  const prompt = `The candidate has ${opts.weak.length} weak questions and ${opts.due} reviews due today, and has ${opts.minutes} minutes.

Their weak topics: ${topics}

Give a practical plan for today. Be specific about what to do first.${ENGLISH_ONLY(opts.lang)}`
  return aiText(prompt, { task: 'quick', signal: opts.signal })
}

export { AiError }

