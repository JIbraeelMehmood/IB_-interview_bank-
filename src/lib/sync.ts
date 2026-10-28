/** Offline-first sync. Writes always land in Dexie first and are queued in the
 *  outbox; the loop flushes the queue when the app is online and a server
 *  exists. Conflict rule: last write wins per record, by `updatedAt`. */

import { db } from './db'
import { serverUrl } from './providers'

/** Tables that sync, and how their rows merge. */
const SYNCED = ['ratings', 'reviews', 'answers', 'stories', 'questions', 'translations'] as const

let flushing = false
let timer: number | null = null

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Queue a write for the server. Safe to call when offline. */
export async function queue(type: string, payload: unknown) {
  await db.outbox.add({ type, payload, createdAt: Date.now(), tries: 0 })
  scheduleFlush()
}

function scheduleFlush() {
  if (timer) return
  timer = window.setTimeout(() => {
    timer = null
    void flush()
  }, 1500)
}

/** Push everything queued, then pull anything newer from the server. */
export async function flush(): Promise<{ sent: number; received: number }> {
  if (flushing) return { sent: 0, received: 0 }
  if (!isOnline() || !serverUrl()) return { sent: 0, received: 0 }
  flushing = true
  let sent = 0
  let received = 0
  try {
    const items = await db.outbox.orderBy('createdAt').limit(200).toArray()
    if (items.length) {
      const res = await fetch(`${serverUrl()}/api/v1/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_id: (await getDeviceId()) || undefined,
          items: items.map((i) => ({ id: i.id, type: i.type, payload: i.payload })),
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}) as any)
        const acked: number[] = data.acked || items.map((i) => i.id!)
        await db.outbox.bulkDelete(acked)
        sent = acked.length
        if (Array.isArray(data.changes)) {
          await applyChanges(data.changes)
          received = data.changes.length
        }
      } else if (res.status >= 500) {
        // Server is unwell — keep the queue, try again later.
        for (const i of items) await db.outbox.update(i.id!, { tries: i.tries + 1 })
      }
    }
  } catch {
    /* offline — the queue keeps the work */
  } finally {
    flushing = false
  }
  return { sent, received }
}

/** Merge server rows, keeping the newer `updatedAt` on each conflict. */
export async function applyChanges(rows: { table: string; row: any }[]) {
  for (const { table, row } of rows) {
    if (!(SYNCED as readonly string[]).includes(table)) continue
    const t = (db as any)[table]
    if (!t) continue
    const key = (row.code ?? row.id) as string
    const local = await t.get(key)
    if (!local || (row.updatedAt || 0) >= (local.updatedAt || 0)) {
      await t.put(row)
    }
  }
}

/** Download the bank delta from the server (used to refresh after an update). */
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

/** Fetch translations for a language delta. */
export async function pullTranslations(lang: string, updatedSince?: number): Promise<number> {
  if (!serverUrl()) return 0
  const qs = new URLSearchParams({ lang })
  if (updatedSince) qs.set('updated_since', String(updatedSince))
  const res = await fetch(`${serverUrl()}/api/v1/translations?${qs}`)
  if (!res.ok) throw new Error(`server ${res.status}`)
  const data = await res.json()
  const rows: any[] = data.data || []
  if (rows.length) {
    await db.translations.bulkPut(
      rows.map((r) => ({ ...r, id: `${r.code}|${r.lang}`, t: Date.now() })),
    )
  }
  return rows.length
}

/** Start listening for connectivity so the queue flushes on reconnect. */
export function startSync() {
  if (typeof window === 'undefined') return () => {}
  const onOnline = () => void flush()
  window.addEventListener('online', onOnline)
  void flush()
  return () => window.removeEventListener('online', onOnline)
}

let devPromise: Promise<string> | null = null
async function getDeviceId(): Promise<string> {
  if (!devPromise) {
    devPromise = (async () => {
      const { deviceId } = await import('./db')
      return deviceId()
    })()
  }
  return devPromise
}

/** How many writes are waiting. */
export async function pendingCount(): Promise<number> {
  return db.outbox.count()
}
