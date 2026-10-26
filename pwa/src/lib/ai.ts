/** AI gateway. One interface, many providers.
 *
 *  Two modes:
 *   - `client`: the browser calls a provider directly with the user's own key
 *     (the v7 behaviour), so the app still works with no backend.
 *   - `server`: calls the Laravel API, which holds keys server-side and picks
 *     the model per task. This is the 2.0 default when a server is configured.
 *
 *  Provider keys live in localStorage under `ibx-keys` and are never part of a
 *  backup, matching the v7 rule.
 */

import { callProvider, claudeJson } from './providers'

export type ProviderId = 'server' | 'puter' | 'claude' | 'gemini' | 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'custom'

export interface Provider {
  id: ProviderId
  name: string
  cost: string
  /** Shown in the AI Connect sheet. */
  note?: string
  /** Where to get a key, shown as a one-tap link. */
  keyUrl?: string
  /** Default model id. */
  model?: string
  base?: string
  /** Needs a key before it can be used. */
  needsKey?: boolean
  /** Works without a key once signed in. */
  account?: boolean
  /** Best for Urdu/Hindi translation. */
  translation?: boolean
}

const KEYS = 'ibx-keys'

/** NOTE: `puter` appears once. v7 declared it twice in the same object literal
 *  and the second silently won — this is the fix. */
export const PROVIDERS: Record<ProviderId, Provider> = {
  server: {
    id: 'server',
    name: 'Interview Box server',
    cost: 'Included',
    note: 'Keys stay on your own Laravel server. Nothing is stored in the browser.',
  },
  puter: {
    id: 'puter',
    name: 'My account (email sign-in)',
    cost: 'Free allowance',
    account: true,
    note: 'Sign in once with a free account. No key needed. Works in your own copy with internet.',
  },
  claude: {
    id: 'claude',
    name: 'Claude (inside the Claude app)',
    cost: 'Free with your Claude login',
    note: 'Only available when this page runs inside the Claude app or claude.ai.',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    cost: 'Free tier — no card',
    keyUrl: 'https://aistudio.google.com/apikey',
    model: 'gemini-flash-latest',
    base: 'https://generativelanguage.googleapis.com/v1beta',
    needsKey: true,
    translation: true,
    note: 'Recommended for Urdu and Hindi translation.',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    cost: 'Free tier',
    keyUrl: 'https://console.groq.com/keys',
    model: 'llama-3.3-70b-versatile',
    base: 'https://api.groq.com/openai/v1',
    needsKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    cost: 'Free models available',
    keyUrl: 'https://openrouter.ai/keys',
    model: 'openai/gpt-4o-mini',
    base: 'https://openrouter.ai/api/v1',
    needsKey: true,
    note: 'One account gives free models plus GPT, Claude, Gemini and Qwen.',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    cost: 'Paid',
    keyUrl: 'https://platform.openai.com/api-keys',
    model: 'gpt-4o-mini',
    base: 'https://api.openai.com/v1',
    needsKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic API',
    cost: 'Paid',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    model: 'claude-3-5-sonnet-latest',
    base: 'https://api.anthropic.com/v1',
    needsKey: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom (Ollama, LM Studio, any OpenAI-compatible)',
    cost: 'Free if local',
    base: 'http://localhost:11434/v1',
    model: 'llama3',
    needsKey: false,
    note: 'Runs a model on your own machine.',
  },
}

export interface KeyState {
  keys: Record<string, string>
  models: Record<string, string>
  base: Record<string, string>
  prov: ProviderId
  /** Model used for translation calls. */
  mt: string
  puterOk?: boolean
}

export function keyState(): KeyState {
  let o: Partial<KeyState> = {}
  try {
    o = JSON.parse(localStorage.getItem(KEYS) || '{}') || {}
  } catch {
    o = {}
  }
  return {
    keys: o.keys || {},
    models: o.models || {},
    base: o.base || {},
    prov: o.prov || 'server',
    mt: o.mt || 'auto',
    puterOk: o.puterOk,
  }
}

export function saveKeys(next: KeyState): void {
  try {
    localStorage.setItem(KEYS, JSON.stringify(next))
  } catch {
    /* storage full or blocked — AI still works for this session */
  }
}

export function modelFor(p: ProviderId): string {
  const st = keyState()
  return (st.models[p] || '').trim() || PROVIDERS[p].model || ''
}

export function baseFor(p: ProviderId): string {
  const st = keyState()
  return ((st.base[p] || '').trim() || PROVIDERS[p].base || '').replace(/\/+$/, '')
}

export function keyFor(p: ProviderId): string {
  return keyState().keys[p] || ''
}

/** Is the chosen provider actually usable right now?
 *
 *  Server mode counts as ready only when a server address is actually set —
 *  otherwise the header would claim "AI ready" and every call would fail with
 *  "no server configured". */
export function aiReady(): boolean {
  const st = keyState()
  const p = st.prov
  if (p === 'server') return serverConfigured()
  if (p === 'claude') return typeof (window as unknown as { claude?: unknown }).claude !== 'undefined'
  if (p === 'puter') return !!st.puterOk
  if (PROVIDERS[p].needsKey) return !!keyFor(p)
  // Custom/local endpoints are usable with no key at all.
  return true
}

/** Has the user connected anything at all? Used to show first-run guidance. */
export function aiConfigured(): boolean {
  const st = keyState()
  if (st.prov !== 'server') return aiReady()
  return serverConfigured()
}

/** Human-readable reason AI is unavailable, for setup cards. */
export function aiWhy(): string {
  const st = keyState()
  const p = st.prov
  if (aiReady()) return ''
  if (p === 'server')
    return 'No server is set. Add your Laravel address in AI Connect, or pick a provider you have a key for.'
  if (p === 'claude') return 'Claude is only available inside the Claude app. Open the app, or connect another provider.'
  if (p === 'puter') return 'Sign in once with a free account to turn AI on.'
  if (PROVIDERS[p].needsKey) return `Add your ${PROVIDERS[p].name} key to turn AI on.`
  return 'AI is not connected yet.'
}

/** Can we reach the configured server? Used to warn when a key exists but the
 *  server is unreachable, which is the most confusing failure mode. */
export async function aiPing(): Promise<boolean> {
  if (keyState().prov === 'server') {
    if (!serverConfigured()) return false
    try {
      const res = await fetch(`${serverUrl()}/api/v1/me`, { credentials: 'include' })
      return res.ok || res.status === 401
    } catch {
      return false
    }
  }
  return aiReady()
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type Task = 'quick' | 'translate' | 'grade' | 'explain' | 'interview' | 'chat'

export interface AiOptions {
  task?: Task
  model?: string
  /** Abort the request. */
  signal?: AbortSignal
  /** Called with each token for streaming UIs. */
  onText?: (chunk: string, full: string) => void
  json?: boolean
}

export class AiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'AiError'
  }
}

/* ------------------------------------------------------------------ *
 * Server address (kept here so providers.ts can import it without a cycle)
 * ------------------------------------------------------------------ */

export function serverUrl(): string {
  try {
    return (localStorage.getItem('ibx-server') || '').replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export function setServerUrl(url: string): void {
  try {
    localStorage.setItem('ibx-server', url.replace(/\/+$/, ''))
  } catch {
    /* storage blocked — the server field simply will not persist */
  }
}

export const serverConfigured = () => !!serverUrl()

/** Send a prompt through whichever provider is configured. */
export const aiText = callProvider

/** Ask for JSON and parse it loosely (models wrap JSON in prose or fences). */
export async function aiJson<T = unknown>(prompt: string, opts: AiOptions = {}): Promise<T> {
  if (keyState().prov === 'claude' && !serverConfigured()) {
    const rt = claudeJson(prompt)
    if (rt) return (await rt) as T
  }
  const wrapped = `${prompt}\n\nReply with JSON only. No prose, no markdown fences.`
  const text = await aiText(wrapped, { ...opts, json: true })
  return parseJsonLoose<T>(text)
}

/** Pull a JSON value out of a reply that may contain extra text or code fences. */
export function parseJsonLoose<T = unknown>(text: string): T {
  if (!text) throw new AiError('invalid_json', 'The model returned nothing.')
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    /* fall through to scanning for the outermost object or array */
  }
  const firstObj = cleaned.indexOf('{')
  const firstArr = cleaned.indexOf('[')
  let start = -1
  let open = ''
  let close = ''
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) {
    start = firstObj
    open = '{'
    close = '}'
  } else if (firstArr >= 0) {
    start = firstArr
    open = '['
    close = ']'
  }
  if (start < 0) throw new AiError('invalid_json', 'Could not read the reply. Tap again.')
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T
        } catch {
          throw new AiError('invalid_json', 'Could not read the reply. Tap again.')
        }
      }
    }
  }
  throw new AiError('invalid_json', 'Could not read the reply. Tap again.')
}

/** List models a provider offers (used by the Model sheet). */
export async function providerModels(p: ProviderId): Promise<string[]> {
  if (p === 'server') {
    const res = await fetch(`${serverUrl()}/api/v1/ai/models`)
    if (!res.ok) throw new AiError('provider_down', 'Could not reach the server.')
    const data = await res.json()
    return (data.models || []).map((m: any) => (typeof m === 'string' ? m : m.id)).filter(Boolean)
  }
  if (p === 'claude') return ['claude']
  if (p === 'puter') return ['puter.ai.chat']
  const headers: Record<string, string> =
    p === 'anthropic'
      ? { 'x-api-key': keyFor(p), 'anthropic-version': '2023-06-01' }
      : { Authorization: `Bearer ${keyFor(p)}` }
  const res = await fetch(`${baseFor(p)}/models`, { headers })
  if (!res.ok) throw new AiError('bad_key', 'Could not list models. Check the key.')
  const data = await res.json()
  return (data.data || data.models || [])
    .map((m: any) => (typeof m === 'string' ? m : m.id))
    .filter(Boolean)
    .sort()
}

/** Resolve a family to the newest model, for the quick-pick chips. */
export function resolveFamily(list: string[], family: string): string {
  const fams: Record<string, string[]> = {
    gemini: ['gemini'],
    gpt: ['gpt-', 'o1', 'o3'],
    claude: ['claude'],
    qwen: ['qwen'],
    gemma: ['gemma'],
    llama: ['llama'],
    mistral: ['mistral'],
    deepseek: ['deepseek'],
    free: [':free', 'free'],
  }
  const keys = fams[family] || [family]
  const hit = list.filter((m) => keys.some((k) => m.toLowerCase().includes(k)))
  if (!hit.length) return ''
  // Heuristic: a longer id usually means a newer version.
  return hit.sort((a, b) => b.length - a.length)[0]
}

