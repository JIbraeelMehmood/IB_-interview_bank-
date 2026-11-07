import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

const ALLOWED = new Set(['ratings', 'reviews', 'answers', 'stories', 'questions', 'translations', 'settings'])
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
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue
      const key = keyOf(row)
      if (!key || key.length > 120) continue

      // Vote removal is a first-class sync operation so it works offline too.
      // Scope deletion to the authenticated user; never accept a userId from the client.
      if (table === 'communityVoteDelete') {
        const deletedAt = Number(row.updatedAt) || Date.now()
        await db.collection('community_votes').deleteOne({
          _id: `${user.id}:${key}`,
          userId: user.id,
          // A delayed offline deletion must not erase a newer vote for the
          // same question that was submitted after the deletion was queued.
          updatedAt: { $lte: deletedAt },
        })
        if (Number.isInteger(item.id)) acked.push(item.id)
        continue
      }

      if (!ALLOWED.has(table)) continue
      const serialized = JSON.stringify(row)
      if (serialized.length > 256_000) continue

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
