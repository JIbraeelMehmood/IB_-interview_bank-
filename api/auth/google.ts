/**
 * GET /api/auth/google
 *
 * Starts the Google OAuth 2.0 flow. Redirects the browser to Google's
 * authorisation page. When Google sends the user back, the browser lands on
 * /api/auth/google-callback.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID      — OAuth 2.0 client id from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET  — OAuth 2.0 client secret
 *   APP_URL               — canonical origin, e.g. https://yourapp.vercel.app
 */
import { randomBytes, createHash } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../../server/auth.js'

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(500).json({ error: 'Google Sign-In is not configured.' })

  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const redirectUri = `${appUrl}/api/auth/google-callback`

  // Generate a CSRF state token and store it in a short-lived HttpOnly cookie
  // so the callback can verify it came from us.
  const state = randomBytes(24).toString('base64url')
  // We store a hash of the state rather than the plaintext in the cookie to
  // follow the same pattern as session tokens.
  const stateHash = createHash('sha256').update(state).digest('hex')
  const cookieAge = 10 * 60 // 10 minutes
  const secure = process.env.VERCEL === '1' ||
    (Array.isArray(req.headers['x-forwarded-proto'])
      ? req.headers['x-forwarded-proto'][0]
      : req.headers['x-forwarded-proto']) === 'https'

  res.setHeader('Set-Cookie',
    `ibx_gstate=${stateHash}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/api/auth/google-callback; Max-Age=${cookieAge}`)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  return res.status(302).end()
}
