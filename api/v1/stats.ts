import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/**
 * Community stats endpoint.
 *
 * GET /api/v1/stats
 * Optional query: ?exp=3  (filter by experience band)
 *
 * Returns aggregated "asked in interview" counts per question.
 * Only available to authenticated users.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in.' })

    const db = await getDb()
    const votes = db.collection('community_votes')

    // Aggregate all votes by question code
    const expFilter = req.query?.exp ? Number(req.query.exp) : null
    const matchStage = expFilter ? { $match: { expYears: expFilter } } : { $match: {} }

    const pipeline = [
      matchStage,
      {
        $group: {
          _id: '$code',
          askCount: { $sum: 1 },
          askByExp: { $push: '$expYears' },
          lastAskedAt: { $max: '$at' },
        },
      },
      { $sort: { askCount: -1 } },
      { $limit: 500 },
    ]

    const agg = await votes.aggregate(pipeline).toArray()

    // Build the stats array with askByExp maps
    const stats = agg.map((doc) => {
      const askByExp: Record<string, number> = {}
      for (const exp of doc.askByExp || []) {
        askByExp[String(exp)] = (askByExp[String(exp)] || 0) + 1
      }
      return {
        code: doc._id,
        askCount: doc.askCount || 0,
        askByExp,
        lastAskedAt: doc.lastAskedAt || 0,
        updatedAt: Date.now(),
      }
    })

    // Also return overall summary stats
    const totalVotes = await votes.countDocuments()
    const byExpPipeline = [
      { $group: { _id: '$expYears', count: { $sum: 1 } } },
    ]
    const byExpAgg = await votes.aggregate(byExpPipeline).toArray()
    const byExp: Record<string, number> = {}
    for (const doc of byExpAgg) {
      byExp[String(doc._id)] = doc.count
    }

    return res.status(200).json({
      stats,
      summary: {
        totalVotes,
        byExp,
        questionsTracked: stats.length,
      },
    })
  } catch (error) {
    console.error('stats failed', error)
    return res.status(500).json({ error: 'Could not load community stats.' })
  }
}
