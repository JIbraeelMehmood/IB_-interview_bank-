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

/* ═══════════════════════════════════════════════════════════════════════
 * INTELLIGENCE LAYER — ported from v7 Phase 1 patch + Intervity integration
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. MistakeClassifier ───────────────────────────────────────────── */

export type MistakeTier = 'CONCEPTUAL' | 'L4_CEILING' | 'VAGUE' | 'STRUCTURAL'

export interface MistakeResult {
  cat: MistakeTier
  color: string
  icon: string
  critique: string
  golden: string
  model: string
}

/**
 * 4-tier answer diagnosis (ported from Intervity MistakeClassifier.ts via v7 Phase 1 patch).
 * Returns null when the answer is solid.
 */
export function classifyMistake(answer: string): MistakeResult | null {
  if (!answer || answer.length < 10) return null
  const t = answer.toLowerCase()

  // Tier 1: Conceptual / Factual error
  if (
    t.includes('direct on gpu') ||
    t.includes('dom element') ||
    t.includes('threads without locks') ||
    t.includes('javascript is synchronous so') ||
    t.includes('single threaded so no concurrency')
  ) {
    return {
      cat: 'CONCEPTUAL',
      color: '#B3261E',
      icon: '🔴',
      critique: 'Fundamental misunderstanding of core architecture and runtime memory models.',
      golden: 'Ground explanations in memory ownership and native runtime thread boundaries.',
      model: 'Always ground explanations in memory ownership and native runtime thread boundaries.',
    }
  }

  // Tier 2: L4 Ceiling — technically correct but missing senior-level failure modes
  if (
    (t.includes('redis') && !t.includes('stampede') && !t.includes('eviction') && !t.includes('lock') && !t.includes('cache')) ||
    (t.includes('kafka') && !t.includes('partition') && !t.includes('offset') && !t.includes('consumer group')) ||
    (t.includes('queue') && !t.includes('retry') && !t.includes('dead letter') && !t.includes('idempoten'))
  ) {
    return {
      cat: 'L4_CEILING',
      color: '#E65100',
      icon: '🟠',
      critique: 'Technically correct happy-path, but missing high-throughput failure modes (cache stampede, eviction, dead-letter queues).',
      golden: 'Add: cache stampede mitigation, eviction strategies, write storm handling, consumer group rebalance, offset commit semantics.',
      model: 'When discussing caching or messaging, explain invalidation, concurrency locks, eviction, and failure recovery.',
    }
  }

  // Tier 3: Vague hand-waving
  if (
    answer.length < 80 ||
    /it handled everything|we used .* to make it fast|basically it just works|it was very efficient/i.test(t) ||
    (
      !t.includes('ms') && !t.includes('%') && !t.includes('per second') &&
      !t.includes('qps') && !t.includes('rps') && !t.includes('users') &&
      !t.includes('reduced') && !t.includes('improved') && !t.includes('latency') &&
      answer.length < 150
    )
  ) {
    return {
      cat: 'VAGUE',
      color: '#F4D83D',
      icon: '🟡',
      critique: 'Superficial buzzword usage without explaining underlying mechanics, partition keys, or failure recovery.',
      golden: 'Add: throughput numbers, partition strategy, batch sizes, specific metrics. "We partitioned by merchant ID, kept lag under 200ms."',
      model: 'Never state what technology you used without quantifying throughput, partition strategies, and failure modes.',
    }
  }

  // Tier 4: Structural — missing personal ownership
  if (
    !t.includes(' i ') &&
    !t.includes('i designed') && !t.includes('i implemented') &&
    !t.includes('i built') && !t.includes('i led') && !t.includes('i solved') &&
    !t.includes('i refactored') && !t.includes('i chose')
  ) {
    return {
      cat: 'STRUCTURAL',
      color: '#1565C0',
      icon: '🟣',
      critique: 'Answer lacks quantitative metrics and personal ownership ("I" vs "We"), failing STAR expectations for senior roles.',
      golden: 'Use "I designed/implemented" + p99 latency, % improvement, cost savings. "I reduced query time by 74% and saved $8K/month."',
      model: 'Always deliver BLUF (Bottom Line Up Front) and close with measurable business impact using first-person ownership.',
    }
  }

  return null // answer is solid
}

/* ── 2. STAR Evaluator ──────────────────────────────────────────────── */

export interface StarScore {
  situation: number   // max 15
  task: number        // max 15
  action: number      // max 50
  result: number      // max 20
  total: number       // /100
  grade: 'Excellent' | 'Good' | 'Needs work' | 'Incomplete'
  feedback: string[]
  isBehavioral: boolean
}

/**
 * STAR method evaluator — Situation(15%) + Task(15%) + Action(50%) + Result(20%).
 * Ported from Intervity StarMethodEvaluator.ts via v7 Phase 1 patch.
 */
export function starEval(answer: string): StarScore {
  const empty: StarScore = { situation: 0, task: 0, action: 0, result: 0, total: 0, grade: 'Incomplete', feedback: [], isBehavioral: false }
  if (!answer || answer.length < 10) return empty
  const t = answer.toLowerCase()
  const fb: string[] = []

  // Situation: context setting
  const hasSit = t.includes('when') || t.includes('at ') || t.includes('project') ||
    t.includes('team') || t.includes('while working') || t.includes('our ')
  const sitS = hasSit ? 15 : 5
  if (!hasSit) fb.push('Clarify the business context or project scope early in your response.')

  // Task: problem definition
  const hasTask =
    t.includes('goal') || t.includes('needed to') || t.includes('problem') ||
    t.includes('sla') || t.includes('bottleneck') || t.includes('challenge') ||
    t.includes('issue') || t.includes('faced') || t.includes('deadline')
  const taskS = hasTask ? 15 : 5
  if (!hasTask) fb.push('Explicitly state the SLA, deadline, or engineering hurdle.')

  // Action: individual contribution — worth 50%, most important
  const actCount = (t.match(/\b(i implemented|i designed|i built|i refactored|i profiled|i debugged|i led|i chose|i solved|i resolved|i migrated|i optimized|i created|i developed|i architected)\b/g) || []).length
  const actS = actCount >= 2 ? 50 : actCount >= 1 ? 35 : 20
  if (actCount === 0) fb.push('Take direct ownership: use "I designed/implemented" instead of "We".')

  // Result: measurable metrics
  const hasRes =
    /\b(\d+%|\d+\s*ms|\d+\s*seconds|\$\d+|\d+\s*k|\d+\s*qps|\d+\s*users|\d+\s*rps)\b/i.test(t) ||
    t.includes('reduced') || t.includes('increased') || t.includes('improved') ||
    t.includes('saved') || t.includes('decreased')
  const resS = hasRes ? 20 : 5
  if (!hasRes) fb.push('Quantify the outcome with concrete metrics (latency reduction, cost savings, RPS, user impact).')

  const total = sitS + taskS + actS + resS
  const grade = total >= 85 ? 'Excellent' : total >= 65 ? 'Good' : total >= 45 ? 'Needs work' : 'Incomplete'

  return { situation: sitS, task: taskS, action: actS, result: resS, total, grade, feedback: fb, isBehavioral: true }
}

/* ── 3. Prosody Analyzer ────────────────────────────────────────────── */

export interface ProsodyResult {
  wpm: number
  words: number
  fillerCount: number
  fillerDensity: number
  pacingScore: number   // 0–100
  rating: 'excellent' | 'good' | 'needs work'
  advice: string
  fillers: string[]
}

/**
 * Enhanced prosody analyzer with South Asian English verbal crutches.
 * Replaces the basic speechMetrics() for graded feedback.
 * Ported from Intervity SoftSkillsProsodyAnalyzer.ts via v7 Phase 1 patch.
 */
export function prosodyAnalyze(text: string, durationSec: number, turnLatencyMs = 0): ProsodyResult {
  const t = String(text || '').trim()
  const wordCount = t ? t.split(/\s+/).length : 0
  const duration = durationSec > 0 ? durationSec : 1
  const wpm = wordCount > 0 ? Math.round((wordCount / duration) * 60) : 0

  // Universal fillers + South Asian English crutches (na, means, ya, correct?)
  const FILLER_RE = /\b(um+|uh+|er+|ah+|hmm+|basically|actually|sort of|kind of|i mean|ya|na|means|you know|like|literally|right|okay|so|correct\?)\b/gi
  const matches = t.match(FILLER_RE) || []
  const fillerCount = matches.length
  const fillerDensity = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) : 0

  // Pacing score: 120–155 WPM sweet spot
  let pacingScore = 100
  if (wpm > 0) {
    if (wpm < 100) pacingScore -= (100 - wpm) * 0.8
    else if (wpm > 165) pacingScore -= (wpm - 165) * 0.7
  }
  if (fillerDensity > 1.5) pacingScore -= (fillerDensity - 1.5) * 8
  if (turnLatencyMs > 4500) pacingScore -= (turnLatencyMs - 4500) / 200
  pacingScore = Math.min(100, Math.max(0, Math.round(pacingScore)))

  const rating: ProsodyResult['rating'] =
    wpm >= 120 && wpm <= 160 && fillerDensity < 5 ? 'excellent'
    : wpm >= 100 && fillerDensity < 10 ? 'good'
    : 'needs work'

  const advice =
    wpm < 100 ? 'Speak faster — aim for 120–160 WPM'
    : wpm > 180 ? 'Slow down — clarity over speed'
    : fillerDensity > 10 ? 'Reduce fillers (um, uh, like) — pause instead'
    : 'Good pacing!'

  return { wpm, words: wordCount, fillerCount, fillerDensity, pacingScore, rating, advice, fillers: matches.map((m) => m.toLowerCase()) }
}

/* ── 4. Vocabulary Diversity ────────────────────────────────────────── */

export interface VocabResult {
  uniqueWords: number
  totalWords: number
  uniqueRatio: number
  diversity: 'Rich vocabulary' | 'Average vocabulary' | 'Limited vocabulary'
  topWords: { word: string; count: number }[]
  fillerWords: string[]
}

export function vocabDiversity(text: string): VocabResult {
  const words = String(text || '').toLowerCase().match(/[a-z]+/g) || []
  const counts: Record<string, number> = {}
  for (const w of words) counts[w] = (counts[w] || 0) + 1
  const total = String(text || '').match(/\S+/g)?.length || 0
  const unique = Object.keys(counts)
  const FILLERS = new Set(['um', 'uh', 'like', 'basically', 'actually', 'you', 'know', 'so', 'right', 'okay', 'hmm', 'err', 'kind', 'sort', 'of'])
  const fillerWords = unique.filter((w) => FILLERS.has(w))
  const topWords = unique
    .map((w) => ({ word: w, count: counts[w] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const uniqueRatio = total ? Math.round(unique.length / total * 100) : 0
  return {
    uniqueWords: unique.length,
    totalWords: total,
    uniqueRatio,
    diversity: unique.length > 40 ? 'Rich vocabulary' : unique.length > 20 ? 'Average vocabulary' : 'Limited vocabulary',
    topWords,
    fillerWords,
  }
}

/* ── 5. Pakistani Interviewer Persona ───────────────────────────────── */

/**
 * Pakistani interviewer system prompt.
 * Ported from Intervity SystemPrompts.ts + v7 Phase 1 patch.
 */
export function pakistaniInterviewerPrompt(
  role = 'Senior Software Engineer',
  company = 'a leading Pakistani tech company',
  resume = '',
): string {
  return `You are a Senior Technical Interviewer at ${company} in Lahore/Karachi/Islamabad conducting a realistic mock interview for: ${role}.

Candidate Resume:
"""
${resume.slice(0, 3000)}
"""

PAKISTANI TECH CONTEXT:
- Understand: BS-CS/BCS/MIT degrees, CGPA (4.0 scale), PITB/PASHA/P@SHA ecosystem
- Know: IT services (Techlogix, NetSol, Systems Ltd, Arbisoft, Devsinc) vs product (Airlift, Bazaar, Tajir, Dastgyr)
- Terms: "done from" (graduated), "outstation", "CTC in PKR", NUST/LUMS/FAST/UIT colleges
- Pakistani English idioms: "revert back" (reply), "prepone" (schedule earlier), "doubts" (questions), "batch pass out" (graduating class). Do not critique these colloquialisms.

STRICT INTERVIEWING RULES:
1. Ask only ONE question at a time. Max 3 sentences per response.
2. No markdown, bullet points, or code blocks — response will be spoken aloud via TTS.
3. Deep-dive into specific resume claims (architecture choices, scalability, code).
4. If the candidate gives a vague answer, probe deeper ("Could you share the specific latency metrics?").
5. Acknowledge the candidate's previous response briefly before asking your next question.`
}

/* ── 6. Company Style Profiles ──────────────────────────────────────── */

export interface CompanyProfile {
  name: string
  focus: string
  time: string
  style: string
  tips: string
}

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  google:    { name: 'Google',    focus: 'System design + coding clarity + trade-off reasoning + Googliness', time: '45+45 min', style: 'collaborative', tips: 'Clarify requirements first. Discuss trade-offs. Show how you handle ambiguity.' },
  amazon:    { name: 'Amazon',    focus: 'Leadership Principles + Dive Deep + measurable impact + Customer Obsession', time: '60 min', style: 'LP-first', tips: 'Structure every answer around a Leadership Principle. Use "I" not "We". Quantify everything.' },
  meta:      { name: 'Meta',      focus: 'Coding speed + scale problems + data-driven decisions', time: '45 min', style: 'fast-paced', tips: 'Move fast. Show impact at scale. Be direct about trade-offs.' },
  microsoft: { name: 'Microsoft', focus: 'Problem-solving + collaboration + growth mindset', time: '45 min', style: 'conversational', tips: 'Show how you learn from failure. Demonstrate collaboration across teams.' },
  bytedance: { name: 'ByteDance', focus: 'Algorithms + business impact + data scale', time: '45 min', style: 'intensive', tips: 'Practice LeetCode Medium+. Billion-user scale thinking required.' },
  pitb:      { name: 'PITB / Pakistan Railways', focus: 'Laravel/PHP + delivery track record + govt digital systems + practical coding', time: '30 min', style: 'practical', tips: 'Show working code. Talk about government/digital transformation projects. Be practical.' },
  nadra:     { name: 'NADRA',     focus: 'Database systems + security + national-scale systems + biometrics', time: '30 min', style: 'technical', tips: 'Emphasize data security, national-scale architecture, database optimization.' },
  arbisoft:  { name: 'Arbisoft',  focus: 'Full-stack + agile + client communication + problem-solving', time: '45 min', style: 'cultural-fit', tips: 'Show cultural fit. Demonstrate full-stack capability. Be ready for pair programming.' },
  netsol:    { name: 'NetSol',    focus: 'Enterprise software + ERP + team leadership + financial domain', time: '45 min', style: 'formal', tips: 'Show enterprise experience. Discuss financial domain knowledge and large-team management.' },
  systems:   { name: 'Systems Limited', focus: 'SAP/ERP + large team + enterprise delivery + offshore model', time: '30 min', style: 'experienced', tips: 'Show enterprise delivery experience. Discuss offshore coordination.' },
  techlogix: { name: 'Techlogix', focus: 'Architecture + client-facing + digital transformation', time: '45 min', style: 'consultative', tips: 'Show consulting mindset. Architecture decisions with client context.' },
  devsinc:   { name: 'Devsinc',   focus: 'Full-stack + quick delivery + startup agility', time: '30 min', style: 'fast-paced', tips: 'Show speed and adaptability. Startup-style quick delivery.' },
  tencent:   { name: 'Tencent',   focus: 'Gaming + social + performance optimization', time: '45 min', style: 'technical-deep', tips: 'Go deep on performance. High-concurrency systems experience.' },
}

export function matchCompanyProfile(name: string): CompanyProfile | null {
  const k = name.toLowerCase()
  for (const [id, p] of Object.entries(COMPANY_PROFILES)) {
    if (k.includes(id) || k.includes(p.name.toLowerCase())) return p
  }
  return null
}

/* ── 7. Coaching Strategy Dispatcher ───────────────────────────────── */

const COACHING_STRATEGIES: Record<string, string> = {
  behavioral:    'Use STAR method. Probe for Situation, Task, Action, Result. Ask for metrics.',
  system_design: 'Ask to clarify requirements first. Probe for scale estimation and trade-offs.',
  debugging:     'Ask how they approached the problem, what they ruled out, and how they confirmed the fix.',
  code_review:   'Ask why they made specific choices, what they would change now, and what the trade-offs were.',
  architecture:  'Ask about failure modes, scaling limits, and what they would do differently at 10× load.',
  database:      'Ask about indexing strategy, query optimization, transaction isolation, and replication.',
  security:      'Ask about specific attack vectors, mitigation approach, and what could still go wrong.',
  leadership:    'Ask about conflict resolution, how they brought a team member up to speed, and metrics they tracked.',
  default:       'Probe for depth. Ask "Why?", "What would break?", and "What would you do differently now?"',
}

export function coachStrategy(tags: string[], questionText: string): string {
  const q = questionText.toLowerCase()
  const t = tags.join(' ').toLowerCase()
  if (/tell me about|describe a time|example of|when did you/i.test(q)) return COACHING_STRATEGIES.behavioral
  if (/design a|design an|system design|architect/i.test(q)) return COACHING_STRATEGIES.system_design
  if (t.includes('sql') || t.includes('database') || t.includes('postgres') || t.includes('mysql')) return COACHING_STRATEGIES.database
  if (/debug|fix|error|exception|crash|memory leak/i.test(q)) return COACHING_STRATEGIES.debugging
  if (/security|xss|csrf|injection|auth|jwt|owasp/i.test(q)) return COACHING_STRATEGIES.security
  if (/lead|team|mentor|manage|conflict/i.test(q)) return COACHING_STRATEGIES.leadership
  if (/review|refactor|improve|clean/i.test(q)) return COACHING_STRATEGIES.code_review
  if (/architect|pattern|solid|microservice|monolith/i.test(q)) return COACHING_STRATEGIES.architecture
  return COACHING_STRATEGIES.default
}

/* ── 8. Reference Answer (cache-first, AI-generated) ───────────────── */

import { db } from './db'

/**
 * Get a model answer for a question — checks Dexie cache first, generates via AI if not cached.
 * mode 'compare' gives a good answer and a weak answer side-by-side.
 */
export async function getRefAnswer(q: Question, mode: 'single' | 'compare' = 'single'): Promise<string> {
  const cacheKey = `ref:${q.code}:${mode}`
  const cached = await db.explains.get(cacheKey)
  if (cached) return cached.markdown

  const prompt =
    mode === 'compare'
      ? `Give a HIGH-SCORE model answer then a LOW-SCORE answer for this interview question.
Label them "✅ Strong Answer:" and "❌ Weak Answer:". Explain what makes each good or bad in 2-3 bullets.
Question: ${q.q}`
      : `You are a senior interviewer. Give a concise, well-structured model answer for this question.
Use 3-5 bullet points. Be direct and specific. First person.
Question: ${q.q}
Context (existing answer summary): ${stripHtml(q.a).slice(0, 500)}`

  const text = await aiText(prompt, { task: 'quick' })
  await db.explains.put({
    id: cacheKey,
    code: q.code,
    lang: 'en',
    focus: 'concept',
    style: 'interview',
    markdown: text,
    updatedAt: Date.now(),
  })
  return text
}

/* ── 9. Anki flashcard export (localhost only — graceful failure on Vercel/mobile) ── */

/**
 * Export a question to Anki via AnkiConnect on localhost:6006.
 * Silently fails on Vercel/mobile — only works on desktop with Anki running.
 */
export async function ankiAdd(front: string, back: string, deck = 'Interview Box'): Promise<void> {
  const res = await fetch('http://localhost:6006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'addNote',
      version: 6,
      params: {
        note: {
          deckName: deck,
          modelName: 'Basic',
          fields: { Front: front, Back: back },
          options: { allowDuplicate: false },
        },
      },
    }),
  })
  if (!res.ok) throw new Error('Anki returned ' + res.status)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
}

/** True when Anki export is available (localhost only). */
export function ankiAvailable(): boolean {
  return (
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  )
}
