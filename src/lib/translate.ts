/** Translation service.
 *
 *  Order of attempts (this is the v7 C-01 rule — never a dead end):
 *    1. A cached translation.
 *    2. The AI (server or the user's own key), with the v7 register rules.
 *    3. Free machine translation (MyMemory), with tech terms protected.
 *    4. A translation pack already imported.
 *    5. A one-tap setup card.
 *
 *  Whatever comes back is run through `modern()` so even old saved text
 *  improves on display (C-10).
 */

import { db, TR_LIMIT } from './db'
import { aiJson, AiError, aiText } from './ai'
import { RULES_VERSION, loadPrompts, modern, protectObject, restoreObject, ruNorm } from './lang'
import type { Lang, Question, Translation } from './types'
import { splitText, stripHtml } from './text'

export const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  ur: 'Urdu (اردو)',
  ru: 'Roman Urdu',
  hi: 'Hindi (हिंदी)',
}

/** The first line a translation must start with, per v7. */
const HEAD: Record<string, string> = {
  ru: '**Asal baat:**',
  ur: '**اصل بات:**',
  hi: '**मूल बात:**',
}

const EXAMPLE_LINE: Record<string, string> = { ru: 'Misaal', ur: 'مثال', hi: 'उदाहरण' }

/** Build the translation prompt, carrying the v7 style rules verbatim. */
async function buildPrompt(q: Question, lang: Lang): Promise<string> {
  const { trStyle, hiStyle, ruSpell } = await loadPrompts()
  const rules = lang === 'hi' ? hiStyle : trStyle
  const spelling = lang === 'ru' ? `\n\n${ruSpell}` : ''
  const langNote =
    lang === 'hi'
      ? 'Use simple everyday spoken Hindi mixed with English (Hinglish), as developers actually speak it.'
      : lang === 'ur'
        ? 'Use natural Pakistani Urdu mixed with English, as developers actually speak it.'
        : 'Use Roman Urdu the way it is written in Pakistani chat, one consistent spelling.'
  return `You are translating one interview question and its answer for a senior Laravel developer in Lahore.

${rules}${spelling}

Rules for this job:
- Keep these in English exactly: technology names, product names, SQL keywords, code, commands, file names, and English words the developer would say in English (queue, deploy, cache, job, middleware, index, branch, token).
- ${langNote}
- Start the answer with exactly this line: ${HEAD[lang]}
- Then 2–4 short bullets, then one worked example on a line starting with "${EXAMPLE_LINE[lang]}".
- Under 170 words in total.
- Also give a one-sentence English line the candidate can actually say in the interview (key_en), and a short memory hook in ${lang === 'ru' ? 'Roman Urdu' : lang === 'ur' ? 'Urdu' : 'Hindi'} (hook).
- Add spoken versions written for a voice: say_q (the question, tech words written in the ${lang === 'hi' ? 'Devanagari' : lang === 'ur' ? 'Urdu' : 'Latin'} script the way they sound), say_a, say_hook. No code, short sentences, abbreviations spelled out.
- Before you answer, check: are all the facts from the English answer still there? Is any tech word translated that should stay English? Does it read like speech, not a textbook?

Reply with JSON only:
{"q":"...","a":"...","key_en":"...","hook":"...","say_q":"...","say_a":"...","say_hook":"..."}

QUESTION: ${q.q}

ENGLISH ANSWER: ${stripHtml(q.a).slice(0, 6000)}`
}

interface TrPayload {
  q?: string
  a?: string
  key_en?: string
  key?: string
  hook?: string
  say_q?: string
  sayq?: string
  say_a?: string
  say?: string
  say_hook?: string
  sayhook?: string
}

function toEntry(code: string, lang: Lang, p: TrPayload, engine: string): Translation {
  const now = Date.now()
  return {
    id: `${code}|${lang}`,
    code,
    lang,
    q: p.q,
    a: p.a,
    key: p.key_en || p.key,
    hook: p.hook,
    sayq: p.say_q || p.sayq,
    say: p.say_a || p.say,
    sayhook: p.say_hook || p.sayhook,
    ss: lang === 'ur' ? 'ur' : lang === 'hi' ? 'hi' : undefined,
    engine,
    rules: RULES_VERSION,
    t: now,
    updatedAt: now,
  }
}

/** Ask the AI for one question's translation. */
async function translateOne(q: Question, lang: Lang, signal?: AbortSignal): Promise<Translation> {
  const prompt = await buildPrompt(q, lang)
  const payload = await aiJson<TrPayload>(prompt, { task: 'translate', signal })
  const entry = toEntry(q.code, lang, payload, 'llm')
  if (!entry.a && !entry.q) throw new AiError('empty', 'The model returned an empty translation.')
  // Post-edit into the modern register.
  entry.a = await modern(ruNorm(entry.a || ''), lang)
  entry.q = await modern(entry.q || '', lang)
  entry.hook = await modern(entry.hook || '', lang)
  return entry
}

/** Free machine translation, used when no AI is connected. */
async function machineTranslate(
  text: string,
  lang: Lang,
  map: Map<string, string>,
): Promise<string> {
  const to = lang === 'ur' ? 'ur' : lang === 'hi' ? 'hi' : 'en'
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 4500))}&langpair=en|${to}`,
  )
  if (!res.ok) throw new AiError('mt_down', 'The free translator is not answering.')
  const data = await res.json()
  const out = data?.responseData?.translatedText
  if (!out) throw new AiError('mt_empty', 'The free translator returned nothing.')
  return restoreObject({ text: out }, map).text
}

async function machineOne(q: Question, lang: Lang): Promise<Translation> {
  const plain = stripHtml(q.a).slice(0, 4000)
  const { map } = await protectObject({ a: plain })
  const a = await machineTranslate(plain, lang, map)
  const entry = toEntry(q.code, lang, { a, q: q.q }, 'MyMemory')
  entry.mt = 'Google'
  return entry
}

/** Cached translation, improved by the modern lexicon on the way out. */
export async function getTranslation(code: string, lang: Lang): Promise<Translation | null> {
  if (lang === 'en') return null
  const row = await db.translations.get(`${code}|${lang}`)
  if (!row) return null
  // Touch for pruning, and modernise old text without re-translating (C-10).
  void db.translations.update(row.id, { t: Date.now() }).catch(() => {})
  if (row.rules !== RULES_VERSION && !row.mt) {
    const fresh: Translation = {
      ...row,
      a: await modern(row.a || '', lang),
      q: await modern(row.q || '', lang),
      hook: await modern(row.hook || '', lang),
      rules: RULES_VERSION,
    }
    void db.translations.put(fresh).catch(() => {})
    return fresh
  }
  return row
}

export type TrSource = 'cache' | 'builtin' | 'ai' | 'machine'

export interface TrResult {
  entry: Translation | null
  source: TrSource
  /** Set when nothing worked, so the UI can show the setup card. */
  needsSetup?: boolean
  error?: string
}

/** Get a translation, translating on demand if needed. */
export async function getOrTranslate(
  q: Question,
  lang: Lang,
  opts: { prefer?: 'ai' | 'auto'; signal?: AbortSignal } = {},
): Promise<TrResult> {
  if (lang === 'en') return { entry: null, source: 'cache' }

  const cached = await getTranslation(q.code, lang)
  if (cached && (opts.prefer !== 'ai' || cached.builtin)) {
    return { entry: cached, source: cached.builtin ? 'builtin' : 'cache' }
  }

  // 1. AI
  try {
    const entry = await translateOne(q, lang, opts.signal)
    await saveTranslation(entry)
    return { entry, source: 'ai' }
  } catch (e) {
    if ((e as AiError).code === 'rate_limited' && opts.prefer === 'ai') throw e
  }

  // 2. Free machine translation, so the tab is never a dead end (C-01).
  try {
    const entry = await machineOne(q, lang)
    await saveTranslation(entry)
    return { entry, source: 'machine' }
  } catch (e) {
    if ((e as AiError).code === 'rate_limited' && opts.prefer === 'ai') throw e
  }

  // 3. Nothing — the caller shows a setup card.
  return { entry: null, source: 'cache', needsSetup: true, error: 'No translation available yet.' }
}

export async function saveTranslation(entry: Translation): Promise<void> {
  await db.translations.put(entry)
  void pruneIfNeeded()
}

/**
 * Ask for the spoken version of an existing translation.
 * The prompt forces nukta letters in Devanagari so q/kh/gh/z/f sound Urdu.
 */
export async function spokenText(code: string, lang: Lang): Promise<Partial<Translation>> {
  const t = await db.translations.get(`${code}|${lang}`)
  if (!t) return {}
  if (t.sayq && t.say) return t
  const script = lang === 'ur' ? 'Urdu' : 'Devanagari'
  const nukta =
    lang === 'hi'
      ? ' If the text is Urdu, keep the nukta letters (क़ ख़ گ़ ज़ फ़) so they do not sound like plain Hindi.'
      : ''
  const prompt = `Rewrite these three pieces as spoken text for a text-to-speech voice.
- Use the ${script} script for the Urdu/Hindi words.
- Keep technology names in the script that makes them sound right.
- Short sentences. Spell out abbreviations letter by letter. No code, no symbols, no markdown.
- say_q is the question, say_a is the explanation, say_hook is the memory hook.${nukta}

Q: ${t.q || ''}
A: ${t.a || ''}
HOOK: ${t.hook || ''}

Reply with JSON only: {"say_q":"...","say_a":"...","say_hook":"..."}`
  try {
    const p = await aiJson<{ say_q?: string; say_a?: string; say_hook?: string }>(prompt, {
      task: 'translate',
    })
    return { sayq: p.say_q, say: p.say_a, sayhook: p.say_hook, ss: lang === 'hi' ? 'hi' : 'ur' }
  } catch {
    // Fall back to the display text — the dictionary pass still helps.
    return { sayq: t.q, say: t.a, sayhook: t.hook, ss: lang === 'hi' ? 'hi' : 'ur' }
  }
}

/**
 * Translate many questions, two per AI call, for the "Prepare offline" queue.
 * Returns the number of entries written.
 */
export async function translateBatch(
  questions: Question[],
  lang: Lang,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  let written = 0
  for (let i = 0; i < questions.length; i += 2) {
    if (signal?.aborted) break
    const pair = questions.slice(i, i + 2)
    try {
      const { trStyle, hiStyle, ruSpell } = await loadPrompts()
      const rules = lang === 'hi' ? hiStyle : trStyle
      const spelling = lang === 'ru' ? `\n\n${ruSpell}` : ''
      const lines = pair
        .map((q) => `ID: ${q.code}\nQUESTION: ${q.q}\nENGLISH ANSWER: ${stripHtml(q.a).slice(0, 3000)}`)
        .join('\n\n---\n\n')
      const prompt = `${rules}${spelling}

Translate each of these ${pair.length} question(s) into ${LANG_LABEL[lang]}. Start each answer with ${HEAD[lang]}, then 2–4 bullets and one ${EXAMPLE_LINE[lang]} example, under 170 words. Keep tech names in English. Give an English key line and a memory hook. Keep the same ID.

${lines}

Reply with JSON only, an array of objects:
[{"id":"...","q":"...","a":"...","key_en":"...","hook":"...","say_q":"...","say_a":"...","say_hook":"..."}]`
      const arr = await aiJson<TrPayload[]>(prompt, { task: 'translate', signal })
      for (const p of Array.isArray(arr) ? arr : []) {
        const src = pair.find((q) => q.code === (p as any).id)
        if (!src) continue
        const entry = toEntry(src.code, lang, p, 'llm')
        entry.a = await modern(ruNorm(entry.a || ''), lang)
        entry.q = await modern(entry.q || '', lang)
        entry.hook = await modern(entry.hook || '', lang)
        await saveTranslation(entry)
        written++
      }
    } catch {
      /* one failed pair should not stop the queue */
    }
    onProgress?.(Math.min(i + 2, questions.length), questions.length)
  }
  return written
}

/** Summarise a long transcript with the model, byte-safely. */
export async function summarise(text: string, lang: Lang): Promise<string> {
  const parts = splitText(text, 30 * 1024)
  let out = ''
  for (const part of parts) {
    try {
      out += await aiText(
        `Summarise this part of a technical interview video transcript. Keep every technical fact, command and code snippet. Bullet points. Write your summary in ${LANG_LABEL[lang]}. Transcript part:\n\n${part}`,
        { task: 'quick' },
      )
      out += '\n\n'
    } catch {
      /* keep the parts that worked */
    }
  }
  return out.trim()
}


async function pruneIfNeeded() {
  const count = await db.translations.count()
  if (count <= TR_LIMIT) return
  const excess = count - TR_LIMIT
  const old = await db.translations.orderBy('t').limit(excess).primaryKeys()
  await db.translations.bulkDelete(old)
}

