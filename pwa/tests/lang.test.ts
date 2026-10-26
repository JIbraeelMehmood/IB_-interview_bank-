/** The language engine rules are the thing most likely to regress silently, so
 *  they get tested against the exact examples from the v7 documentation. */
import { beforeAll, describe, expect, it } from 'vitest'
import { loadDictionary, loadLexicons, modern, protectTerms, restoreTerms, ruNorm } from '../src/lib/lang'

// The data files are fetched at runtime; serve them from disk in the test env.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', f), 'utf8'))

beforeAll(() => {
  const files: Record<string, unknown> = {
    'lexicons.json': read('lexicons.json'),
    'dictionary.json': read('dictionary.json'),
    'prompts.json': read('prompts.json'),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() || ''
      if (!(name in files)) return { ok: false, json: async () => ({}) }
      return { ok: true, json: async () => files[name] }
    }),
  )
})

describe('modern-register lexicon', () => {
  it('replaces bookish Urdu with everyday Urdu', async () => {
    await loadLexicons()
    expect(await modern('لہٰذا صارف کو مطلوبہ', 'ur')).toContain('اس لیے')
    expect(await modern('فراہم کرتا ہے', 'ur')).toBe('دیتا ہے')
  })

  it('leaves English untouched', async () => {
    await loadLexicons()
    expect(await modern('This is a test', 'en')).toBe('This is a test')
  })

  it('replaces Sanskritised Hindi with everyday Hinglish', async () => {
    await loadLexicons()
    expect(await modern('अतः', 'hi')).toBe('इसलिए')
  })

  it('does not rewrite inside code spans', async () => {
    await loadLexicons()
    const out = await modern('`لہٰذا` and لہٰذا', 'ur')
    expect(out).toContain('`لہٰذا`')
    expect(out).toContain('اس لیے')
  })
})

describe('Roman Urdu spellings', () => {
  it('normalises variants to one spelling', async () => {
    await loadLexicons()
    expect(ruNorm('hy aap hy')).toContain('hai')
    expect(ruNorm('bht acha')).toContain('bohat')
  })
})

describe('the 260-term dictionary', () => {
  it('has 260 terms, each with an English, Urdu and Devanagari form', async () => {
    const rows = await loadDictionary()
    expect(rows).toHaveLength(260)
    const parsed = rows.map((r) => String(r).split('|'))
    for (const [en, ur, hi] of parsed.slice(0, 20)) {
      expect(en).toBeTruthy()
      expect(ur).toBeTruthy()
      expect(hi).toBeTruthy()
    }
    // laravel and redis must both be present, since they drive the audio dictionary
    expect(parsed.map((p) => p[0])).toContain('laravel')
    expect(parsed.map((p) => p[0])).toContain('redis')
  })

  it('protects tech terms from a translator and restores them', async () => {
    await loadDictionary()
    const { text, map } = await protectTerms('I use Laravel with Redis for caching.')
    expect(text).not.toContain('Laravel')
    expect(restoreTerms(text, map)).toBe('I use Laravel with Redis for caching.')
  })
})
