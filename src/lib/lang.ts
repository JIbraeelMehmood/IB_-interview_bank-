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


/* ═══════════════════════════════════════════════════════════════════
 * Urduhack character normalization — 71+ mappings
 * Maps Arabic-variant lookalike characters to canonical Urdu Unicode.
 * Source: urduhack Python library, ported via v7 Phase 1 patch.
 * ═══════════════════════════════════════════════════════════════════ */

const URDU_CHAR_NORM: Record<string, string> = {
  // Alef variants
  '\uFE81': '\u0622', '\uFE82': '\u0622',
  '\uFE83': '\u0623',
  '\uFE8D': '\u0627', '\uFE8E': '\u0627',
  // Be / Pe / Te / Tte
  '\uFE8F': '\u0628', '\uFE90': '\u0628', '\uFE91': '\u0628', '\uFE92': '\u0628',
  '\uFB56': '\u067E', '\uFB57': '\u067E', '\uFB58': '\u067E', '\uFB59': '\u067E',
  '\uFE93': '\u062A', '\uFE94': '\u062A', '\uFE95': '\u062A', '\uFE96': '\u062A',
  '\uFB66': '\u0679', '\uFB67': '\u0679', '\uFB68': '\u0679', '\uFB69': '\u0679',
  // Se / Jeem / Che / He / Khe
  '\uFE99': '\u062B', '\uFE9A': '\u062B', '\uFE9B': '\u062B',
  '\uFE9D': '\u062C', '\uFE9E': '\u062C', '\uFE9F': '\u062C', '\uFEA0': '\u062C',
  '\uFB7A': '\u0686', '\uFB7B': '\u0686', '\uFB7C': '\u0686', '\uFB7D': '\u0686',
  '\uFEA1': '\u062D', '\uFEA2': '\u062D', '\uFEA3': '\u062D', '\uFEA4': '\u062D',
  '\uFEA5': '\u062E', '\uFEA6': '\u062E', '\uFEA7': '\u062E',
  // Dal / Dda / Dhal / Re / Rha / Ze / Zhe
  '\uFEA9': '\u062F', '\uFEAA': '\u062F',
  '\uFB88': '\u0688', '\uFB89': '\u0688',
  '\uFEAB': '\u0630', '\uFEAC': '\u0630',
  '\uFEAD': '\u0631', '\uFEAE': '\u0631',
  '\uFB8C': '\u0691', '\uFB8D': '\u0691',
  '\uFEAF': '\u0632', '\uFEB0': '\u0632',
  '\uFB8A': '\u0698',
  // Seen / Sheen / Sad / Dad / Tah / Zah / Ain / Ghain
  '\uFEB1': '\u0633', '\uFEB2': '\u0633', '\uFEB3': '\u0633', '\uFEB4': '\u0633',
  '\uFEB5': '\u0634', '\uFEB6': '\u0634', '\uFEB7': '\u0634', '\uFEB8': '\u0634',
  '\uFEB9': '\u0635', '\uFEBA': '\u0635', '\uFEBB': '\u0635', '\uFEBC': '\u0635',
  '\uFEBD': '\u0636', '\uFEBE': '\u0636', '\uFEBF': '\u0636', '\uFEC0': '\u0636',
  '\uFEC3': '\u0637', '\uFEC4': '\u0637',
  '\uFEC5': '\u0638', '\uFEC6': '\u0638', '\uFEC7': '\u0638',
  '\uFEC9': '\u0639', '\uFECA': '\u0639', '\uFECB': '\u0639', '\uFECC': '\u0639',
  '\uFECD': '\u063A', '\uFECE': '\u063A', '\uFECF': '\u063A',
  // Fe / Qaf / Ke (ka) / Gaf / Noon ghunna / Lam / Meem / Noon
  '\uFED1': '\u0641', '\uFED2': '\u0641', '\uFED3': '\u0641', '\uFED4': '\u0641',
  '\uFED5': '\u0642', '\uFED6': '\u0642', '\uFED7': '\u0642', '\uFED8': '\u0642',
  '\uFB8E': '\u06A9', '\uFB8F': '\u06A9', '\uFB90': '\u06A9', '\uFB91': '\u06A9',
  '\uFB4B': '\u06A9', '\u0643': '\u06A9',   // Arabic kaf → Urdu ke
  '\uFB92': '\u06AF', '\uFB93': '\u06AF', '\uFB94': '\u06AF', '\uFB95': '\u06AF',
  '\uFB9E': '\u06BA', '\uFB9F': '\u06BA',
  '\uFEDD': '\u0644', '\uFEDE': '\u0644', '\uFEDF': '\u0644', '\uFEE0': '\u0644',
  '\uFEE1': '\u0645', '\uFEE2': '\u0645', '\uFEE3': '\u0645', '\uFEE4': '\u0645',
  '\uFEE5': '\u0646', '\uFEE6': '\u0646', '\uFEE7': '\u0046', '\uFEE8': '\u0046',
  // Waw / Waw hamza / Do chashmi he / Goal he / Ta marbuta / Hamza
  '\uFEED': '\u0648', '\uFEEE': '\u0648', '\uFEEF': '\u0648',
  '\uFE85': '\u0624',
  '\uFEEA': '\u06BE', '\uFBA6': '\u06BE', '\uFBA7': '\u06BE', '\uFBA8': '\u06BE',
  '\uFBA9': '\u06BE', '\uFBAA': '\u06BE',
  '\uFEE9': '\u06C1', '\uFEEC': '\u06C1', '\u0647': '\u06C1', // Arabic heh → goal he
  '\u0629': '\u06C3',  // ta marbuta → te with goal
  '\uFE80': '\u0621',
  // Yeh / Bari yeh / Yeh hamza
  '\uFBFC': '\u06CC', '\u0649': '\u06CC', '\uFBFD': '\u06CC', '\uFEF0': '\u06CC',
  '\uFEF1': '\u06CC', '\uFEF2': '\u06CC', '\uFBFE': '\u06CC', '\uFBFF': '\u06CC',
  '\u064A': '\u06CC',  // Arabic yeh → Urdu yeh
  '\uFE89': '\u0626', '\uFE8B': '\u0626', '\uFE8C': '\u0626',
  '\uFBEE': '\u06D2', '\uFBEF': '\u06D2', '\uFBF0': '\u06D2', '\uFBF1': '\u06D2',
  '\uFBF2': '\u06D3', '\uFBF3': '\u06D3', '\uFBF4': '\u06D3', '\uFBF5': '\u06D3',
  // Arabic-Indic digits → Extended Arabic-Indic (Urdu digits)
  '\u0660': '\u06F0', '\u0661': '\u06F1', '\u0662': '\u06F2', '\u0663': '\u06F3',
  '\u0664': '\u06F4', '\u0665': '\u06F5', '\u0666': '\u06F6', '\u0667': '\u06F7',
  '\u0668': '\u06F8', '\u0669': '\u06F9',
  // Lam-alef ligatures
  '\uFEFB': '\u0644\u0627', '\uFEFC': '\u0644\u0627',
  // Tatweel/kashida → remove
  '\u0640': '',
}

/**
 * Normalize Urdu text: NFC → remove zero-width chars → strip diacritics (tashkeel)
 * → map Arabic-variant characters to canonical Urdu Unicode.
 *
 * This fixes text copied from WhatsApp, SMS, and websites that use Arabic keyboard
 * layouts rather than Urdu-specific Unicode. Without this, dictionary lookups for
 * transliteration and translation silently fail.
 */
export function normalizeUrduText(text: string): string {
  if (!text) return ''
  // Step 1: NFC + remove zero-width characters common in WhatsApp/SMS Urdu
  let out = text.normalize('NFC').replace(/[\u200C\u200D\u200B\uFEFF]/g, '')
  // Step 2: Strip diacritics (tashkeel — harakat, shadda, etc.)
  out = out.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
  // Step 3: Map Arabic-variant chars to canonical Urdu (check pairs first for lam-alef)
  let result = ''
  for (let i = 0; i < out.length; i++) {
    const pair = out[i] + (out[i + 1] ?? '')
    if (URDU_CHAR_NORM[pair] !== undefined) {
      result += URDU_CHAR_NORM[pair]
      i++ // consumed two chars
      continue
    }
    result += URDU_CHAR_NORM[out[i]] !== undefined ? URDU_CHAR_NORM[out[i]] : out[i]
  }
  return result.replace(/\s+/g, ' ').trim()
}
