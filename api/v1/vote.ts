import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/**
 * Community vote endpoint.
 *
 * POST /api/v1/vote
 * Body: { code: string, expYears: number, company?: string }
 *
 * Records that the authenticated user was asked this question in a real
 * interview. One vote per user per question (upsert).
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to vote.' })

    const body = req.body || {}
    const code = String(body.code || '').trim()
    const expYears = Number(body.expYears)
    const company = body.company == null ? '' : String(body.company).trim()

    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(code) ||
        !Number.isInteger(expYears) || expYears < 1 || expYears > 6 ||
        company.length > 100) {
      return res.status(400).json({ error: 'Enter a valid question code, experience band (1-6), and company name (up to 100 characters).' })
    }

    const db = await getDb()
    const votes = db.collection('community_votes')
    const now = Date.now()

    // Upsert: one vote per user per question
    const id = `${user.id}:${code}`
    await votes.updateOne(
      { _id: id },
      {
        $set: {
          userId: user.id,
          code,
          expYears,
          company: company || null,
          at: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    )

    // Compute the updated aggregate for this question
    const pipeline = [
      { $match: { code } },
      {
        $group: {
          _id: '$code',
          askCount: { $sum: 1 },
          askByExp: {
            $push: { exp: '$expYears' },
          },
          lastAskedAt: { $max: '$at' },
        },
      },
    ]
    const agg = await votes.aggregate(pipeline).toArray()
    const stats = agg[0] || { askCount: 0, askByExp: [], lastAskedAt: 0 }

    // Build the askByExp map
    const askByExp: Record<string, number> = {}
    for (const item of stats.askByExp || []) {
      askByExp[String(item.exp)] = (askByExp[String(item.exp)] || 0) + 1
    }

    return res.status(200).json({
      ok: true,
      stats: {
        code,
        askCount: stats.askCount || 0,
        askByExp,
        lastAskedAt: stats.lastAskedAt || 0,
        updatedAt: Date.now(),
      },
    })
  } catch (error) {
    console.error('vote failed', error)
    return res.status(500).json({ error: 'Vote failed. Your vote is still saved on this device.' })
  }
}
