/** Speech: Web Speech synthesis with the v7 reliability work.
 *
 *  v7 lessons kept here:
 *  - The first words must start inside the user's tap, or mobile browsers
 *    never play them.
 *  - Chunk to ~220 characters; long utterances get cut off by Chrome.
 *  - Keep a reference to the current utterance, or GC takes its events.
 *  - A remote Google voice can hang: watch for silence and retry once.
 *  - Remember voices that failed so we do not pick them again.
 */

import type { AudioSettings, Lang } from './types'
import { enSay, hiSpeech, urSpeech } from './text'
import { serverUrl } from './ai'

export interface SpeakSegment {
  lang: Lang
  text: string
  /** Pause before this segment, ms. */
  gap?: number
  /** Resolve this before speaking (hides translation latency). */
  wait?: Promise<unknown>
}

const CHUNK = 220

let voices: SpeechSynthesisVoice[] = []
let current: SpeechSynthesisUtterance | null = null
let broken = new Set<string>()
let watchdog: number | null = null
let stopped = false

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return
  voices = speechSynthesis.getVoices() || []
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices()
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

/** Raise once if the device exposes speech but has no voice installed, so the UI
 *  can explain the fix instead of appearing to do nothing when Listen is tapped. */
export function voiceProblem(): string {
  if (!ttsAvailable()) return 'This browser has no speech engine. Open the app in Chrome or Edge for audio.'
  if (listVoices().length === 0)
    return 'This device has speech turned on but no voices are installed, so nothing can be read aloud. See Help → Audio for how to add one.'
  return ''
}

export function ttsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
}

/** Voice loading is async on some browsers, so give it a moment. */
let voicesWait: Promise<SpeechSynthesisVoice[]> | null = null
export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (voicesWait) return voicesWait
  voicesWait = new Promise((resolve) => {
    if (!ttsAvailable()) return resolve([])
    const first = listVoices()
    if (first.length) return resolve(first)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(listVoices())
    }
    // Some browsers populate on a tick; poll briefly, then give up.
    let n = 0
    const t = setInterval(() => {
      n++
      if (listVoices().length || n > 20) {
        clearInterval(t)
        finish()
      }
    }, 100)
    setTimeout(() => {
      clearInterval(t)
      finish()
    }, 2500)
  })
  return voicesWait
}

/** A device can expose the speech API but have no voice installed at all. */
export async function hasAnyVoice(): Promise<boolean> {
  if (!ttsAvailable()) return false
  return (await whenVoicesReady()).length > 0
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!voices.length) loadVoices()
  return voices
}

const baseLang = (v: SpeechSynthesisVoice) => (v.lang || '').toLowerCase().replace('_', '-')

/** Preference order for a language. Urdu falls back to Hindi. */
const PREF: Record<Lang, string[]> = {
  en: ['en-in', 'en-gb', 'en-us', 'en'],
  ur: ['ur-pk', 'ur-in', 'hi-in', 'hi-pk', 'ur', 'hi'],
  ru: ['en-in', 'en-us', 'en-gb', 'en'],
  hi: ['hi-in', 'hi-pk', 'hi'],
}

/** Natural / Neural / Online voices first — they sound best. */
function quality(v: SpeechSynthesisVoice): number {
  const n = (v.name || '').toLowerCase()
  if (/natural|neural/.test(n)) return 0
  if (/online|google|siri|microsoft/.test(n)) return 1
  if (/enhanced|premium/.test(n)) return 2
  return 3
}

export function pickVoice(lang: Lang, override?: string): SpeechSynthesisVoice | null {
  const list = listVoices().filter((v) => !broken.has(v.voiceURI))
  if (override) {
    const exact = list.find((v) => v.voiceURI === override || v.name === override)
    if (exact) return exact
  }
  for (const pref of PREF[lang]) {
    const hit = list.filter((v) => baseLang(v).startsWith(pref))
    if (hit.length) return hit.sort((a, b) => quality(a) - quality(b))[0]
  }
  return null
}

export function markBroken(voice: SpeechSynthesisVoice) {
  broken.add(voice.voiceURI)
}

export function resetBrokenVoices() {
  broken = new Set()
}

/** Split long text into speakable chunks on punctuation. */
export function chunkText(text: string, size = CHUNK): string[] {
  const t = String(text || '').trim()
  if (!t) return []
  if (t.length <= size) return [t]
  const out: string[] = []
  let cur = ''
  for (const part of t.split(/(?<=[.!?؟۔,;:])\s+/)) {
    if (cur.length + part.length + 1 <= size) cur += (cur ? ' ' : '') + part
    else {
      if (cur) out.push(cur)
      if (part.length <= size) cur = part
      else {
        for (let i = 0; i < part.length; i += size) out.push(part.slice(i, i + size))
        cur = ''
      }
    }
  }
  if (cur) out.push(cur)
  return out
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function sayOne(text: string, lang: Lang, rate: number, voiceName?: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      if (watchdog) {
        clearTimeout(watchdog)
        watchdog = null
      }
      resolve()
    }
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(lang, voiceName)
    if (v) {
      u.voice = v
      u.lang = v.lang
    } else {
      u.lang = lang === 'ur' ? 'ur-PK' : lang === 'hi' ? 'hi-IN' : 'en-IN'
    }
    u.rate = rate
    u.onend = done
    u.onerror = () => {
      if (v) markBroken(v)
      done()
    }
    current = u
    // Watchdog: remote voices sometimes never fire onend.
    watchdog = window.setTimeout(done, Math.max(8000, text.length * 220))
    try {
      speechSynthesis.speak(u)
    } catch {
      done()
    }
  })
}

export function stopSpeaking() {
  stopped = true
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  current = null
}

/** Speak a list of segments in order, honouring gaps and waits. */
export async function speakSegments(
  segments: SpeakSegment[],
  settings: Partial<AudioSettings>,
  opts: { onSegment?: (i: number) => void; onDone?: () => void } = {},
): Promise<void> {
  stopped = false
  const rate = settings.rate ?? 0.95
  for (let i = 0; i < segments.length; i++) {
    if (stopped) break
    const seg = segments[i]
    if (seg.wait) {
      try {
        await seg.wait
      } catch {
        /* a failed prepare should not abort the whole list */
      }
    }
    if (stopped) break
    if (seg.gap) await sleep(seg.gap)
    if (stopped) break

    // Prepare the text for the voice of the language it is written in.
    let text = seg.text
    if (seg.lang === 'en') text = enSay(text)
    else if (seg.lang === 'ur') text = await urSpeech(text)
    else if (seg.lang === 'hi') text = await hiSpeech(text)

    const voiceName =
      seg.lang === 'en' ? settings.voiceEn : seg.lang === 'ur' ? settings.voiceUr : settings.voiceHi

    // B-05: read the English words with an English voice, the rest in-language.
    if (settings.splitEn && seg.lang !== 'en') {
      for (const run of splitLatinRuns(text)) {
        if (stopped) break
        opts.onSegment?.(i)
        await sayOne(run.text, run.latin ? 'en' : seg.lang, rate, run.latin ? settings.voiceEn : voiceName)
      }
    } else {
      for (const part of chunkText(text)) {
        if (stopped) break
        opts.onSegment?.(i)
        await sayOne(part, seg.lang, rate, voiceName)
      }
    }
  }
  opts.onDone?.()
}

const LATIN = /[A-Za-z][A-Za-z0-9_+#.\-/]*/

function splitLatinRuns(text: string): { text: string; latin: boolean }[] {
  const out: { text: string; latin: boolean }[] = []
  const re = new RegExp(LATIN.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), latin: false })
    out.push({ text: m[0], latin: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), latin: false })
  return out.filter((r) => r.text.trim())
}

/* ------------------------- speech recognition ---------------------- */

type AnyRec = any

export function recognitionAvailable(): boolean {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export interface RecResult {
  text: string
  alts: string[][]
  dur: number
  pauses: number
}

export interface RecHandle {
  stop(): void
}

/**
 * Listen and transcribe. Returns null when the browser has no SpeechRecognition
 * — the caller then falls back to the keyboard's dictation key, which is the
 * v7 behaviour inside in-app WebViews.
 */
export function listen(opts: {
  lang?: string
  continuous?: boolean
  onInterim?: (text: string) => void
  onFinal?: (r: RecResult) => void
  onError?: (code: string) => void
}): RecHandle | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => AnyRec
    webkitSpeechRecognition?: new () => AnyRec
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null

  const r: AnyRec = new Ctor()
  r.lang = opts.lang || 'en-US'
  r.continuous = !!opts.continuous
  r.interimResults = true
  r.maxAlternatives = 3

  const finals: string[] = []
  const alts: string[][] = []
  const t0 = Date.now()
  let last = t0
  let pauses = 0
  let stopped = false
  let ended = false

  r.onresult = (e: AnyRec) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) {
        finals.push(res[0].transcript)
        const al: string[] = []
        for (let j = 0; j < res.length; j++) al.push(res[j].transcript)
        alts.push(al)
      } else interim += res[0].transcript
    }
    const now = Date.now()
    // A gap longer than 2.5 s between results counts as a pause.
    if (now - last > 2500 && finals.length) pauses++
    last = now
    opts.onInterim?.((finals.join(' ') + ' ' + interim).trim())
  }
  r.onerror = (e: AnyRec) => {
    if (e.error === 'no-speech' && opts.continuous && !stopped) return
    if (e.error === 'aborted') return
    opts.onError?.(e.error)
  }
  const finish = () => {
    if (ended) return
    ended = true
    opts.onFinal?.({
      text: finals.join(' ').replace(/\s+/g, ' ').trim(),
      alts,
      dur: (Date.now() - t0) / 1000,
      pauses,
    })
  }
  r.onend = () => {
    if (opts.continuous && !stopped) {
      try {
        r.start()
        return
      } catch {
        /* fall through to finish */
      }
    }
    finish()
  }

  try {
    r.start()
  } catch {
    opts.onError?.('start')
    return null
  }

  return {
    stop() {
      stopped = true
      try {
        r.stop()
      } catch {
        finish()
      }
      setTimeout(finish, 2500)
    },
  }
}

/** Plain-English message for a recognition error code. */
export function recError(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return 'Microphone blocked. Allow the mic for this page, or use your keyboard’s 🎤 key in the text box.'
  if (code === 'network') return 'Speech recognition needs internet.'
  if (code === 'no-speech') return 'I didn’t hear anything — speak a bit louder and closer.'
  if (code === 'audio-capture') return 'No microphone found.'
  return `Mic problem (${code}). You can use your keyboard’s 🎤 dictation instead.`
}

/* --------------------------- media session ------------------------- */

export function setMediaSession(
  title: string,
  playing: boolean,
  onNext: () => void,
  onPrev: () => void,
) {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Interview Box',
      album: 'Interview practice',
    })
    navigator.mediaSession.setActionHandler('nexttrack', onNext)
    navigator.mediaSession.setActionHandler('previoustrack', onPrev)
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch {
    /* not supported in this browser */
  }
}

/** Keep the screen on while listening in a car or on a bus. */
let wakeLock: WakeLockSentinel | null = null

export async function requestWakeLock(): Promise<void> {
  try {
    if ('wakeLock' in navigator) {
      const wl = (navigator as unknown as { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } })
        .wakeLock
      wakeLock = await wl.request('screen')
    }
  } catch {
    /* denied or unsupported — the Help sheet carries the battery tip */
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release()
  } catch {
    /* ignore */
  }
  wakeLock = null
}

/* ========================= Whisper integration ========================= */

/**
 * Returns true if a Whisper endpoint is available.
 * Whisper is served from the configured Laravel server at /api/v1/stt,
 * or from a standalone Whisper server at VITE_WHISPER_URL (env var).
 */
export function whisperAvailable(): boolean {
  return !!(whisperEndpoint())
}

function whisperEndpoint(): string {
  // 1. Explicit standalone Whisper URL saved by the user in AI Connect.
  try {
    const saved = localStorage.getItem('ibx-whisper-url')
    if (saved) return saved.replace(/\/+$/, '')
  } catch { /* localStorage blocked */ }
  // 2. Build-time env var (e.g. VITE_WHISPER_URL=http://localhost:8080)
  const env = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WHISPER_URL
  if (env) return env.replace(/\/+$/, '')
  // 3. Laravel server exposes /api/v1/stt when a server URL is configured.
  const srv = serverUrl()
  if (srv) return `${srv}/api/v1`
  return ''
}

export interface WhisperResult {
  text: string
  language?: string
  duration?: number
}

/**
 * Transcribe an audio Blob via Whisper (server-side).
 *
 * Supports two server shapes:
 * 1. A standalone whisper.cpp / faster-whisper HTTP server at VITE_WHISPER_URL
 *    — sends a multipart POST to /inference with `file`, `response_format=json`.
 * 2. The Laravel API at /api/v1/stt — sends the same multipart form.
 *
 * Automatically determines language from the `lang` parameter, defaulting to
 * English. Pass `lang:'ur'` for Urdu, `lang:'hi'` for Hindi.
 */
export async function whisperTranscribe(
  blob: Blob,
  opts: {
    lang?: string
    /** Override filename hint — helps some servers pick the right decoder. */
    filename?: string
    /** AbortSignal to cancel the upload. */
    signal?: AbortSignal
  } = {},
): Promise<WhisperResult> {
  const base = whisperEndpoint()
  if (!base) throw new Error('Whisper is not configured. Set a server URL in AI Connect, or add VITE_WHISPER_URL.')

  const form = new FormData()
  // Filename with the right extension so ffmpeg detects the codec correctly.
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
  form.append('file', blob, opts.filename || `recording.${ext}`)
  form.append('response_format', 'json')
  // Map our Lang codes to BCP-47 codes Whisper understands.
  const langMap: Record<string, string> = { ur: 'ur', hi: 'hi', ru: 'en', en: 'en' }
  const wLang = langMap[opts.lang || 'en'] || 'en'
  form.append('language', wLang)

  // Standalone whisper.cpp / faster-whisper-server uses /inference
  // Laravel uses /stt — detect by whether the base ends in /api/v1
  const path = base.endsWith('/api/v1') ? `${base}/stt` : `${base}/inference`

  const res = await fetch(path, {
    method: 'POST',
    body: form,
    signal: opts.signal,
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 413) throw new Error('Recording is too large for the server. Try a shorter clip.')
    if (res.status === 503 || res.status === 502) throw new Error('The Whisper server is not running. Start it or use the browser mic instead.')
    throw new Error(`Whisper transcription failed (${res.status}). ${body.slice(0, 120)}`)
  }

  const data = await res.json()
  // Both whisper.cpp and faster-whisper return { text: "..." }
  // The Laravel wrapper returns { transcript: "..." } or { text: "..." }
  const text: string = (data?.text ?? data?.transcript ?? '').trim()
  return {
    text,
    language: data?.language,
    duration: data?.duration,
  }
}

/**
 * Record audio from the microphone and return a Blob.
 * Returns null if the browser doesn't support MediaRecorder or mic is denied.
 */
export async function recordAudio(opts: {
  maxMs?: number
  onStop?: () => void
}): Promise<{ blob: Blob; stop: () => void } | null> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (e) {
    const msg = (e as Error).message || String(e)
    if (msg.includes('denied') || msg.includes('NotAllowed')) {
      throw new Error('Microphone blocked. Allow mic access for this page in your browser settings.')
    }
    throw new Error(`Could not access microphone: ${msg}`)
  }

  // Pick the best supported MIME type.
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
    (t) => MediaRecorder.isTypeSupported(t),
  ) || ''

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  let resolved = false
  const blobPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (!resolved) {
        resolved = true
        resolve(new Blob(chunks, { type: mimeType || 'audio/webm' }))
      }
    }
  })

  recorder.start(250) // collect every 250 ms so we have data even on short clips

  // Auto-stop after maxMs (default 2 minutes) to avoid huge uploads.
  const maxMs = opts.maxMs ?? 120_000
  const autoStop = setTimeout(() => {
    if (recorder.state !== 'inactive') recorder.stop()
    opts.onStop?.()
  }, maxMs)

  return {
    /** Resolves with the recorded audio Blob. */
    blob: await blobPromise,
    stop() {
      clearTimeout(autoStop)
      if (recorder.state !== 'inactive') recorder.stop()
      opts.onStop?.()
    },
  }
}

/**
 * High-level helper: record the user speaking, then transcribe via Whisper.
 *
 * Falls back to the browser Web Speech API when Whisper is not configured,
 * matching the v7 behaviour where the same button worked in both modes.
 *
 * Returns a RecHandle so the caller can call .stop() to end recording early.
 * Results are delivered via the same `onFinal` / `onInterim` callbacks as
 * `listen()`, so existing callers can switch between the two with a single
 * check.
 */
export function listenWithWhisper(opts: {
  lang?: string
  onInterim?: (text: string) => void
  onFinal?: (r: RecResult) => void
  onError?: (msg: string) => void
}): RecHandle | null {
  if (!whisperAvailable()) {
    // Fall back to browser Web Speech API.
    return listen({ ...opts, continuous: false })
  }

  let stopped = false
  const t0 = Date.now()
  let recResult: { blob: Blob; stop: () => void } | null = null
  opts.onInterim?.('🎙️ Recording…')

  // Start recording asynchronously, report errors via onError.
  void (async () => {
    try {
      recResult = await recordAudio({
        maxMs: 120_000,
        onStop: () => opts.onInterim?.(''),
      })
      if (stopped) return
      opts.onInterim?.('⏳ Transcribing…')
      const result = await whisperTranscribe(recResult.blob, {
        lang: opts.lang?.split('-')[0] || 'en',
      })
      opts.onFinal?.({
        text: result.text,
        alts: [[result.text]],
        dur: (Date.now() - t0) / 1000,
        pauses: 0,
      })
    } catch (e) {
      if (!stopped) opts.onError?.((e as Error).message)
    }
  })()

  return {
    stop() {
      stopped = true
      recResult?.stop()
    },
  }
}
