/** Offline-first, account-scoped sync. Local writes stay in Dexie/outbox. */
import { db } from './db'
import { serverUrl } from './ai'

const SYNCED = ['ratings', 'reviews', 'answers', 'stories', 'questions', 'translations', 'settings', 'communityVote'] as const
let flushing = false
let timer: number | null = null

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export async function queue(type: string, payload: unknown) {
  await db.outbox.add({ type, payload, createdAt: Date.now(), tries: 0 })
  scheduleFlush()
}

function scheduleFlush() {
  if (timer) return
  timer = window.setTimeout(() => { timer = null; void flush() }, 1500)
}

export async function flush(): Promise<{ sent: number; received: number }> {
  if (flushing || !isOnline() || !localStorage.getItem('ibx-active-account')) return { sent: 0, received: 0 }
  flushing = true
  let sent = 0
  let received = 0
  try {
    const items = await db.outbox.orderBy('createdAt').limit(200).toArray()
    const res = await fetch('/api/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        device_id: (await getDeviceId()) || undefined,
        items: items.map((i) => ({ id: i.id, type: i.type, payload: i.payload })),
      }),
    })
    if (res.status === 401) return { sent: 0, received: 0 }
    if (!res.ok) throw new Error(`sync ${res.status}`)
    const data = await res.json()
    const acked: number[] = data.acked || []
    if (acked.length) await db.outbox.bulkDelete(acked)
    sent = acked.length
    if (Array.isArray(data.changes)) {
      await applyChanges(data.changes)
      received = data.changes.length
    }
  } catch {
    const items = await db.outbox.orderBy('createdAt').limit(200).toArray()
    for (const i of items) if (i.id) await db.outbox.update(i.id, { tries: i.tries + 1 })
  } finally {
    flushing = false
  }
  return { sent, received }
}

export async function applyChanges(rows: { table: string; row: any }[]) {
  for (const { table, row } of rows) {
    if (!(SYNCED as readonly string[]).includes(table)) continue
    const t = (db as any)[table]
    if (!t) continue
    const key = (row.code ?? row.id ?? row.key) as string
    if (!key) continue
    const local = await t.get(key)
    if (!local || (row.updatedAt || 0) >= (local.updatedAt || 0)) await t.put(row)
  }
}

/** Legacy Laravel content endpoints remain available for users who configured them. */
export async function pullBank(updatedSince?: number): Promise<number> {
  if (!serverUrl()) return 0
  const qs = updatedSince ? `?updated_since=${updatedSince}` : ''
  const res = await fetch(`${serverUrl()}/api/v1/questions${qs}`)
  if (!res.ok) throw new Error(`server ${res.status}`)
  const data = await res.json()
  const rows: any[] = data.data || []
  if (rows.length) await db.questions.bulkPut(rows)
  return rows.length
}
export async function pullTranslations(lang: string, updatedSince?: number): Promise<number> {
  if (!serverUrl()) return 0
  const qs = new URLSearchParams({ lang })
  if (updatedSince) qs.set('updated_since', String(updatedSince))
  const res = await fetch(`${serverUrl()}/api/v1/translations?${qs}`)
  if (!res.ok) throw new Error(`server ${res.status}`)
  const data = await res.json()
  const rows: any[] = data.data || []
  if (rows.length) await db.translations.bulkPut(rows.map((r) => ({ ...r, id: `${r.code}|${r.lang}`, t: Date.now() })))
  return rows.length
}

export function startSync() {
  if (typeof window === 'undefined') return () => {}
  const onOnline = () => void flush()
  window.addEventListener('online', onOnline)
  void flush()
  return () => window.removeEventListener('online', onOnline)
}

let devPromise: Promise<string> | null = null
async function getDeviceId(): Promise<string> {
  if (!devPromise) devPromise = (async () => (await import('./db')).deviceId())()
  return devPromise
}
export async function pendingCount(): Promise<number> { return db.outbox.count() }
