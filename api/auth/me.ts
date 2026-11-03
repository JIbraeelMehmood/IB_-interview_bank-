import { currentUser, type ApiRequest, type ApiResponse } from '../../server/auth.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Not signed in.' })
    return res.status(200).json({ user })
  } catch (error) {
    console.error('session lookup failed', error)
    return res.status(500).json({ error: 'Could not check your session.' })
  }
}
