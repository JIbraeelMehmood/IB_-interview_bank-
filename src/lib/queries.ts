/** Queries over the bank: filtering, search and ranking, ported from v7 and
 *  extended with the FSRS due set. Everything runs against Dexie, so the
 *  library is fully usable offline. */

import { db } from './db'
import { bankMeta } from './seed'
import type { ExpYears, Level, Question } from './types'

export interface Filters {
  search: string
  part: string
  /** Selected technologies. OR is the default: include questions for each selected
   *  technology plus questions tagged with multiple selected technologies (integration). */
  techs: string[]
  /** How multiple technologies combine. */
  techMode: 'and' | 'or'
  level: Level | ''
  /** Years-of-experience band (1–6). Empty string means no filter. */
  expYears: ExpYears | ''
  flag: '' | 'c' | 'i' | 'h'
  source: '' | 'my' | 'ai' | 'import' | 'jd'
  progress: '' | 'none' | 'weak' | 'ok' | 'solid'
  sort: 'default' | 'important' | 'newest' | 'az' | 'asked'
  hiddenTechs: string[]
  customTechs: string[]
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  part: '',
  techs: [],
  techMode: 'or',
  level: '',
  expYears: '',
  flag: '',
  source: '',
  progress: '',
  sort: 'default',
  hiddenTechs: [],
  customTechs: [],
}

/** Add or remove a technology from the selection. */
export function toggleTech(f: Filters, slug: string): Filters {
  const techs = f.techs.includes(slug) ? f.techs.filter((t) => t !== slug) : [...f.techs, slug]
  return { ...f, techs }
}

/** Quick filters from the v7 home tiles. */
export const QUICK = [
  { id: 'c', label: 'Most asked' },
  { id: 'i', label: 'Most important' },
  { id: 'h', label: 'How it works' },
  { id: 'my', label: 'My questions' },
  { id: 'ai', label: 'AI generated' },
  { id: 'import', label: 'Imported' },
] as const

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 1)

/** Every term must appear somewhere in the haystack (AND semantics). */
export function matchesSearch(q: Question, term: string): boolean {
  if (!term) return true
  const hay = q.search || `${q.q} ${q.a} ${q.p} ${q.c} ${q.t.join(' ')}`.toLowerCase()
  return words(term).every((w) => hay.includes(w))
}

export interface Ranked extends Question {
  rating: 0 | 1 | 2 | 3
}

/** Apply all filters, then sort. */
export function applyFilters(
  questions: Question[],
  f: Filters,
  ratings: Map<string, number>,
): Ranked[] {
  const hidden = new Set(f.hiddenTechs)
  const want = f.techs
  // A custom tech has no keywords, so match it against the question's own tags
  // as well as the text.
  const custom = new Set(f.customTechs)

  // Build a one-hop technology relationship graph from the question bank itself.
  // This works for every technology, not only Laravel: if questions commonly
  // combine two technologies (for example Laravel/PHP or Docker/AWS), selecting
  // either technology can include the directly related topic questions.
  // We deliberately do not traverse transitively, which would make broad stacks
  // (for example JavaScript -> React -> Node -> AWS) expand without control.
  const relatedByTech = new Map<string, Set<string>>()
  if (want.length) {
    const cooccurrence = new Map<string, Map<string, number>>()
    const totals = new Map<string, number>()
    for (const q of questions) {
      const tags = [...new Set(q.t.filter((tag) => !custom.has(tag)))]
      for (const tag of tags) {
        totals.set(tag, (totals.get(tag) || 0) + 1)
        if (!cooccurrence.has(tag)) cooccurrence.set(tag, new Map())
        const related = cooccurrence.get(tag)!
        for (const other of tags) {
          if (other !== tag) related.set(other, (related.get(other) || 0) + 1)
        }
      }
    }
    for (const [slug, related] of cooccurrence) {
      const threshold = Math.max(2, Math.ceil((totals.get(slug) || 0) * 0.03))
      relatedByTech.set(
        slug,
        new Set([...related.entries()]
          .filter(([, count]) => count >= threshold)
          .map(([other]) => other)),
      )
    }
  }

  const hasTech = (q: Question, slug: string) => {
    if (custom.has(slug)) {
      if (q.t.includes(slug)) return true
      return matchesSearch({ ...q, search: q.search || '' }, slug)
    }
    const accepted = relatedByTech.get(slug)
    return q.t.includes(slug) || Boolean(accepted && q.t.some((tag) => accepted.has(tag)))
  }

  let out = questions.filter((q) => {
    if (f.search && !matchesSearch(q, f.search)) return false
    if (f.part && q.p !== f.part) return false

    // Multiple technologies: OR includes individual technology questions and
    // multi-tag intersection questions. AND remains available as an explicit narrowing option.
    if (want.length) {
      const ok =
        f.techMode === 'or'
          ? want.some((t) => hasTech(q, t))
          : want.every((t) => hasTech(q, t))
      if (!ok) return false
    }

    if (f.level && q.l !== f.level) return false
    if (f.expYears && (q.expYears || 0) !== f.expYears) return false
    if (f.flag && !(q.f || '').includes(f.flag)) return false
    if (f.source && q.s !== f.source) return false

    // Hidden techs: drop a question only when *every* one of its techs is hidden.
    if (hidden.size && q.t.length && q.t.every((t) => hidden.has(t))) return false

    if (f.progress) {
      const r = ratings.get(q.code) || 0
      if (f.progress === 'none' && r) return false
      if (f.progress === 'weak' && r !== 1) return false
      if (f.progress === 'ok' && r !== 2) return false
      if (f.progress === 'solid' && r !== 3) return false
    }
    return true
  })

  const rate = (q: Question) => ratings.get(q.code) || 0
  const selectedTechCoverage = (q: Question) => want.reduce((n, slug) => n + (hasTech(q, slug) ? 1 : 0), 0)
  if (f.sort === 'important') {
    out = out.sort((a, b) => flagScore(b) - flagScore(a) || selectedTechCoverage(b) - selectedTechCoverage(a) || rate(b) - rate(a))
  } else if (f.sort === 'az') {
    out = out.sort((a, b) => a.q.localeCompare(b.q))
  } else if (f.sort === 'newest') {
    out = out.sort((a, b) => (b.s === 'n' ? 1 : 0) - (a.s === 'n' ? 1 : 0) || b.code.localeCompare(a.code))
  } else {
    out = out.sort((a, b) => flagScore(b) - flagScore(a) || selectedTechCoverage(b) - selectedTechCoverage(a) || a.code.localeCompare(b.code))
  }
  return out.map((q) => ({ ...q, rating: rate(q) as 0 | 1 | 2 | 3 }))
}

/** most-asked + most-important + how-it-works, weighted. */
function flagScore(q: Question): number {
  const f = q.f || ''
  return (f.includes('i') ? 4 : 0) + (f.includes('c') ? 2 : 0) + (f.includes('h') ? 1 : 0)
}

/** Load everything, then filter in memory. The bank is 2,140 rows, so this
 *  is far faster than 2,140 queries and works offline. */
export async function loadLibrary(f: Filters): Promise<Ranked[]> {
  const [questions, ratings, stats] = await Promise.all([
    db.questions.toArray(),
    db.ratings.toArray(),
    db.questionStats.toArray(),
  ])
  const map = new Map(ratings.map((r) => [r.code, r.rating]))
  const statsMap = new Map(stats.map((s) => [s.code, s.askCount]))
  const ranked = applyFilters(questions, f, map)

  if (f.sort === 'asked') {
    ranked.sort((a, b) => (statsMap.get(b.code) || 0) - (statsMap.get(a.code) || 0))
  }
  return ranked
}

/** Counts per tech for the chip row.
 *
 *  Counts respect every *other* filter but ignore the tech selection itself, so
 *  each chip shows "if I add this, how many do I get" rather than collapsing to
 *  the already-selected ones. The default OR mode keeps individual and integration
 *  questions together; users can still explicitly choose Match all. */
export async function techCounts(f: Filters): Promise<{ slug: string; label: string; n: number }[]> {
  const base: Filters = { ...f, techs: [], techMode: 'or' }
  const [rows, meta] = await Promise.all([loadLibrary(base), bankMeta()])
  const counts = new Map<string, number>()
  // Chip counts use the same dynamic relationship logic as the results. This
  // keeps counts useful when a technology is selected indirectly through a
  // related stack tag, while still respecting the other active filters.
  for (const tech of meta.techs) {
    const matching = applyFilters(
      rows,
      { ...f, techs: [tech.slug], techMode: 'or' },
      new Map(),
    )
    if (matching.length) counts.set(tech.slug, matching.length)
  }
  for (const q of rows) {
    for (const t of q.t) {
      if (f.customTechs.includes(t)) counts.set(t, (counts.get(t) || 0) + 1)
    }
  }

  // Render every populated category from the question-bank taxonomy, using
  // its human-readable label. Preserve user-defined tags where they exist.
  const known = new Set(meta.techs.map((tech) => tech.slug))
  const catalog = meta.techs
    .map((tech) => ({ slug: tech.slug, label: tech.label, n: counts.get(tech.slug) || 0 }))
    .filter((tech) => tech.n > 0)
  const custom = [...counts.entries()]
    .filter(([slug, n]) => n > 0 && !known.has(slug) && f.customTechs.includes(slug))
    .map(([slug, n]) => ({ slug, label: slug, n }))
  return [...catalog, ...custom].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
}

/** Counts per part, for the category select. */
export async function partCounts(f: Filters): Promise<{ part: string; n: number }[]> {
  const base = { ...f, part: '' }
  const rows = await loadLibrary(base)
  const counts = new Map<string, number>()
  for (const q of rows) counts.set(q.p, (counts.get(q.p) || 0) + 1)
  return [...counts.entries()].map(([part, n]) => ({ part, n })).sort((a, b) => b.n - a.n)
}

/** Counts per experience-year band, for the exp chips. */
export async function expYearsCounts(f: Filters): Promise<{ exp: number; n: number }[]> {
  const base = { ...f, expYears: '' as const }
  const rows = await loadLibrary(base)
  const counts = new Map<number, number>()
  for (const q of rows) {
    const y = q.expYears || 0
    if (y) counts.set(y, (counts.get(y) || 0) + 1)
  }
  return [...counts.entries()].map(([exp, n]) => ({ exp, n })).sort((a, b) => a.exp - b.exp)
}

/** Ratings and the reviewed-so-far count for the progress screen. */
export async function progressSummary() {
  const [ratings, reviews, answers, total] = await Promise.all([
    db.ratings.toArray(),
    db.reviews.toArray(),
    db.answers.toArray(),
    db.questions.count(),
  ])
  const byRating = { weak: 0, ok: 0, solid: 0 }
  for (const r of ratings) {
    if (r.rating === 1) byRating.weak++
    else if (r.rating === 2) byRating.ok++
    else if (r.rating === 3) byRating.solid++
  }
  const practised = new Set(ratings.map((r) => r.code))
  const now = Date.now()
  return {
    total,
    practised: practised.size,
    byRating,
    cards: reviews.length,
    due: reviews.filter((r) => new Date(r.due).getTime() <= now).length,
    answers: answers.length,
    percent: total ? Math.round((practised.size / total) * 100) : 0,
  }
}

/** Per-tech progress, for the Progress screen bars. */
export async function techProgress() {
  const [questions, ratings] = await Promise.all([db.questions.toArray(), db.ratings.toArray()])
  const map = new Map(ratings.map((r) => [r.code, r.rating]))
  const total = new Map<string, number>()
  const done = new Map<string, number>()
  for (const q of questions) {
    for (const t of q.t) {
      total.set(t, (total.get(t) || 0) + 1)
      if (map.get(q.code)) done.set(t, (done.get(t) || 0) + 1)
    }
  }
  return [...total.entries()]
    .map(([slug, n]) => ({ slug, n, done: done.get(slug) || 0 }))
    .filter((t) => t.n >= 3)
    .sort((a, b) => a.done / a.n - b.done / b.n)
}

/** Codes for a mock: by JD plan, by filter, most important, or weak. */
export async function mockCodes(source: string, f: Filters, jdCodes?: string[]): Promise<string[]> {
  if (source === 'jd' && jdCodes?.length) return jdCodes
  if (source === 'important') {
    const rows = await loadLibrary({ ...f, flag: 'i' })
    return rows.map((r) => r.code)
  }
  if (source === 'weak') {
    const rows = await loadLibrary({ ...f, progress: 'weak' })
    return (rows.length ? rows : await loadLibrary(f)).map((r) => r.code)
  }
  const rows = await loadLibrary(f)
  return rows.map((r) => r.code)
}
