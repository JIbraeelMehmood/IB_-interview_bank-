import { getDb } from '../server/mongodb.js'

export default async function handler(req: { method?: string }, res: {
  status(code: number): any
  json(value: unknown): void
}) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  try {
    const db = await getDb()
    await db.command({ ping: 1 })
    return res.status(200).json({ ok: true, database: 'connected' })
  } catch (error) {
    console.error('health check failed', error)
    return res.status(503).json({ ok: false, error: 'Database connection failed. Check the Vercel function logs.' })
  }
}
