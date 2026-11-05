/**
 * TTS Client — bridges the PWA to server/tts_server.py (port 5052).
 *
 * How it works with your system:
 * ──────────────────────────────
 * 1. On app start, checkTtsServer() probes port 5052.
 * 2. If the server is running → all speak() calls go through it.
 *    The server auto-selects the best available engine:
 *      edge-tts → gTTS → Kokoro → Piper → F5-TTS → Bark
 * 3. If the server is NOT running → browser speechSynthesis is used.
 *    Works everywhere (Vercel, mobile) with device-installed voices.
 *
 * The caller never needs to know which engine ran.
 *
 * Engine capabilities exposed by the server:
 *   edge-tts   — best Urdu/Hindi neural voices (online)
 *   gTTS       — Google Translate TTS, 60+ languages (online)
 *   Kokoro-82M — ultra-fast English, offline, no GPU
 *   Piper      — offline Urdu/Hindi/English, no GPU
 *   F5-TTS     — zero-shot voice cloning (GPU)
 *   Bark       — expressive emotions/laughs (GPU)
 *   XTTS v2    — zero-shot cloning via LocalVoice proxy (GPU)
 */

const TTS_SERVER = 'http://localhost:5052'
const LS_KEY_OK  = 'ibx-tts-server-ok'
const LS_KEY_ENG = 'ibx-tts-engines'

let _serverOk: boolean | null = null

export interface TtsEngineInfo {
  id: string
  name: string
  available: boolean
  offline: boolean
  gpu: boolean
  languages: string[]
  quality: string
  install: string
}

export interface TtsServerHealth {
  ok: boolean
  port: number
  engines: Record<string, boolean | string>
}

/** Probe the TTS server and cache the result. */
export async function checkTtsServer(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(`${TTS_SERVER}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const data: TtsServerHealth = await res.json().catch(() => ({ ok: true }))
      _serverOk = data.ok
      try { localStorage.setItem(LS_KEY_OK, data.ok ? '1' : '0') } catch {}
      return data.ok
    }
    _serverOk = false
    return false
  } catch {
    _serverOk = false
    try { localStorage.setItem(LS_KEY_OK, '0') } catch {}
    return false
  }
}

/** Fetch the list of available engines from the server. */
export async function fetchEngines(): Promise<TtsEngineInfo[]> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch(`${TTS_SERVER}/engines`, { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const list: TtsEngineInfo[] = await res.json()
      try { localStorage.setItem(LS_KEY_ENG, JSON.stringify(list)) } catch {}
      return list
    }
  } catch { /* offline */ }
  // Return cached engines if available
  try {
    const cached = localStorage.getItem(LS_KEY_ENG)
    if (cached) return JSON.parse(cached) as TtsEngineInfo[]
  } catch {}
  return []
}

/** Is the local TTS server available? Uses cached value for instant answer. */
export function ttsServerAvailable(): boolean {
  if (_serverOk !== null) return _serverOk
  try { return localStorage.getItem(LS_KEY_OK) === '1' } catch { return false }
}

// ─── Voice types ───────────────────────────────────────────────────────

export type TtsVoice =
  | 'ur-PK-UzmaNeural'    // Urdu female (edge-tts, gTTS, Piper)
  | 'ur-PK-AsadNeural'    // Urdu male
  | 'hi-IN-SwaraNeural'   // Hindi female
  | 'hi-IN-MadhurNeural'  // Hindi male
  | 'en-US-JennyNeural'   // English US neutral
  | 'en-IN-NeerjaNeural'  // English India
  | 'en-GB-SoniaNeural'   // English GB
  | string

export type TtsEngine =
  | 'auto'    // server picks best available
  | 'edge'    // force edge-tts
  | 'gtts'    // force gTTS
  | 'kokoro'  // force Kokoro-82M
  | 'piper'   // force Piper
  | 'f5'      // force F5-TTS (needs GPU + ref audio)
  | 'bark'    // force Bark (needs GPU)
  | 'xtts'    // force XTTS v2 proxy

export interface TtsOptions {
  voice?: TtsVoice
  engine?: TtsEngine     // default: 'auto'
  rate?: string          // edge-tts format: "+10%", "-5%"
  pitch?: string         // edge-tts format: "+5Hz", "-10Hz"
  refAudio?: string      // path to reference .wav for F5-TTS / XTTS cloning
  refText?: string       // what the reference audio says (improves F5 quality)
  signal?: AbortSignal
}

// ─── Main speak() API ──────────────────────────────────────────────────

/**
 * Speak text using the best available TTS engine.
 *
 * Returns an HTMLAudioElement when the server handled it (can pause/stop).
 * Returns null when browser speechSynthesis was used.
 */
export async function speak(text: string, opts: TtsOptions = {}): Promise<HTMLAudioElement | null> {
  if (!text.trim()) return null

  // Try server first
  if (ttsServerAvailable()) {
    try {
      return await speakViaServer(text, opts)
    } catch (err) {
      // Server failed this specific request — fall through to browser
      console.warn('[ttsClient] server failed, using browser TTS:', err)
    }
  }

  // Browser speechSynthesis fallback (works on Vercel, mobile, etc.)
  speakViaBrowser(text, opts)
  return null
}

// ─── Server path ───────────────────────────────────────────────────────

async function speakViaServer(text: string, opts: TtsOptions): Promise<HTMLAudioElement> {
  const body: Record<string, string> = {
    text,
    voice:  opts.voice   ?? 'en-US-JennyNeural',
    engine: opts.engine  ?? 'auto',
    rate:   opts.rate    ?? '+0%',
    pitch:  opts.pitch   ?? '+0Hz',
  }
  if (opts.refAudio) body.ref_audio = opts.refAudio
  if (opts.refText)  body.ref_text  = opts.refText

  const res = await fetch(`${TTS_SERVER}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `TTS server error ${res.status}`)
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true })
  await audio.play()
  return audio
}

// ─── Browser speechSynthesis fallback ─────────────────────────────────

function speakViaBrowser(text: string, opts: TtsOptions): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const utt = new SpeechSynthesisUtterance(text)
  const voice = opts.voice ?? ''

  // Map edge-tts voice names → browser lang + voice selection
  if (voice.startsWith('ur-PK')) {
    utt.lang = 'ur-PK'
    const v = window.speechSynthesis.getVoices().find(
      (v) => v.lang.startsWith('ur') || v.lang.startsWith('pa'),
    )
    if (v) utt.voice = v
  } else if (voice.startsWith('hi-IN')) {
    utt.lang = 'hi-IN'
    const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('hi'))
    if (v) utt.voice = v
  } else if (voice.startsWith('en-GB')) {
    utt.lang = 'en-GB'
    const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en-GB'))
    if (v) utt.voice = v
  } else if (voice.startsWith('en-IN')) {
    utt.lang = 'en-IN'
    const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('en-IN'))
    if (v) utt.voice = v
  } else {
    utt.lang = 'en-US'
  }

  // Convert edge-tts rate format (+10%) → browser rate (0.5–2.0)
  if (opts.rate) {
    const pct = parseInt(opts.rate.replace(/[^-\d]/g, ''), 10) || 0
    utt.rate = Math.max(0.5, Math.min(2.0, 1.0 + pct / 100))
  }

  window.speechSynthesis.speak(utt)
}

// ─── Utility ───────────────────────────────────────────────────────────

/** Stop any playing audio element and browser TTS. */
export function stopTts(audio?: HTMLAudioElement | null): void {
  if (audio) { audio.pause(); audio.currentTime = 0 }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Map an Interview Box language code to a default voice name. */
export function defaultVoiceForLang(lang: string): TtsVoice {
  const map: Record<string, TtsVoice> = {
    ur: 'ur-PK-UzmaNeural',
    ru: 'ur-PK-AsadNeural',   // Roman Urdu → Urdu voice
    hi: 'hi-IN-SwaraNeural',
    en: 'en-US-JennyNeural',
  }
  return map[lang] ?? 'en-US-JennyNeural'
}

/**
 * Pre-generate and cache audio for a batch of questions.
 * Uses the server's /tts/pregenerate endpoint.
 * Useful for building an offline audio bank with Bark or F5-TTS.
 */
export async function pregenerateAudio(
  items: { code: string; text: string; voice?: string }[],
  opts: { engine?: TtsEngine; outputDir?: string } = {},
): Promise<{ done: string[]; failed: string[] }> {
  if (!ttsServerAvailable()) return { done: [], failed: items.map((i) => i.code) }

  const res = await fetch(`${TTS_SERVER}/tts/pregenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items,
      engine: opts.engine ?? 'auto',
      output_dir: opts.outputDir ?? 'generated_audio',
    }),
  })
  if (!res.ok) return { done: [], failed: items.map((i) => i.code) }
  return res.json() as Promise<{ done: string[]; failed: string[] }>
}
