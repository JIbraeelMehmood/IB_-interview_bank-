import { MongoServerError } from 'mongodb'
import { cookieIsSecure, createSession, emailOf, registerUser, setSessionCookie, type ApiRequest, type ApiResponse } from '../_lib/auth'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const email = emailOf(req.body?.email)
  const name = String(req.body?.name || '').trim().slice(0, 80)
  const password = String(req.body?.password || '')
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name.' })
  try {
    const user = await registerUser(email, name, password)
    const token = await createSession(await (await import('../_lib/mongodb')).getDb(), user.id)
    setSessionCookie(res, token, cookieIsSecure(req))
    return res.status(201).json({ user })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' })
    console.error('signup failed', error)
    return res.status(500).json({ error: 'Could not create your account. Please try again.' })
  }
}
