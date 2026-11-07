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
      const [total, categoryOk, experienceOk] = await Promise.all([
        reviews.countDocuments({ code }),
        reviews.countDocuments({ code, categoryCorrect: true }),
        reviews.countDocuments({ code, experienceCorrect: true }),
      ])
      return res.status(200).json({ stats: { total, categoryOk, experienceOk } })
    }
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to review questions.' })
    const body = req.body || {}
    const categoryCorrect = body.categoryCorrect
    const experienceCorrect = body.experienceCorrect
    const category = String(body.category || '').slice(0, 120)
    const suggestedCategory = String(body.suggestedCategory || '').slice(0, 120)
    const suggestedExpYears = body.suggestedExpYears ? Number(body.suggestedExpYears) : null
    const expYears = Number(body.expYears)
    if (!code || typeof categoryCorrect !== 'boolean' || typeof experienceCorrect !== 'boolean' ||
        !category || !Number.isInteger(expYears) || expYears < 1 || expYears > 6) {
      return res.status(400).json({ error: 'Question, category, experience and both review answers are required.' })
    }
    const id = `${user.id}:${code}`
    await reviews.updateOne(
      { _id: id },
      { $set: { userId: user.id, code, category, expYears, categoryCorrect, experienceCorrect, suggestedCategory: suggestedCategory || null, suggestedExpYears: suggestedExpYears && suggestedExpYears >= 1 && suggestedExpYears <= 6 ? suggestedExpYears : null, updatedAt: Date.now() } },
      { upsert: true },
    )
    const [total, categoryOk, experienceOk] = await Promise.all([
      reviews.countDocuments({ code }),
      reviews.countDocuments({ code, categoryCorrect: true }),
      reviews.countDocuments({ code, experienceCorrect: true }),
    ])
    return res.status(200).json({ ok: true, stats: { total, categoryOk, experienceOk } })
  } catch (error) {
    console.error('quality vote failed', error)
    return res.status(500).json({ error: 'Could not save question review.' })
  }
}
