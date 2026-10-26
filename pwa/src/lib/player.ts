/** The audio player queue. Hands-free listening while travelling:
 *  auto-next, sleep timer, wake lock, and resume after a reload. */

import { create } from 'zustand'
import { db } from './db'
import type { AudioSettings, Lang, Question, Translation } from './types'
import { requestWakeLock, releaseWakeLock, setMediaSession, speakSegments, stopSpeaking, type SpeakSegment } from './speech'
import { getOrTranslate } from './translate'
import { useSettings } from './settings'

export interface PlayerItem {
  code: string
  q: string
  /** Cached translation, loaded up front so playback never waits. */
  tr?: Translation | null
}

interface PlayerState {
  queue: PlayerItem[]
  index: number
  playing: boolean
  segIndex: number
  label: string
  lang: Lang
  prepared: boolean
  load(codes: string[], opts?: { label?: string; lang?: Lang; questions?: Question[] }): Promise<void>
  play(): Promise<void>
  pause(): void
  toggle(): Promise<void>
  next(): Promise<void>
  prev(): Promise<void>
  seek(i: number): Promise<void>
  stop(): void
}

let abort: AbortController | null = null
let sleepTimer: number | null = null

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  playing: false,
  segIndex: -1,
  label: '',
  lang: 'en',
  prepared: false,

  async load(codes, opts = {}) {
    const lang = opts.lang ?? useSettings.getState().settings.lang
    stopSpeaking()
    abort?.abort()
    if (sleepTimer) clearTimeout(sleepTimer)

    const rows = await db.questions.bulkGet(codes)
    const items: PlayerItem[] = []
    for (let i = 0; i < codes.length; i++) {
      const q = rows[i]
      if (!q) continue
      items.push({ code: q.code, q: q.q, tr: opts.questions?.find((x) => x.code === q.code) ? undefined : undefined })
    }
    set({ queue: items, index: 0, label: opts.label || 'Listen', lang, prepared: false, segIndex: -1 })
    await persist(items, 0, opts.label || 'Listen')
  },

  async play() {
    const { queue, index, lang } = get()
    if (!queue.length) return
    const au = useSettings.getState().settings.au
    set({ playing: true })
    void requestWakeLock()
    await playFrom(index, au, lang)
  },

  pause() {
    stopSpeaking()
    set({ playing: false, segIndex: -1 })
    void releaseWakeLock()
  },

  async toggle() {
    if (get().playing) get().pause()
    else await get().play()
  },

  async next() {
    const { queue, index } = get()
    if (au().loop && queue.length) return seekTo((index + 1) % queue.length)
    if (index + 1 >= queue.length) {
      get().pause()
      return
    }
    return seekTo(index + 1)
  },

  async prev() {
    const { index } = get()
    return seekTo(Math.max(0, index - 1))
  },

  async seek(i) {
    return seekTo(i)
  },

  stop() {
    stopSpeaking()
    if (sleepTimer) clearTimeout(sleepTimer)
    set({ queue: [], index: 0, playing: false, prepared: false })
    void releaseWakeLock()
    void db.kv.put({ key: 'player', value: null })
  },
}))

const au = () => useSettings.getState().settings.au

async function seekTo(i: number) {
  const { queue } = usePlayer.getState()
  if (i < 0 || i >= queue.length) return
  stopSpeaking()
  usePlayer.setState({ index: i, segIndex: -1, prepared: false })
  await persist(queue, i, usePlayer.getState().label)
  if (usePlayer.getState().playing) await playFrom(i, au(), usePlayer.getState().lang)
}

/** Build the segment list for one question, in the v7 order:
 *  question → think time → explanation → key line → hook (repeated in
 *  memorise mode). */
async function buildSegments(item: PlayerItem, settings: AudioSettings, lang: Lang): Promise<SpeakSegment[]> {
  const segs: SpeakSegment[] = []
  const q = await db.questions.get(item.code)

  // Resolve the translation while the English question is already playing.
  let trPromise: Promise<Translation | null> | null = null
  if (lang !== 'en' && item.tr) {
    trPromise = Promise.resolve(item.tr)
  } else if (lang !== 'en' && q) {
    trPromise = getOrTranslate(q, lang, { prefer: 'auto' }).then((r) => r.entry)
  }

  segs.push({ lang: 'en', text: item.q })

  if (settings.qonly) {
    if (trPromise) await trPromise
    return segs
  }

  const tr = trPromise ? await trPromise : null

  if (settings.gap) segs.push({ lang: 'en', text: '', gap: settings.gap })

  if (tr) {
    const explain = settings.mode === 'en' ? q?.a : tr.say || tr.a || ''
    if (explain) segs.push({ lang: settings.mode === 'en' ? 'en' : lang, text: explain })
  } else if (q && settings.mode !== 'all') {
    // No translation available: read the English answer rather than going quiet.
    segs.push({ lang: 'en', text: stripTags(q.a) })
  }

  const key = tr?.key
  if (key) segs.push({ lang: 'en', text: key })
  if (tr?.hook) segs.push({ lang, text: tr.sayhook || tr.hook })

  if (settings.mem) {
    // Memorise mode: repeat the key line and the hook.
    if (key) segs.push({ lang: 'en', text: key })
    if (tr?.hook) segs.push({ lang, text: tr.sayhook || tr.hook })
  }
  return segs.filter((s) => s.text || s.gap)
}

function stripTags(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function playFrom(i: number, settings: AudioSettings, lang: Lang) {
  const { queue, label } = usePlayer.getState()
  const item = queue[i]
  if (!item) return
  abort?.abort()
  abort = new AbortController()

  setMediaSession(item.q, true, () => void usePlayer.getState().next(), () => void usePlayer.getState().prev())

  const segs = await buildSegments(item, settings, lang)
  usePlayer.setState({ prepared: true })

  // Prefetch the next two items' translations (v7 behaviour).
  if (settings.prefetch) {
    for (const nxt of queue.slice(i + 1, i + 3)) {
      const q = await db.questions.get(nxt.code)
      if (q && lang !== 'en') void getOrTranslate(q, lang, { prefer: 'auto', signal: abort.signal })
    }
  }

  await speakSegments(segs, settings, {
    onSegment: (n) => usePlayer.setState({ segIndex: n }),
    onDone: () => {
      if (abort?.signal.aborted) return
      // Sleep timer stops the chain.
      if (settings.sleep > 0) {
        clearTimeout(sleepTimer!)
        sleepTimer = window.setTimeout(() => {
          usePlayer.getState().pause()
        }, settings.sleep * 60_000)
      }
      void usePlayer.getState().next()
    },
  })
  void label
}

async function persist(queue: PlayerItem[], index: number, label: string) {
  try {
    await db.kv.put({ key: 'player', value: { codes: queue.map((q) => q.code), index, label } })
  } catch {
    /* ignore */
  }
}

/** Restore the last list after a reload (v7 "resume last list"). */
export async function restorePlayer(): Promise<boolean> {
  const row = await db.kv.get('player')
  const v = row?.value as { codes: string[]; index: number; label: string } | null
  if (!v?.codes?.length) return false
  const rows = await db.questions.bulkGet(v.codes)
  const items: PlayerItem[] = []
  for (let i = 0; i < v.codes.length; i++) {
    if (rows[i]) items.push({ code: rows[i]!.code, q: rows[i]!.q })
  }
  if (!items.length) return false
  usePlayer.setState({
    queue: items,
    index: Math.min(v.index || 0, items.length - 1),
    label: v.label || 'Listen',
  })
  return true
}
