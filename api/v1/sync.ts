import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

const ALLOWED = new Set(['ratings', 'reviews', 'answers', 'stories', 'questions', 'translations', 'settings'])
// Note: 'communityVote' is intentionally NOT in ALLOWED. Community votes are submitted
// via POST /api/v1/vote and are NOT synced through this endpoint.
// The `if (table === 'communityVote')` block below is DEAD CODE — it is never reached
// because the ALLOWED guard above skips it first. It should be removed in a future cleanup.
// Do not add 'communityVote' to ALLOWED here; use the dedicated /api/v1/vote endpoint.
const keyOf = (row: any) => String(row?.code ?? row?.id ?? row?.key ?? '')

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to sync.' })
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : []
    const db = await getDb()
    const records = db.collection('user_records')
    const acked: number[] = []

    for (const item of items) {
      const table = String(item?.type || '')
      const row = item?.payload
      const key = keyOf(row)
      if (!ALLOWED.has(table) || !row || typeof row !== 'object' || Array.isArray(row) || !key) continue
      const serialized = JSON.stringify(row)
      if (serialized.length > 256_000) continue

      // Community votes go to a separate collection with upsert logic
      if (table === 'communityVote') {
        const votes = db.collection('community_votes')
        const voteId = `${user.id}:${key}`
        const expYears = Number(row.expYears) || 0
        const company = row.company ? String(row.company).slice(0, 100) : null
        if (expYears < 1 || expYears > 6) continue
        await votes.updateOne(
          { _id: voteId },
          { $set: { userId: user.id, code: key, expYears, company, at: Number(row.at) || Date.now(), updatedAt: Date.now() } },
          { upsert: true },
        )
        if (Number.isInteger(item.id)) acked.push(item.id)
        continue
      }

      const id = `${user.id}:${table}:${key}`
      const updatedAt = Number(row.updatedAt) || Date.now()
      const existing = await records.findOne({ _id: id, userId: user.id }, { projection: { updatedAt: 1 } })
      if (!existing || updatedAt >= Number(existing.updatedAt || 0)) {
        await records.updateOne(
          { _id: id },
          { $set: { userId: user.id, table, key, row, updatedAt } },
          { upsert: true },
        )
      }
      if (Number.isInteger(item.id)) acked.push(item.id)
    }

    const docs = await records.find({ userId: user.id }).sort({ updatedAt: -1 }).limit(5000).toArray()
    return res.status(200).json({
      acked,
      changes: docs.map((doc) => ({ table: doc.table, row: doc.row })),
    })
  } catch (error) {
    console.error('sync failed', error)
    return res.status(500).json({ error: 'Sync failed. Your offline changes are still saved on this device.' })
  }
}
