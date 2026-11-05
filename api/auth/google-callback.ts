/**
 * GET /api/auth/google-callback
 *
 * Google redirects here after the user approves the login screen.
 * 1. Verifies the CSRF state cookie.
 * 2. Exchanges the authorization code for tokens.
 * 3. Fetches the user's Google profile (id_token / userinfo).
 * 4. Upserts the user in MongoDB (creates or links to existing email account).
 * 5. Creates a session cookie and redirects back to the app.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   APP_URL
 */
import { createHash } from 'node:crypto'
import {
  cookieIsSecure,
  createSession,
  upsertGoogleUser,
  type ApiRequest,
  type ApiResponse,
} from '../../server/auth.js'
import { getDb } from '../../server/mongodb.js'

function parseCookies(req: ApiRequest): Record<string, string> {
  const raw = req.headers.cookie
  const str = Array.isArray(raw) ? raw.join(';') : raw || ''
  return Object.fromEntries(
    str.split(';').map((v) => v.trim().split('=').map(decodeURIComponent)).filter((p) => p.length === 2) as [string, string][],
  )
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const redirectUri = `${appUrl}/api/auth/google-callback`

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Google Sign-In is not configured on the server.' })
  }

  // --- Parse query params ---
  // Vercel passes the raw URL; extract from headers or use a URL parse.
  const rawUrl = (req.headers['x-vercel-id']
    ? `https://${req.headers.host || 'localhost'}${(req as any).url || ''}`
    : `http://localhost${(req as any).url || ''}`)
  const url = new URL(rawUrl)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return res.setHeader('Location', `${appUrl}/?auth_error=${encodeURIComponent(error)}`), res.status(302).end()
  }

  if (!code || !state) {
    return res.setHeader('Location', `${appUrl}/?auth_error=missing_params`), res.status(302).end()
  }

  // --- Verify CSRF state ---
  const cookies = parseCookies(req)
  const storedStateHash = cookies['ibx_gstate']
  const incomingHash = createHash('sha256').update(state).digest('hex')
  if (!storedStateHash || storedStateHash !== incomingHash) {
    return res.setHeader('Location', `${appUrl}/?auth_error=state_mismatch`), res.status(302).end()
  }

  try {
    // --- Exchange code for tokens ---
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error('Google token exchange failed', tokenRes.status, body)
      return res.setHeader('Location', `${appUrl}/?auth_error=token_exchange`), res.status(302).end()
    }
    const tokens = await tokenRes.json() as { access_token?: string; id_token?: string }

    // --- Get user profile ---
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profileRes.ok) {
      return res.setHeader('Location', `${appUrl}/?auth_error=profile_fetch`), res.status(302).end()
    }
    const profile = await profileRes.json() as {
      sub: string
      email: string
      name: string
      picture?: string
      email_verified?: boolean
    }

    if (!profile.sub || !profile.email) {
      return res.setHeader('Location', `${appUrl}/?auth_error=invalid_profile`), res.status(302).end()
    }

    // --- Upsert user + create session ---
    const user = await upsertGoogleUser(profile.sub, profile.email.toLowerCase(), profile.name || profile.email, profile.picture)
    const db = await getDb()
    const token = await createSession(db, user.id)
    const secure = cookieIsSecure(req)
    const sessionCookie = `ibx_session=${encodeURIComponent(token)}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${30 * 86400}`
    const clearStateCookie = `ibx_gstate=; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/api/auth/google-callback; Max-Age=0`

    res.setHeader('Set-Cookie', [sessionCookie, clearStateCookie])

    // Redirect back to the app root — the React app will call /api/auth/me and log in.
    return res.setHeader('Location', appUrl), res.status(302).end()

  } catch (err) {
    console.error('Google callback error', err)
    return res.setHeader('Location', `${appUrl}/?auth_error=server_error`), res.status(302).end()
  }
}
