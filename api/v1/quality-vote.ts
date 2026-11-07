import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/** One authenticated quality review per user and question. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const code = String(req.method === 'GET' ? req.query?.code || '' : req.body?.code || '').trim()
    if (!code) return res.status(400).json({ error: 'Question code is required.' })
    const db = await getDb()
    const reviews = db.collection('question_quality_votes')
    if (req.method === 'GET') {
      const aggregateStats = async () => {
      const [total, categoryOk, experienceOk, categoryRows, tagRows, expRows] = await Promise.all([
        reviews.countDocuments({ code }),
        reviews.countDocuments({ code, categoryCorrect: true }),
        reviews.countDocuments({ code, experienceCorrect: true }),
        reviews.aggregate([
          { $match: { code, suggestedCategory: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$suggestedCategory', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } }, { $limit: 10 },
        ]).toArray(),
        reviews.aggregate([
          { $match: { code, suggestedTags: { $type: 'array' } } },
          { $unwind: '$suggestedTags' },
          { $group: { _id: '$suggestedTags', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } }, { $limit: 20 },
        ]).toArray(),
        reviews.aggregate([
          { $match: { code, suggestedExpYears: { $type: 'array' } } },
          { $unwind: '$suggestedExpYears' },
          { $group: { _id: '$suggestedExpYears', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } }, { $limit: 6 },
        ]).toArray(),
      ])
      return {
        total, categoryOk, experienceOk,
        suggestedCategories: categoryRows.map((row: any) => ({ value: row._id, count: row.count })),
        suggestedTags: tagRows.map((row: any) => ({ value: row._id, count: row.count })),
        suggestedExpYears: expRows.map((row: any) => ({ value: Number(row._id), count: row.count })),
      }
    }
    if (req.method === 'GET') {
      return res.status(200).json({ stats: await aggregateStats() })
    }
    }
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to review questions.' })
    const body = req.body || {}
    const categoryCorrect = body.categoryCorrect
    const experienceCorrect = body.experienceCorrect
    const category = String(body.category || '').slice(0, 120)
    const suggestedCategory = String(body.suggestedCategory || '').slice(0, 120)
    const suggestedTags = Array.isArray(body.suggestedTags)
      ? [...new Set(body.suggestedTags.map((tag: unknown) => String(tag).trim().toLowerCase()).filter((tag: string) => /^[a-z0-9+#.\-/ ]{1,50}$/.test(tag)))].slice(0, 20)
      : []
    const suggestedExpYears = Array.isArray(body.suggestedExpYears)
      ? [...new Set(body.suggestedExpYears.map(Number).filter((year: number) => Number.isInteger(year) && year >= 1 && year <= 6))]
      : []
    const expYears = Number(body.expYears)
    if (!code || typeof categoryCorrect !== 'boolean' || typeof experienceCorrect !== 'boolean' ||
        !category || !Number.isInteger(expYears) || expYears < 1 || expYears > 6) {
      return res.status(400).json({ error: 'Question, category, experience and both review answers are required.' })
    }
    const id = `${user.id}:${code}`
    if (suggestedCategory && suggestedCategory.length > 120) {
      return res.status(400).json({ error: 'Suggested category must be 120 characters or fewer.' })
    }
    await reviews.updateOne(
      { _id: id },
      { $set: {
        userId: user.id, code, category, expYears, categoryCorrect, experienceCorrect,
        suggestedCategory: suggestedCategory.trim() || null,
        suggestedTags,
        suggestedExpYears,
        updatedAt: Date.now(),
      } },
      { upsert: true },
    )
    return res.status(200).json({ ok: true, stats: await aggregateStats() })
  } catch (error) {
    console.error('quality vote failed', error)
    return res.status(500).json({ error: 'Could not save question review.' })
  }
}
