import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/** One authenticated quality review per user and question. Public GET returns anonymized aggregates only. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const code = String(req.method === 'GET' ? req.query?.code || '' : req.body?.code || '').trim()
    const codes = req.method === 'GET'
      ? [...new Set(String(req.query?.codes || '').split(',').map((value) => value.trim()).filter(Boolean))].slice(0, 100)
      : []
    if (req.method === 'GET' ? (!code && !codes.length) : (!code || code.length > 120)) {
      return res.status(400).json({ error: 'A valid question code is required.' })
    }
    if (codes.some((value) => value.length > 120)) {
      return res.status(400).json({ error: 'One or more question codes are invalid.' })
    }

    const db = await getDb()
    const reviews = db.collection('question_quality_votes')

    const aggregateStats = async (questionCode: string) => {
      const [total, categoryOk, experienceOk, categoryRows, tagRows, expRows] = await Promise.all([
        reviews.countDocuments({ code: questionCode }),
        reviews.countDocuments({ code: questionCode, categoryCorrect: true }),
        reviews.countDocuments({ code: questionCode, experienceCorrect: true }),
        reviews.aggregate([
          { $match: { code: questionCode, suggestedCategory: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$suggestedCategory', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ]).toArray(),
        reviews.aggregate([
          { $match: { code: questionCode, suggestedTags: { $type: 'array' } } },
          { $unwind: '$suggestedTags' },
          { $group: { _id: '$suggestedTags', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 20 },
        ]).toArray(),
        reviews.aggregate([
          { $match: { code: questionCode, suggestedExpYears: { $type: 'array' } } },
          { $unwind: '$suggestedExpYears' },
          { $group: { _id: '$suggestedExpYears', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 6 },
        ]).toArray(),
      ])

      return {
        total,
        categoryOk,
        experienceOk,
        suggestedCategories: categoryRows.map((row: { _id: string; count: number }) => ({ value: row._id, count: row.count })),
        suggestedTags: tagRows.map((row: { _id: string; count: number }) => ({ value: row._id, count: row.count })),
        suggestedExpYears: expRows.map((row: { _id: number; count: number }) => ({ value: Number(row._id), count: row.count })),
      }
    }

    if (req.method === 'GET') {
      if (codes.length) {
        const entries = await Promise.all(codes.map(async (questionCode) => [questionCode, await aggregateStats(questionCode)] as const))
        return res.status(200).json({ statsByCode: Object.fromEntries(entries) })
      }
      return res.status(200).json({ stats: await aggregateStats(code) })
    }

    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to review questions.' })

    const body = req.body || {}
    const categoryCorrect = body.categoryCorrect
    const experienceCorrect = body.experienceCorrect
    const category = String(body.category || '').trim().slice(0, 120)
    const suggestedCategory = String(body.suggestedCategory || '').trim()
    const expYears = Number(body.expYears)

    const suggestedTags = Array.isArray(body.suggestedTags)
      ? [...new Set(body.suggestedTags
          .map((tag: unknown) => String(tag).trim().toLowerCase())
          .filter((tag: string) => /^[a-z0-9+#.\/ -]{1,50}$/.test(tag)))].slice(0, 20)
      : []

    const suggestedExpYears = Array.isArray(body.suggestedExpYears)
      ? [...new Set(body.suggestedExpYears
          .map(Number)
          .filter((year: number) => Number.isInteger(year) && year >= 1 && year <= 6))]
      : []

    if (typeof categoryCorrect !== 'boolean' || typeof experienceCorrect !== 'boolean' ||
        !category || !Number.isInteger(expYears) || expYears < 1 || expYears > 6) {
      return res.status(400).json({ error: 'Question, category, experience and both review answers are required.' })
    }
    if (suggestedCategory.length > 120 || (Array.isArray(body.suggestedTags) && body.suggestedTags.length > 50) ||
        (Array.isArray(body.suggestedExpYears) && body.suggestedExpYears.length > 6)) {
      return res.status(400).json({ error: 'One or more suggestions exceed the allowed limits.' })
    }

    const id = `${user.id}:${code}`
    await reviews.updateOne(
      { _id: id },
      {
        $set: {
          userId: user.id,
          code,
          category,
          expYears,
          categoryCorrect,
          experienceCorrect,
          suggestedCategory: suggestedCategory || null,
          suggestedTags,
          suggestedExpYears,
          updatedAt: Date.now(),
        },
      },
      { upsert: true },
    )

    return res.status(200).json({ ok: true, stats: await aggregateStats(code) })
  } catch (error) {
    console.error('quality vote failed', error)
    return res.status(500).json({ error: 'Could not save question review.' })
  }
}
