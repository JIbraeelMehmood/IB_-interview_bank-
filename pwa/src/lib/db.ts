import Dexie, { type Table } from 'dexie'
import type {
  Answer,
  AudioAsset,
  ExplainEntry,
  ImportRecord,
  JdPlan,
  MockSession,
  OutboxItem,
  Profile,
  Question,
  Rating,
  Review,
  Story,
  Translation,
  UserSettings,
} from './types'

/** Settings are a single row keyed 'main'. */
export interface SettingsRow extends UserSettings {
  key: string
  updatedAt: number
}

/** Small key/value store for things that are not worth a table. */
export interface KVRow {
  key: string
  value: unknown
}

class InterviewBoxDB extends Dexie {
  questions!: Table<Question, string>
  translations!: Table<Translation, string>
  ratings!: Table<Rating, string>
  reviews!: Table<Review, string>
  answers!: Table<Answer, string>
  audio!: Table<AudioAsset, string>
  explains!: Table<ExplainEntry, string>
  mocks!: Table<MockSession, string>
  jds!: Table<JdPlan, string>
  stories!: Table<Story, string>
  imports!: Table<ImportRecord, string>
  outbox!: Table<OutboxItem, number>
  settings!: Table<SettingsRow, string>
  kv!: Table<KVRow, string>

  constructor() {
    super('interview-box')
    this.version(1).stores({
      questions: 'code, part, level, *t, s, updatedAt',
      translations: '[code+lang], lang, updatedAt, t',
      ratings: 'code, rating, updatedAt',
      reviews: 'code, due',
      answers: 'code, updatedAt',
      audio: 'id, code, lang, mode, cachedAt',
      explains: 'id, code, lang, updatedAt',
      mocks: 'id, at',
      jds: 'id, at',
      stories: 'id, updatedAt',
      imports: 'id, at',
      outbox: '++id, type, createdAt',
      settings: 'key',
      kv: 'key',
    })
  }
}

export const db = new InterviewBoxDB()

/** Cap on cached translations, mirroring the v7 IndexedDB pruning rule. */
export const TR_LIMIT = 3000

/** A stable per-device id, used for sync conflict hints. */
export function deviceId(): string {
  try {
    const k = 'ibx-device'
    let v = localStorage.getItem(k)
    if (!v) {
      v = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return 'd-memory'
  }
}
