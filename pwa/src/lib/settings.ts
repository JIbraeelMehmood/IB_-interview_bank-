/** Settings + progress store. Settings live in one Dexie row (synced); API keys
 *  live in localStorage under `ibx-keys` and never leave the device. */

import { create } from 'zustand'
import { db, deviceId, type SettingsRow } from './db'
import type { AudioSettings, Lang, SpeakingState, UserSettings } from './types'

export const DEFAULT_AUDIO: AudioSettings = {
  mode: 'mix',
  rate: 0.95,
  gap: 1200,
  qonly: false,
  splitEn: false,
  voiceEn: '',
  voiceUr: '',
  voiceHi: '',
  auto: true,
  loop: false,
  mem: false,
  acc: 'in',
  sleep: 0,
  prefetch: true,
}

export const DEFAULT_SPEAKING: SpeakingState = {
  days: {},
  best: {},
  ans: {},
  focus: 'vw',
  listener: 'en-US',
  model: 'us',
  tab: 'today',
  check: {},
  shadowQ: [],
  src: 'core',
  pressure: false,
  written: false,
}

export const DEFAULT_SETTINGS: UserSettings = {
  lang: 'en',
  theme: 'auto',
  au: DEFAULT_AUDIO,
  sp: DEFAULT_SPEAKING,
  hiddenTechs: [],
  customTechs: [],
  bannerOff: false,
  aiMode: 'server',
  serverUrl: '',
  profile: { name: '', email: '', role: '', years: '', about: '' },
}

/** Fill missing keys in place so a saved reference never goes stale.
 *  (v7 fixed a bug where `au()` returned a new object each call.) */
function withDefaults<T extends object>(value: unknown, defaults: T): T {
  const out = (value && typeof value === 'object' ? value : {}) as Record<string, any>
  const def = defaults as Record<string, any>
  for (const k of Object.keys(def)) {
    if (out[k] === undefined || out[k] === null) {
      out[k] = structuredClone(def[k])
    } else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) {
      out[k] = withDefaults(out[k], def[k])
    }
  }
  return out as T
}

interface SettingsState {
  settings: UserSettings
  loaded: boolean
  init(): Promise<void>
  set(patch: Partial<UserSettings>): void
  setAudio(patch: Partial<AudioSettings>): void
  setSpeaking(patch: Partial<SpeakingState>): void
  setLang(lang: Lang): void
  toggleTheme(): void
}

let saveTimer: number | null = null

export const useSettings = create<SettingsState>((set, get) => ({
  settings: structuredClone(DEFAULT_SETTINGS),
  loaded: false,

  async init() {
    const row = await db.settings.get('main')
    const next = withDefaults(row ? { ...DEFAULT_SETTINGS, ...row } : DEFAULT_SETTINGS, DEFAULT_SETTINGS)
    next.au = withDefaults(row?.au, DEFAULT_AUDIO)
    next.sp = withDefaults(row?.sp, DEFAULT_SPEAKING)
    set({ settings: next, loaded: true })
    applyTheme(next.theme)
  },

  set(patch) {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    queueSave(get().settings)
  },

  setAudio(patch) {
    set((s) => ({ settings: { ...s.settings, au: { ...s.settings.au, ...patch } } }))
    queueSave(get().settings)
  },

  setSpeaking(patch) {
    set((s) => ({ settings: { ...s.settings, sp: { ...s.settings.sp, ...patch } } }))
    queueSave(get().settings)
  },

  setLang(lang) {
    get().set({ lang })
    try {
      document.documentElement.lang = lang === 'ur' ? 'ur' : lang === 'hi' ? 'hi' : 'en'
    } catch {
      /* ignore */
    }
  },

  toggleTheme() {
    const cur = get().settings.theme
    const next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark'
    get().set({ theme: next })
    applyTheme(next)
  },
}))

/** Debounced write (250 ms), matching the v7 save behaviour. */
function queueSave(settings: UserSettings) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    const row: SettingsRow = { key: 'main', ...settings, updatedAt: Date.now() }
    await db.settings.put(row)
  }, 250)
}

export function applyTheme(theme: UserSettings['theme']) {
  try {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ibx-theme', theme)
  } catch {
    /* ignore */
  }
}

export { deviceId }
