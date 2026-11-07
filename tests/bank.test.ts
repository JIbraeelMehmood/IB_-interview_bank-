/** The bank is the product. These tests read the real extracted data files, so
 *  a broken extraction fails here rather than on a phone. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ensureSeeded, stripHtml } from '../src/lib/seed'
import { db } from '../src/lib/db'
import { applyFilters, DEFAULT_FILTERS, matchesSearch, techCounts } from '../src/lib/queries'
import type { Question } from '../src/lib/types'
import { loadLibrary } from '../src/lib/queries'

const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', f), 'utf8'))

beforeAll(async () => {
  const files: Record<string, unknown> = {
    'bank.json': read('bank.json'),
    'meta.json': read('meta.json'),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop()
      const body = files[name!]
      if (body === undefined) return { ok: false, json: async () => ({}) }
      return { ok: true, json: async () => body }
    }),
  )
  await ensureSeeded()
})

describe('the extracted bank', () => {
  it('seeds every question in the current bank', async () => {
    expect(await db.questions.count()).toBe(read('bank.json').length)
  })

  it('keeps the v7 question codes stable', async () => {
    const cb = await db.questions.get('CB-1')
    expect(cb).toBeTruthy()
    expect(cb!.q).toBeTruthy()
    const n = await db.questions.get('N-1')
    expect(n).toBeTruthy()
    // Markdown-imported rows use `code` rather than `id` in the source JSON.
    expect(await db.questions.get('MD-1')).toBeTruthy()
  })

  it('has no duplicate codes', async () => {
    const all = await db.questions.toArray()
    expect(new Set(all.map((q) => q.code)).size).toBe(all.length)
  })

  it('gives every question a level, part and search haystack', async () => {
    const all = await db.questions.toArray()
    for (const q of all) {
      expect(['j', 'm', 's']).toContain(q.l)
      expect(q.p).toBeTruthy()
      expect(q.search).toBeTruthy()
    }
  })

  it('matches techs by keyword as well as by tag', async () => {
    // `t` is the multiEntry index over a question's tech tags.
    const laravel = await db.questions.where('t').equals('laravel').count()
    expect(laravel).toBeGreaterThan(50)
    const redis = await db.questions.where('t').equals('redis').count()
    expect(redis).toBeGreaterThan(5)
  })

  it('normalizes legacy aliases into canonical taxonomy slugs', async () => {
    const all = await db.questions.toArray()
    for (const q of all) {
      expect(q.t).not.toContain('javascript')
      expect(q.t).not.toContain('deployment')
    }
    expect(all.some((q) => q.t.includes('js'))).toBe(true)
    expect(all.some((q) => q.t.includes('cicd'))).toBe(true)
  })

  it('exposes all populated technology categories from bank metadata', async () => {
    const all = await db.questions.toArray()
    const expected = new Set(all.flatMap((q) => q.t))
    const categories = await techCounts(DEFAULT_FILTERS)
    expect(new Set(categories.map((category) => category.slug))).toEqual(expected)
    expect(categories.find((category) => category.slug === 'laravel')?.label).toBe('Laravel')
    expect(categories.find((category) => category.slug === 'sql')?.label).toBe('SQL & MySQL')
    expect(categories.length).toBeGreaterThan(40)
  })

  it('retains genuine multi-category questions for intersection filtering', async () => {
    const all = await db.questions.toArray()
    const intersections = all.filter((q) => q.t.length > 1)
    expect(intersections.length).toBeGreaterThan(300)
    const selected = intersections[0].t.slice(0, 2)
    const rows = applyFilters(all, { ...DEFAULT_FILTERS, techs: selected, techMode: 'and' }, new Map())
    expect(rows.some((q) => q.code === intersections[0].code)).toBe(true)
  })

  it('carries the 20 hand-written translations as approved entries', async () => {
    const builtin = await db.translations.filter((t) => t.builtin === 1).toArray()
    expect(builtin.length).toBeGreaterThanOrEqual(20)
    for (const t of builtin) expect(t.engine).toBe('human')
  })

  it('links questions to SQL Lab exercises where v7 did', async () => {
    const withEx = await db.questions.filter((q) => !!q.ex).count()
    expect(withEx).toBeGreaterThanOrEqual(15)
  })
})

describe('filtering and search', () => {
  it('requires every search term to match', () => {
    const q = {
      code: 'X-1',
      q: 'Explain Laravel queues and Redis caching',
      a: '',
      l: 'm' as const,
      p: 'P',
      c: 'C',
      f: '' as const,
      t: ['laravel'],
      s: 'n' as const,
      search: 'explain laravel queues and redis caching',
      updatedAt: 0,
    }
    expect(matchesSearch(q, 'laravel queue')).toBe(true)
    expect(matchesSearch(q, 'laravel kafka')).toBe(false)
  })

  const mk = (code: string, t: string[], f: Question['f'] = ''): Question => ({
    code, q: code.toLowerCase(), a: '', l: 'm', p: 'P', c: '', f, t, s: 'n', search: code.toLowerCase(), updatedAt: 0,
  })

  it('combines multiple technologies with AND', () => {
    const all = [mk('A', ['laravel', 'react']), mk('B', ['laravel']), mk('C', ['laravel', 'react', 'sql'], 'i')]
    const map = new Map<string, number>()
    const and = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel', 'react'], techMode: 'and' }, map)
    // Order follows the default importance sort, so compare as a set.
    expect(and.map((r) => r.code).sort()).toEqual(['A', 'C'])
    const or = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel', 'react'], techMode: 'or' }, map)
    expect(or).toHaveLength(3)
  })

  it('defaults to OR so multi-tech selections include individual and intersection questions', () => {
    const all = [
      mk('L', ['laravel']),
      mk('R', ['react']),
      mk('LR', ['laravel', 'react']),
      mk('V', ['vue']),
    ]
    expect(DEFAULT_FILTERS.techMode).toBe('or')
    const rows = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel', 'react'] }, new Map())
    expect(rows.map((r) => r.code).sort()).toEqual(['L', 'LR', 'R'])
  })

  it('keeps a single technology filter strict', () => {
    const all = [mk('L', ['laravel']), mk('R', ['react']), mk('LR', ['laravel', 'react']), mk('G', ['generic'])]
    const rows = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel'] }, new Map())
    expect(rows.map((r) => r.code).sort()).toEqual(['L', 'LR'])
  })

  it('combines most-important with the selected technology scope', () => {
    const all = [mk('L1', ['laravel']), mk('L2', ['laravel'], 'i'), mk('R1', ['react'], 'i'), mk('LR', ['laravel', 'react'], 'i')]
    const rows = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel', 'react'], flag: 'i' }, new Map())
    expect(rows.map((r) => r.code).sort()).toEqual(['L2', 'LR', 'R1'])
  })

  it('combines technologies with a flag filter', () => {
    const all = [mk('A', ['laravel', 'react']), mk('C', ['laravel', 'react'], 'i')]
    const map = new Map<string, number>()
    // Laravel + React + Most important == only C
    const rows = applyFilters(all, { ...DEFAULT_FILTERS, techs: ['laravel', 'react'], techMode: 'and', flag: 'i' }, map)
    expect(rows.map((r) => r.code)).toEqual(['C'])
  })

  it('filters by flag and level', async () => {
    const all = await db.questions.toArray()
    const map = new Map<string, number>()
    const important = applyFilters(all, { ...DEFAULT_FILTERS, flag: 'i' }, map)
    expect(important.length).toBeGreaterThan(700)
    for (const q of important) expect(q.f).toContain('i')
    const senior = applyFilters(all, { ...DEFAULT_FILTERS, level: 's' }, map)
    for (const q of senior) expect(q.l).toBe('s')
  })

  it('sorts by importance and alphabetically', async () => {
    const all = await db.questions.toArray()
    const map = new Map<string, number>()
    const az = applyFilters(all, { ...DEFAULT_FILTERS, sort: 'az' }, map)
    expect(az.length).toBe(all.length)
    for (let i = 1; i < az.length; i++) {
      expect(az[i - 1].q.localeCompare(az[i].q)).toBeLessThanOrEqual(0)
    }
  })

  it('shows only user questions for the source filter', async () => {
    await db.questions.put({
      code: 'MY-TEST-1',
      q: 'My own question',
      a: 'answer',
      l: 'm',
      p: 'My questions',
      c: '',
      f: '',
      t: [],
      s: 'my',
      search: 'my own question',
      updatedAt: Date.now(),
    })
    const rows = await loadLibrary({ ...DEFAULT_FILTERS, source: 'my' })
    expect(rows.map((r) => r.code)).toContain('MY-TEST-1')
  })
})

describe('stripHtml', () => {
  it('keeps the words and drops the tags', () => {
    expect(stripHtml('<h3>Title</h3><p>Body <code>x</code></p>')).toBe('Title Body x')
  })
})
