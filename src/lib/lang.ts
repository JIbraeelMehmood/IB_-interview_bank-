/** Language engine — a direct port of the v7 logic, so saved translations and
 *  future output behave identically.
 *
 *  Rules version 3 = "modern everyday register" (v7 direction change):
 *  tech terms stay English, ordinary work words may be said the Urdu/Hindi way,
 *  and Urdu/Hindi grammar and connectors are kept.
 */

import type { Lang } from './types'

export const RULES_VERSION = 3

type Pairs = [string, string][]

interface Lexicons {
  ur: Pairs
  hi: Pairs
  ru: Pairs
  ruNorm: Pairs
}

let lexCache: Lexicons | null = null
let dictCache: string[][] | null = null
let promptsCache: { trStyle: string; hiStyle: string; ruSpell: string } | null = null

export async function loadLexicons(): Promise<Lexicons> {
  if (lexCache) return lexCache
  const res = await fetch('/data/lexicons.json')
  if (!res.ok) throw new Error('lexicons.json missing')
  lexCache = (await res.json()) as Lexicons
  return lexCache
}

export async function loadDictionary(): Promise<string[][]> {
  if (dictCache) return dictCache
  const res = await fetch('/data/dictionary.json')
  if (!res.ok) throw new Error('dictionary.json missing')
  dictCache = (await res.json()) as string[][]
  return dictCache
}

export async function loadPrompts(): Promise<{ trStyle: string; hiStyle: string; ruSpell: string }> {
  if (promptsCache) return promptsCache
  const res = await fetch('/data/prompts.json')
  if (!res.ok) throw new Error('prompts.json missing')
  promptsCache = (await res.json()) as { trStyle: string; hiStyle: string; ruSpell: string }
  return promptsCache
}

const isCodeish = (ch: string) => ch === '`' || ch === '|'

/** Split text into code and non-code runs so we never rewrite inside `code`. */
function segments(text: string): { code: boolean; s: string }[] {
  const out: { code: boolean; s: string }[] = []
  let buf = ''
  let inCode = false
  const flush = () => {
    if (buf) out.push({ code: inCode, s: buf })
    buf = ''
  }
  for (const ch of text) {
    if (isCodeish(ch)) {
      flush()
      inCode = !inCode
      continue
    }
    buf += ch
  }
  flush()
  return out
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Apply a lexicon outside code spans, on script-aware word edges.
 * Longest pair first so "لہٰذا" wins over a shorter overlapping pair.
 */
function applyPairs(text: string, pairs: Pairs): string {
  if (!pairs.length || !text) return text
  // Each `from` may be a pipe-joined list of alternatives, e.g. 'hy|hae|hay'.
  const rules = pairs
    .flatMap(([from, to]) =>
      from
        .split('|')
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => [f, to] as [string, string]),
    )
    .sort((a, b) => b[0].length - a[0].length)
  return segments(text)
    .map((seg) => {
      if (seg.code) return '`' + seg.s + '`'
      let out = seg.s
      for (const [from, to] of rules) {
        // Whole-word match: not preceded or followed by a letter/digit.
        const re = new RegExp(
          `(?<![\\p{L}\\p{N}])${escapeRe(from)}(?![\\p{L}\\p{N}])`,
          'giu',
        )
        out = out.replace(re, to)
      }
      return out
    })
    .join('')
}

/**
 * Roman Urdu spellings vary; map every variant to the most common spelling.
 */
export function ruNorm(text: string): string {
  if (!lexCache) return text
  return applyPairs(text, lexCache.ruNorm)
}

/** Modern-register lexicon for a language. */
export async function modern(text: string, lang: Lang): Promise<string> {
  if (lang === 'en' || !text) return text
  const lex = await loadLexicons()
  const pairs = lang === 'ur' ? lex.ur : lang === 'hi' ? lex.hi : lex.ru
  return ruNorm(applyPairs(text, pairs))
}

let dictMap: Map<string, string[]> | null = null

/**
 * The 260-term audio dictionary: English | Urdu script | Devanagari.
 * Used to pronounce tech words inside Urdu/Hindi speech, and to keep free
 * machine translators from translating them.
 */
export async function dict(): Promise<Map<string, string[]>> {
  if (dictMap) return dictMap
  const rows = await loadDictionary()
  dictMap = new Map(
    rows.map((r) => {
      const [en, ur, hi] = String(r).split('|')
      return [String(en).trim().toLowerCase(), [String(en).trim(), ur || '', hi || '']] as const
    }),
  )
  return dictMap
}

/** Urdu-script spelling of an English tech word, if we have one. */
export async function dictUr(word: string): Promise<string> {
  return (await dict()).get(word.toLowerCase())?.[1] || ''
}

/** Devanagari spelling of an English tech word, if we have one. */
export async function dictHi(word: string): Promise<string> {
  return (await dict()).get(word.toLowerCase())?.[2] || ''
}

/** Placeholder unlikely to survive a round trip through any translator. */
const ph = (i: number) => `\u241F${i}\u241F`

/** Replace tech terms with placeholders so a free translator leaves them alone. */
export async function protectTerms(
  text: string,
): Promise<{ text: string; map: Map<string, string> }> {
  const map = new Map<string, string>()
  if (!text) return { text, map }
  const m = await dict()
  const keys = [...m.keys()].filter(Boolean).sort((a, b) => b.length - a.length)
  if (!keys.length) return { text, map }
  const re = new RegExp(`\\b(${keys.map(escapeRe).join('|')})\\b`, 'gi')
  let n = 0
  const out = text.replace(re, (hit) => {
    const p = ph(n++)
    map.set(p, hit)
    return p
  })
  return { text: out, map }
}

/** Put the protected tech terms back. */
export function restoreTerms(text: string, map: Map<string, string>): string {
  let out = text
  for (const [placeholder, original] of map) out = out.split(placeholder).join(original)
  return out
}

/** Protect every named string field of an object in one pass. */
export async function protectObject<T extends Record<string, unknown>>(
  value: T,
  fields: string[] = ['q', 'a', 'key', 'hook', 'sayq', 'say', 'sayhook'],
): Promise<{ value: T; map: Map<string, string> }> {
  const map = new Map<string, string>()
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && v && fields.includes(k)) {
      const r = await protectTerms(v)
      for (const [p, orig] of r.map) map.set(p, orig)
      out[k] = r.text
    } else {
      out[k] = v
    }
  }
  return { value: out as T, map }
}

/** Restore a payload protected with {@link protectObject}. */
export function restoreObject<T extends Record<string, unknown>>(value: T, map: Map<string, string>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = typeof v === 'string' ? restoreTerms(v, map) : v
  }
  return out as T
}

/** Tech terms that must never be translated, for prompt keep-lists. */
export async function keepList(limit = 60): Promise<string[]> {
  const m = await dict()
  return [...m.keys()].slice(0, limit)
}

