/** Queries over the bank: filtering, search and ranking, ported from v7 and
 *  extended with the FSRS due set. Everything runs against Dexie, so the
 *  library is fully usable offline. */

import { db } from './db'
import type { Level, Question } from './types'

export interface Filters {
  search: string
  part: string
  /** Selected technologies. Multiple selections are combined with AND, so
   *  Laravel + React + Most important returns questions that are all three. */
  techs: string[]
  /** How multiple technologies combine. */
  techMode: 'and' | 'or'
  level: Level | ''
  flag: '' | 'c' | 'i' | 'h'
  source: '' | 'my' | 'ai' | 'import' | 'jd'
  progress: '' | 'none' | 'weak' | 'ok' | 'solid'
  sort: 'default' | 'important' | 'newest' | 'az'
  hiddenTechs: string[]
  customTechs: string[]
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  part: '',
  techs: [],
  techMode: 'and',
  level: '',
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
  const hasTech = (q: Question, slug: string) => {
    if (custom.has(slug)) {
      if (q.t.includes(slug)) return true
      return matchesSearch({ ...q, search: q.search || '' }, slug)
    }
    return q.t.includes(slug)
  }

  let out = questions.filter((q) => {
    if (f.search && !matchesSearch(q, f.search)) return false
    if (f.part && q.p !== f.part) return false

    // Multiple technologies: AND means "has all of them", OR means "has any".
    if (want.length) {
      const ok =
        f.techMode === 'or'
          ? want.some((t) => hasTech(q, t))
          : want.every((t) => hasTech(q, t))
      if (!ok) return false
    }

    if (f.level && q.l !== f.level) return false
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
  if (f.sort === 'important') {
    out = out.sort((a, b) => flagScore(b) - flagScore(a) || rate(b) - rate(a))
  } else if (f.sort === 'az') {
    out = out.sort((a, b) => a.q.localeCompare(b.q))
  } else if (f.sort === 'newest') {
    out = out.sort((a, b) => (a.s === 'n' ? 1 : 0) - (b.s === 'n' ? 1 : 0))
  } else {
    out = out.sort((a, b) => flagScore(b) - flagScore(a) || a.code.localeCompare(b.code))
  }
  return out.map((q) => ({ ...q, rating: rate(q) as 0 | 1 | 2 | 3 }))
}

/** most-asked + most-important + how-it-works, weighted. */
function flagScore(q: Question): number {
  const f = q.f || ''
  return (f.includes('i') ? 4 : 0) + (f.includes('c') ? 2 : 0) + (f.includes('h') ? 1 : 0)
}

/** Load everything, then filter in memory. The bank is 1,950 rows, so this
 *  is far faster than 1,950 queries and works offline. */
export async function loadLibrary(f: Filters): Promise<Ranked[]> {
  const [questions, ratings] = await Promise.all([db.questions.toArray(), db.ratings.toArray()])
  const map = new Map(ratings.map((r) => [r.code, r.rating]))
  return applyFilters(questions, f, map)
}

/** Counts per tech for the chip row.
 *
 *  Counts respect every *other* filter but ignore the tech selection itself, so
 *  each chip shows "if I add this, how many do I get" rather than collapsing to
 *  the already-selected ones. In AND mode the count is the size of the
 *  intersection, which is the number a person wants before tapping a chip. */
export async function techCounts(f: Filters): Promise<{ slug: string; n: number }[]> {
  const base: Filters = { ...f, techs: [], techMode: 'or' }
  const rows = await loadLibrary(base)
  const counts = new Map<string, number>()
  for (const q of rows) for (const t of q.t) counts.set(t, (counts.get(t) || 0) + 1)

  if (f.techMode === 'and' && f.techs.length > 1) {
    for (const slug of f.techs) {
      const narrowed = await loadLibrary({ ...f, techs: [slug] })
      counts.set(slug, narrowed.length)
    }
  }
  return [...counts.entries()].map(([slug, n]) => ({ slug, n })).sort((a, b) => b.n - a.n)
}

/** Counts per part, for the category select. */
export async function partCounts(f: Filters): Promise<{ part: string; n: number }[]> {
  const base = { ...f, part: '' }
  const rows = await loadLibrary(base)
  const counts = new Map<string, number>()
  for (const q of rows) counts.set(q.p, (counts.get(q.p) || 0) + 1)
  return [...counts.entries()].map(([part, n]) => ({ part, n })).sort((a, b) => b.n - a.n)
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
