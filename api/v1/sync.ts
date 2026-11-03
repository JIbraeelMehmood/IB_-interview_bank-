import { currentUser, type ApiRequest, type ApiResponse } from '../_lib/auth'
import { getDb } from '../_lib/mongodb'

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
      const key = keyOf(row)
      if (!ALLOWED.has(table) || !row || typeof row !== 'object' || Array.isArray(row) || !key) continue
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
