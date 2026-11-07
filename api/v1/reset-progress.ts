import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

/** Remove only the signed-in user's synced study records. Community votes and
 *  public question-quality reviews are contributions, not personal progress. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again before resetting synced progress.' })
    const db = await getDb()
    const result = await db.collection('user_records').deleteMany({ userId: user.id })
    return res.status(200).json({ ok: true, deleted: result.deletedCount })
  } catch (error) {
    console.error('progress reset failed', error)
    return res.status(500).json({ error: 'Could not reset synced progress. Your local data has not been cleared.' })
  }
}
