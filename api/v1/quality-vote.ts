import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/** One authenticated quality review per user and question. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in to review questions.' })
    const body = req.body || {}
    const code = String(body.code || '').trim()
    const categoryCorrect = body.categoryCorrect
    const experienceCorrect = body.experienceCorrect
    const category = String(body.category || '').slice(0, 120)
    const expYears = Number(body.expYears)
    if (!code || typeof categoryCorrect !== 'boolean' || typeof experienceCorrect !== 'boolean' ||
        !category || !Number.isInteger(expYears) || expYears < 1 || expYears > 6) {
      return res.status(400).json({ error: 'Question, category, experience and both review answers are required.' })
    }
    const db = await getDb()
    const reviews = db.collection('question_quality_votes')
    const id = `${user.id}:${code}`
    await reviews.updateOne(
      { _id: id },
      { $set: { userId: user.id, code, category, expYears, categoryCorrect, experienceCorrect, updatedAt: Date.now() } },
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
