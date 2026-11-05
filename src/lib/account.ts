import { db } from './db'

export interface AccountUser { id: string; email: string; name: string; picture?: string }

export async function accountRequest(path: string, body?: Record<string, unknown>) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/** Keep private IndexedDB rows from one account out of another account's session. */
export async function activateAccount(userId: string) {
  const previous = localStorage.getItem('ibx-active-account')
  if (previous && previous !== userId) {
    const tables = [db.ratings, db.reviews, db.answers, db.explains,
      db.mocks, db.jds, db.stories, db.imports, db.outbox, db.settings]
    await db.transaction('rw', tables, async () => {
      await Promise.all(tables.map((t) => t.clear()))
      await db.questions.where('s').notEqual('b').delete()
    })
  }
  localStorage.setItem('ibx-active-account', userId)
}

export async function clearLocalAccountMarker() {
  // Keep the marker so a returning user retains their own offline cache.
}
