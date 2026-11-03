import { cookieIsSecure, createSession, emailOf, findUser, setSessionCookie, verifyPassword, type ApiRequest, type ApiResponse } from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const email = emailOf(req.body?.email)
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' })
  try {
    const user = await findUser(email)
    if (!user || !(await verifyPassword(password, user))) return res.status(401).json({ error: 'Email or password is incorrect.' })
    const token = await createSession(await getDb(), user._id)
    setSessionCookie(res, token, cookieIsSecure(req))
    return res.status(200).json({ user: { id: user._id, email: user.email, name: user.name } })
  } catch (error) {
    console.error('login failed', error)
    return res.status(500).json({ error: 'Could not sign in. Please try again.' })
  }
}
