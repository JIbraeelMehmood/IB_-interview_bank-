import { db, TR_LIMIT } from './db'
import type { ExpYears, Flags, Lang, Level, Question, Source, Translation } from './types'
import { stripHtml } from './text'

export { stripHtml }

/** Raw v7 bank record as extracted from `<script id="bank">`. */
interface RawBankQuestion {
  id?: string
  code?: string
  q: string
  a: string
  l: Level
  p: string
  c: string
  f?: string
  t?: string[]
  s?: string
  ex?: string
  /** Optional curator-assigned experience band; takes precedence over heuristics. */
  expYears?: number
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
const SEED_VERSION = 7

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


/**
 * Normalize legacy question-bank tags into the canonical technology taxonomy
 * from meta.json. The metadata is the source of truth; this is not a framework
 * allow-list.
 */
function normalizeTechText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function canonicalTechSlug(value: string, meta: BankMeta): string {
  const normalized = normalizeTechText(value)
  const aliases: Record<string, string> = {
    deployment: 'cicd',
    javascript: 'js',
  }
  const alias = aliases[normalized]
  if (alias && meta.techs.some((t) => t.slug === alias)) return alias

  const exact = meta.techs.find(
    (t) => normalizeTechText(t.slug) === normalized || normalizeTechText(t.label) === normalized,
  )
  if (exact) return exact.slug

  const keywordMatches = meta.techs.filter((t) =>
    t.keywords.some((keyword) => normalizeTechText(keyword.replace(/\*$/, '')) === normalized),
  )
  return keywordMatches.length === 1 ? keywordMatches[0].slug : value.toLowerCase()
}

/** Match a taxonomy keyword without substring false positives. */
function matchesTechKeyword(haystack: string, keyword: string): boolean {
  const prefix = keyword.endsWith('*')
  const term = normalizeTechText(prefix ? keyword.slice(0, -1) : keyword)
  if (!term) return false
  const text = normalizeTechText(haystack)
  if (!prefix) return (` ${text} `).includes(` ${term} `)
  const parts = term.split(' ')
  const words = text.split(' ')
  return words.some((_, index) => {
    const candidate = words.slice(index, index + parts.length)
    if (candidate.length !== parts.length) return false
    return parts.slice(0, -1).every((part, i) => candidate[i] === part) &&
      candidate[parts.length - 1].startsWith(parts[parts.length - 1])
  })
}

/**
 * Assign canonical technology tags using explicit source tags, the question
 * title and its chapter. Do not classify from long answers or broad source
 * parts: those frequently mention adjacent technologies and pollute filters.
 */
function techsFor(q: RawBankQuestion, meta: BankMeta): string[] {
  const own = new Set((q.t || []).map((tag) => canonicalTechSlug(tag, meta)))
  const questionText = q.q || ''
  const chapterText = q.c || ''

  for (const tech of meta.techs) {
    if (own.has(tech.slug)) continue
    const part = normalizeTechText(q.p || '')
    if (part && (part === normalizeTechText(tech.slug) || part === normalizeTechText(tech.label))) {
      own.add(tech.slug)
      continue
    }

    for (const keyword of tech.keywords) {
      const normalizedKeyword = normalizeTechText(keyword.replace(/\*$/, ''))
      // These terms are too generic to establish SQL, CI/CD, Docker or API
      // relevance on their own; chapter names or specific terms still match.
      const ambiguous: Record<string, string[]> = {
        sql: ['database', 'databases', 'index', 'indexes', 'indexing', 'join', 'joins', 'query', 'queries', 'transaction', 'transactions', 'eloquent'],
        cicd: ['ci', 'monitoring', 'observability'],
        docker: ['kubernetes', 'k8s', 'helm'],
        api: ['integration', 'integrations'],
      }
      const isAmbiguous = ambiguous[tech.slug]?.includes(normalizedKeyword) || false
      if (isAmbiguous && !matchesTechKeyword(chapterText, keyword)) continue
      if (matchesTechKeyword(questionText, keyword) || matchesTechKeyword(chapterText, keyword)) {
        own.add(tech.slug)
        break
      }
    }
  }
  return [...own]
}

/**
 * Derive a 1–6 experience band from the question's level, chapter, and content.
 *
 * Industry mapping:
 *   j (Basic)  → band 1 (fresher) for true fundamentals, else band 2 (junior)
 *   m (Mid)    → band 3 default; band 4 for advanced mid / tech-lead context
 *   s (Senior) → band 5 default; band 6 for lead/staff/architecture topics
 */
function expYearsFor(raw: RawBankQuestion): ExpYears {
  // Preserve explicit editorial / AI-assigned experience labels. Previously these
  // were silently discarded and every record was reclassified from broad text heuristics.
  if (Number.isInteger(raw.expYears) && raw.expYears! >= 1 && raw.expYears! <= 6) {
    return raw.expYears as ExpYears
  }

  const hay = `${raw.q} ${raw.p} ${raw.c}`.toLowerCase()

  if (raw.l === 'j') {
    // The 1-year filter includes basic concepts and straightforward junior
    // implementation tasks, not definitions only.
    return 1
  }

  if (raw.l === 'm') {
    // Band 4 — advanced mid / near-senior signals
    const pc4 = `${raw.p} ${raw.c}`.toLowerCase()
    if (
      /seniority|leadership|team.?lead|tech.?lead|module owner|cross.?team|mentor/.test(hay) ||
      /4.?year|3-4 year|project deep.?dive|architecture decision|production incident/.test(hay) ||
      /own the|independently design|migration strategy/.test(hay) ||
      /team.?lead|leadership|seniority|mentor|tech.?lead/.test(pc4)
    )
      return 4
    return 3
  }

  // s (Senior) — band 6 for lead/staff/strategic topics
  const pc6 = `${raw.p} ${raw.c}`.toLowerCase()
  if (
    /\blead|staff|principal|architect|vp |head of|director|distinguished\b/.test(hay) ||
    /seniority|leadership|team.?lead|tech.?lead|platform team|org.?wide|strategic/.test(pc6) ||
    /if you were leading|leading a team|cross.?team impact/.test(hay)
  )
    return 6
  return 5
}

function toQuestion(raw: RawBankQuestion, meta: BankMeta): Question {
  const plainA = stripHtml(raw.a)
  const code = raw.id || raw.code
  if (!code) throw new Error('Question bank record is missing both id and code')
  return {
    code,
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
    expYears: expYearsFor(raw),
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
