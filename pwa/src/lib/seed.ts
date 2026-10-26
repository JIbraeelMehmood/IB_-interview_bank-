import { db, TR_LIMIT } from './db'
import type { Flags, Lang, Level, Question, Source, Translation } from './types'
import { stripHtml } from './text'

export { stripHtml }

/** Raw v7 bank record as extracted from `<script id="bank">`. */
interface RawBankQuestion {
  id: string
  q: string
  a: string
  l: Level
  p: string
  c: string
  f?: string
  t?: string[]
  s?: string
  ex?: string
  tr?: Record<string, { q?: string; a?: string; hook?: string; key?: string }>
}

export interface BankMeta {
  parts: string[]
  chapters: string[]
  techs: { slug: string; label: string; keywords: string[] }[]
  count: number
  builtAt: string
}

const SEED_FLAG = 'bankSeededAt'
/** Bump when the seed logic changes so existing installs re-seed. */
const SEED_VERSION = 3

let cache: { bank: RawBankQuestion[]; meta: BankMeta } | null = null

async function loadBank(): Promise<{ bank: RawBankQuestion[]; meta: BankMeta }> {
  if (cache) return cache
  const [bank, meta] = await Promise.all([
    fetch('/data/bank.json').then((r) => {
      if (!r.ok) throw new Error('bank.json missing — run scripts/extract-v7.mjs')
      return r.json()
    }),
    fetch('/data/meta.json').then((r) => r.json()),
  ])
  cache = { bank, meta }
  return cache
}


/** Merge a question's own tags with keyword matches from BASE_TECHS, as v7 did. */
function techsFor(q: RawBankQuestion, meta: BankMeta): string[] {
  const own = new Set((q.t || []).map((t) => t.toLowerCase()))
  const hay = (q.q + ' ' + stripHtml(q.a) + ' ' + (q.p || '') + ' ' + (q.c || '')).toLowerCase()
  for (const tech of meta.techs) {
    if (own.has(tech.slug)) continue
    for (const kw of tech.keywords) {
      if (!kw) continue
      // v7 used simple substring matching with a trailing * meaning "word prefix".
      if (kw.endsWith('*')) {
        if (hay.includes(kw.slice(0, -1))) {
          own.add(tech.slug)
          break
        }
      } else if (hay.includes(kw)) {
        own.add(tech.slug)
        break
      }
    }
  }
  return [...own]
}

function toQuestion(raw: RawBankQuestion, meta: BankMeta): Question {
  const plainA = stripHtml(raw.a)
  return {
    code: raw.id,
    q: raw.q,
    a: raw.a,
    l: raw.l,
    p: raw.p,
    c: raw.c,
    f: (raw.f || '') as Flags | '',
    t: techsFor(raw, meta),
    s: (raw.s || 'b') as Source,
    ex: raw.ex,
    tr: raw.tr,
    search: (raw.q + ' ' + plainA + ' ' + raw.p + ' ' + raw.c).toLowerCase(),
    updatedAt: Date.now(),
  }
}

/** Turn the 20 hand-written v7 translations into Translation rows. */
function builtinTranslations(rows: Question[]): Translation[] {
  const out: Translation[] = []
  const now = Date.now()
  for (const q of rows) {
    if (!q.tr) continue
    for (const [lang, t] of Object.entries(q.tr)) {
      if (lang !== 'ur' && lang !== 'ru') continue
      out.push({
        id: `${q.code}|${lang}`,
        code: q.code,
        lang: lang as Lang,
        q: t.q,
        a: t.a,
        key: t.key,
        hook: t.hook,
        engine: 'human',
        rules: 3,
        builtin: 1,
        t: now,
        updatedAt: now,
      })
    }
  }
  return out
}

/** Idempotent: safe to call on every app start. */
export async function ensureSeeded(force = false): Promise<{ count: number; seeded: boolean }> {
  const { bank, meta } = await loadBank()
  const marker = `${SEED_VERSION}`
  const prev = await db.kv.get(SEED_FLAG)
  if (!force && prev && prev.value === marker && (await db.questions.count()) > 0) {
    return { count: await db.questions.count(), seeded: false }
  }

  const rows = bank.map((raw) => toQuestion(raw, meta))
  await db.transaction('rw', db.questions, db.translations, db.kv, async () => {
    // Bulk put in chunks so a phone does not stall on one 1,950-row write.
    for (let i = 0; i < rows.length; i += 250) {
      await db.questions.bulkPut(rows.slice(i, i + 250))
    }
    const bt = builtinTranslations(rows)
    if (bt.length) await db.translations.bulkPut(bt)
    await db.kv.put({ key: SEED_FLAG, value: marker })
  })

  return { count: rows.length, seeded: true }
}

/** Prune the oldest cached translations, mirroring the v7 rule. */
export async function pruneTranslations(limit = TR_LIMIT): Promise<number> {
  const count = await db.translations.count()
  if (count <= limit) return 0
  const excess = count - limit
  const old = await db.translations.orderBy('t').limit(excess).primaryKeys()
  await db.translations.bulkDelete(old)
  return old.length
}

export async function bankMeta(): Promise<BankMeta> {
  return (await loadBank()).meta
}
