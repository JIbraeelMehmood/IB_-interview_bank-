/** Core domain types. Question `code` keeps the stable v7 IDs (CB-1, N-493, …) so
 *  progress imported from the v7 backup keeps working. */

export type Lang = 'en' | 'ur' | 'ru' | 'hi'
export const LANGS: Lang[] = ['en', 'ur', 'ru', 'hi']

export const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  ur: 'اردو',
  ru: 'Roman Urdu',
  hi: 'हिंदी',
}
export const LANG_SCRIPT: Record<Lang, string> = { en: 'Latin', ur: 'Urdu', ru: 'Latin', hi: 'Devanagari' }
/** Which script a language is *written* in — drives RTL and font choice. */
export const LANG_RTL: Record<Lang, boolean> = { en: false, ur: true, ru: false, hi: false }

export type Level = 'j' | 'm' | 's'
export const LEVEL_NAME: Record<Level, string> = { j: 'Basic', m: 'Mid', s: 'Senior' }

/** Flags are a subset of `c` most-asked, `i` most-important, `h` how-it-works.
 *  Stored as a string because the data uses combinations ('i', 'ci', 'cih', ''). */
export type FlagChar = 'c' | 'i' | 'h'
export type Flags = '' | 'c' | 'i' | 'h' | 'ci' | 'ch' | 'ih' | 'cih'

export type Source = 'b' | 'n' | 'my' | 'ai' | 'jd' | 'import'

/** A question as stored in Dexie. Mirrors the v7 JSON shape where possible. */
export interface Question {
  /** Stable code — the v7 `id`. Primary key. */
  code: string
  q: string
  /** Answer HTML. */
  a: string
  l: Level
  /** Part / category label. */
  p: string
  /** Chapter within the part. */
  c: string
  /** Flags string, e.g. "ci". */
  f: Flags | ''
  /** Tech tags (merged at seed time with keyword matches). */
  t: string[]
  s: Source
  /** Optional SQL Lab exercise id (e.g. "v3"). */
  ex?: string
  /** Hand-written translations (only the 20 video questions in v7). */
  tr?: Record<string, BuiltinTranslation>
  /** For AI/JD/imported questions. */
  cat?: string
  src?: string
  /** Lowercased haystack for keyword search, built at seed time. */
  search?: string
  updatedAt: number
}

export interface BuiltinTranslation {
  q?: string
  a?: string
  hook?: string
  key?: string
}

/** One cached translation for a (question, language). */
export interface Translation {
  /** `${code}|${lang}` */
  id: string
  code: string
  lang: Lang
  /** Question in the target language. */
  q?: string
  /** Explanation markdown. */
  a?: string
  /** One English sentence to say in the interview. */
  key?: string
  /** Memory hook in the target language. */
  hook?: string
  /** Spoken form of the question (written for a voice). */
  sayq?: string
  /** Spoken form of the explanation. */
  say?: string
  /** Spoken form of the hook. */
  sayhook?: string
  /** Which script the spoken text was written for: ur | hi. */
  ss?: 'ur' | 'hi'
  /** Engine: llm:model, indictrans2, mymemory, chrome, human, or "Google" | "Chrome". */
  engine?: string
  /** Translation rules version (TRV). 3 = modern everyday register. */
  rules?: number
  /** Marked as machine-translated (weaker than an AI/human translation). */
  mt?: string
  /** Hand-written in v7. */
  builtin?: 1
  /** "Explain simpler" variant. */
  simple?: 1
  /** Last used — for IndexedDB-style pruning. */
  t: number
  updatedAt: number
}

export interface Rating {
  code: string
  /** 1 weak · 2 okay · 3 solid */
  rating: 1 | 2 | 3
  updatedAt: number
  deviceId: string
}

/** FSRS review card. Runs on-device, syncs when online. */
export interface Review {
  code: string
  /** ISO timestamp. */
  due: string
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: number
  lastReviewAt?: number
  updatedAt: number
}

export type AnswerMode = 'text' | 'voice'

export interface Answer {
  code: string
  mode: AnswerMode
  transcript?: string
  /** Scores 0–100. */
  fluency?: number
  pronunciation?: number
  content?: number
  feedback?: SpeakingFeedback
  audioBlobId?: string
  updatedAt: number
}

export interface SpeakingFeedback {
  fluency: string
  clarity: string
  structure: string
  grammar: string[]
  mispronounced: string[]
  better: string
  practice: string[]
  tip: string
}

export interface AudioAsset {
  /** `${code}|${lang}|${mode}` */
  id: string
  code: string
  lang: Lang
  /** en | mix | all */
  mode: 'en' | 'mix' | 'all'
  url: string
  durationMs?: number
  bytes?: number
  /** Segment timings for transcript highlighting. */
  segments?: AudioSegment[]
  cachedAt: number
}

export interface AudioSegment {
  lang: Lang
  text: string
  start: number
  end: number
}

export interface MockTurn {
  role: 'q' | 'me' | 'eval'
  text: string
  eval?: MockEval
  at: number
}

export interface MockEval {
  score: number
  verdict: string
  strengths: string[]
  missing: string[]
  better: string
  follow_up: string
  tip: string
}

export interface MockSession {
  id: string
  persona: string
  focus: string
  /** flashcard = self-rated, ai = graded by the model. */
  mode: 'ai' | 'flash'
  codes: string[]
  turns: MockTurn[]
  scorecard?: Scorecard
  at: number
}

export interface Scorecard {
  overall: number
  technical: number
  communication: number
  confidence: number
  verdict: string
  strengths: string[]
  risks: string[]
  tip: string
}

export interface JdPlan {
  id: string
  raw: string
  title?: string
  techs: string[]
  niceTechs: string[]
  seniority?: string
  groups: JdGroup[]
  ai?: JdPack
  at: number
}

export interface JdGroup {
  tech: string
  codes: string[]
}

export interface JdPack {
  summary: string
  rounds: string[]
  qas: { q: string; a: string }[]
  gaps: string[]
  stories: string[]
  questions: string[]
  pitch: string
  redFlags: string[]
  at: number
}

export interface ExplainEntry {
  /** `${code}|x|lang|focus|style` */
  id: string
  code: string
  lang: Lang
  focus: 'concept' | 'code' | 'both'
  style: 'simple' | 'interview' | 'deep'
  markdown: string
  updatedAt: number
}

export interface OutboxItem {
  id?: number
  type: string
  payload: unknown
  createdAt: number
  tries: number
}

export interface Story {
  id: string
  competency: string
  situation: string
  task: string
  action: string
  result: string
  spoken30?: string
  spoken90?: string
  updatedAt: number
}

export interface ImportRecord {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  sections: string[]
  code: string[]
  categories: ImportCategory[]
  at: number
}

export interface ImportCategory {
  name: string
  qas: { q: string; a: string }[]
}

export interface Profile {
  name: string
  email: string
  role: string
  years: string
  about: string
}

/** Audio settings, ported from the v7 `S.au` object. */
export interface AudioSettings {
  /** en | mix | all */
  mode: 'en' | 'mix' | 'all'
  rate: number
  /** Silence before the answer, ms. */
  gap: number
  /** Questions only (skip the explanation). */
  qonly: boolean
  /** Speak English tech words with the English voice. */
  splitEn: boolean
  voiceEn: string
  voiceUr: string
  voiceHi: string
  auto: boolean
  loop: boolean
  /** Repeat the key line and hook after the explanation. */
  mem: boolean
  /** South Asian | US | UK */
  acc: 'in' | 'us' | 'gb'
  sleep: number
  prefetch: boolean
}

export interface SpeakingState {
  days: Record<string, Record<string, 1>>
  best: Record<string, number>
  ans: Record<string, Answer>
  focus: 'vw' | 'th' | 'sc' | 'ed' | 'vow' | 'stress'
  listener: string
  model: 'us' | 'gb'
  tab: 'today' | 'calm' | 'sounds' | 'shadow' | 'speak' | 'phrases'
  check: Record<string, 1>
  shadowQ: string[]
  src: 'core' | 'bank'
  pressure: boolean
  written: boolean
}

export interface UserSettings {
  lang: Lang
  theme: 'auto' | 'light' | 'dark'
  au: AudioSettings
  sp: SpeakingState
  hiddenTechs: string[]
  customTechs: string[]
  bannerOff: boolean
  /** Where the AI calls go: own keys, or the Laravel server. */
  aiMode: 'client' | 'server'
  serverUrl: string
  profile: Profile
}
