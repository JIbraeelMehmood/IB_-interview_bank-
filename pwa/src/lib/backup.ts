/** Backup and restore.
 *
 *  Two formats are supported on import:
 *   1. The v7 backup: `{app:'interview-box', v:1, at, state:S}`.
 *   2. The 2.0 backup: the same envelope plus `translations`, so nothing the
 *      user spent AI calls on is lost (v7 left translations out of the backup).
 */

import { db, deviceId, TR_LIMIT } from './db'
import type { Lang, Translation } from './types'
import { DEFAULT_SETTINGS, useSettings } from './settings'

export interface Backup {
  app: 'interview-box'
  /** Format version: 1 = v7, 2 = this build. */
  v: 1 | 2
  at: number
  state: Record<string, any>
  /** Present from v2. */
  translations?: Translation[]
  counts?: Record<string, number>
}

/** Build a full backup, including translations. */
export async function makeBackup(includeTranslations = true): Promise<Backup> {
  const settings = useSettings.getState().settings
  const [questions, ratings, reviews, answers, stories, mocks, jds, imports, explains] =
    await Promise.all([
      db.questions.toArray(),
      db.ratings.toArray(),
      db.reviews.toArray(),
      db.answers.toArray(),
      db.stories.toArray(),
      db.mocks.toArray(),
      db.jds.toArray(),
      db.imports.toArray(),
      db.explains.toArray(),
    ])

  // Only user-added questions, not the 1,950 built-in ones.
  const ownQuestions = questions.filter((q) => q.s !== 'b' && q.s !== 'n')
  const state: Record<string, any> = {
    settings,
    ownQuestions,
    ratings,
    reviews,
    answers,
    stories,
    mocks,
    jds,
    imports,
    explains,
    device: deviceId(),
  }

  const backup: Backup = {
    app: 'interview-box',
    v: 2,
    at: Date.now(),
    state,
    counts: {
      questions: ownQuestions.length,
      ratings: ratings.length,
      reviews: reviews.length,
      answers: answers.length,
      stories: stories.length,
    },
  }
  if (includeTranslations) backup.translations = await db.translations.toArray()
  return backup
}

export function backupText(backup: Backup): string {
  return JSON.stringify(backup, null, 1)
}

/** Trigger a file download without a server. */
export function download(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}


/** Read a backup file or pasted text. Handles both formats. */
export async function importBackup(text: string): Promise<ImportResult> {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, format: 0, message: 'That file is not valid JSON.' }
  }
  if (data?.app !== 'interview-box') {
    return { ok: false, format: 0, message: 'That is not an Interview Box backup.' }
  }

  const s = data.state || {}
  const isV1 = !data.translations && !s.settings

  const ownQuestions = s.ownQuestions || s.my || []
  const ratings = s.ratings || []
  const reviews = s.reviews || []
  const answers = s.answers || []
  const stories = s.stories || []
  const mocks = s.mocks || s.hist || []
  const jds = s.jds || (s.jd ? [s.jd] : [])
  const imports = s.imports || []

  // v7 ratings were a plain `{id: 1|2|3}` map.
  const ratingRows: any[] = Array.isArray(ratings)
    ? ratings
    : Object.entries(ratings).map(([code, rating]) => ({
        code,
        rating,
        updatedAt: Date.now(),
        deviceId: deviceId(),
      }))

  // v7 reviews were `{id: [intervalDays]}` — convert to a due date.
  const reviewRows: any[] = Array.isArray(reviews)
    ? reviews
    : Object.entries(reviews).map(([code, days]) => ({
        code,
        due: new Date(Date.now() + Number(days) * 86_400_000).toISOString(),
        stability: Number(days) || 1,
        difficulty: 5,
        reps: 1,
        lapses: 0,
        state: 2,
        updatedAt: Date.now(),
      }))

  // v7 own questions: `id` → `code`.
  const questionRows = (ownQuestions as any[]).map((q) => ({
    code: q.code || q.id,
    q: q.q || '',
    a: q.a || '',
    l: q.l || 'm',
    p: q.p || 'My questions',
    c: q.c || '',
    f: q.f || '',
    t: q.t || [],
    s: q.s || 'my',
    cat: q.cat,
    src: q.src,
    ex: q.ex,
    tr: q.tr,
    search: `${q.q || ''} ${q.a || ''}`.toLowerCase(),
    updatedAt: q.updatedAt || Date.now(),
  }))

  try {
    await db.transaction(
      'rw',
      [
        db.questions,
        db.ratings,
        db.reviews,
        db.answers,
        db.stories,
        db.mocks,
        db.jds,
        db.imports,
        db.translations,
        db.explains,
        db.settings,
      ],
      async () => {
        if (questionRows.length) await db.questions.bulkPut(questionRows)
        if (ratingRows.length) await db.ratings.bulkPut(ratingRows)
        if (reviewRows.length) await db.reviews.bulkPut(reviewRows)
        if (answers.length) await db.answers.bulkPut(answers)
        if (stories.length) await db.stories.bulkPut(stories)
        if (mocks.length) await db.mocks.bulkPut(mocks)
        if (jds.length) await db.jds.bulkPut(jds)
        if (imports.length) await db.imports.bulkPut(imports)
        if (Array.isArray(data.translations) && data.translations.length) {
          await db.translations.bulkPut(
            data.translations.map((t: Translation) => ({ ...t, t: t.t || Date.now() })),
          )
        }
        if (s.settings) await db.settings.put({ key: 'main', ...s.settings, updatedAt: Date.now() })
      },
    )
  } catch (e) {
    return {
      ok: false,
      format: isV1 ? 1 : 2,
      message: `Could not write the backup: ${(e as Error).message}`,
    }
  }

  return {
    ok: true,
    format: isV1 ? 1 : 2,
    message: isV1
      ? 'Old backup imported. Ratings and review dates came across; the old file had no translations.'
      : 'Backup imported.',
    counts: {
      questions: questionRows.length,
      ratings: ratingRows.length,
      reviews: reviewRows.length,
      answers: answers.length,
      translations: data.translations?.length || 0,
    },
  }
}

/** Wipe user data but keep the built-in bank. */
export async function resetProgress(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.ratings,
      db.reviews,
      db.answers,
      db.stories,
      db.mocks,
      db.jds,
      db.imports,
      db.explains,
      db.translations,
      db.audio,
      db.outbox,
    ],
    async () => {
      await db.ratings.clear()
      await db.reviews.clear()
      await db.answers.clear()
      await db.stories.clear()
      await db.mocks.clear()
      await db.jds.clear()
      await db.imports.clear()
      await db.explains.clear()
      await db.translations.clear()
      await db.audio.clear()
      await db.outbox.clear()
      await db.questions.filter((q) => q.s !== 'b' && q.s !== 'n').delete()
    },
  )
  await db.settings.put({ key: 'main', ...structuredClone(DEFAULT_SETTINGS), updatedAt: Date.now() })
}

export function backupFilename(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `interview-box-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
}

export interface ImportResult {
  ok: boolean
  format: 1 | 2 | 0
  message: string
  counts?: Record<string, number>
}

/* ---------------- translation packs (v7 feature, kept) -------------- */

export interface TrPack {
  app: 'interview-box'
  kind: 'translations'
  at: number
  tr: Record<string, Omit<Translation, 'id' | 'code' | 'lang' | 't' | 'updatedAt'> & { t?: number }>
}

/** Export saved translations so they can move to another device offline. */
export async function makeTranslationPack(
  filter?: (t: Translation) => boolean,
): Promise<TrPack> {
  const all = filter ? (await db.translations.toArray()).filter(filter) : await db.translations.toArray()
  const tr: TrPack['tr'] = {}
  for (const t of all) {
    const { id, code, lang, updatedAt, ...rest } = t
    void id
    void code
    void lang
    void updatedAt
    tr[`${code}|${lang}`] = rest
  }
  return { app: 'interview-box', kind: 'translations', at: Date.now(), tr }
}

export async function importTranslationPack(text: string): Promise<number> {
  const data = JSON.parse(text)
  if (data?.kind !== 'translations' || !data.tr) throw new Error('Not a translation pack.')
  const rows: Translation[] = []
  for (const [key, val] of Object.entries<any>(data.tr)) {
    const [code, lang] = key.split('|')
    if (!code || !['ur', 'ru', 'hi'].includes(lang)) continue
    const existing = await db.translations.get(key)
    // An AI or hand-written translation always beats a machine one.
    if (existing && !existing.mt) continue
    rows.push({
      ...(val as object),
      id: key,
      code,
      lang: lang as Lang,
      t: Date.now(),
      updatedAt: Date.now(),
    })
  }
  if (rows.length) await db.translations.bulkPut(rows)
  return rows.length
}

/** Delete translations made with older rules or by a machine, so they re-run. */
export async function upgradeOldTranslations(currentRules = 3): Promise<number> {
  const all = await db.translations.toArray()
  const stale = all.filter((t) => !t.builtin && (t.mt || (t.rules || 0) < currentRules))
  if (stale.length) await db.translations.bulkDelete(stale.map((t) => t.id))
  return stale.length
}

export { TR_LIMIT }
