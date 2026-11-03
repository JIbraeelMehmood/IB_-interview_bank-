import { clearSessionCookie, removeSession, type ApiRequest, type ApiResponse } from '../_lib/auth'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try { await removeSession(req) } catch (error) { console.error('logout session cleanup failed', error) }
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
