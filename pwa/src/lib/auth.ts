/** Sign-in.
 *
 *  Two ways in, both of which work without our own backend:
 *
 *  1. **Continue with Google** — OAuth 2.0 PKCE against OpenRouter. OpenRouter's
 *     sign-in page offers Google, and the same account works in Cline, Claude
 *     Desktop and anything else that speaks OpenRouter. No key to copy, and the
 *     key never touches this app's storage in plain text beyond the local
 *     `ibx-keys` entry, which the user can delete at any time.
 *
 *  2. **Email account (Puter)** — a free account that needs no key at all.
 *
 *  A ChatGPT or Claude *subscription* cannot be used here: those companies do
 *  not offer it to third-party apps. The Help sheet says so plainly instead of
 *  leaving people guessing.
 */

import { keyState, saveKeys, type ProviderId } from './ai'

const VERIFIER_KEY = 'ibx-pkce-verifier'
const RETURN_KEY = 'ibx-auth-return'

/* ------------------------- base64url helpers ------------------------- */

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(len = 64): string {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return b64url(buf)
}

async function sha256(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return b64url(new Uint8Array(digest))
}

export const AUTH_URL = 'https://openrouter.ai/auth'
const TOKEN_URL = 'https://openrouter.ai/api/v1/auth/keys'

/** Where we are, so OpenRouter can send the user back. */
function currentUrl(): string {
  return typeof location !== 'undefined' ? location.origin + location.pathname : 'http://localhost'
}

/**
 * Start "Continue with Google".
 *
 * Generates a PKCE verifier, stores it, and redirects to OpenRouter with
 * `callback_url` pointing back at this exact page. Must be called from a real
 * user tap: browsers block popups and silent redirects on mobile.
 */
export async function beginGoogleSignIn(): Promise<void> {
  if (location.protocol === 'file:') {
    throw new Error(
      'Open the app from a web address (localhost or https), not from a file on disk. Sign-in cannot work from a file.',
    )
  }
  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(RETURN_KEY, currentUrl())

  const params = new URLSearchParams({
    callback_url: currentUrl(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  // Keep the user on this page and in this app after signing in.
  location.href = `${AUTH_URL}?${params.toString()}`
}

/**
 * Finish the redirect. OpenRouter comes back with `?code=…`; exchange it for a
 * key and store it. Safe to call on every load — it does nothing without a code.
 */
export async function finishSignIn(): Promise<{ ok: boolean; message: string }> {
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  const err = params.get('error')
  if (err) {
    cleanUrl()
    return { ok: false, message: `Sign-in was not completed (${err}).` }
  }
  if (!code) return { ok: false, message: '' }

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  try {
    if (!verifier) throw new Error('This sign-in was started in a different tab or has expired. Try again.')
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OpenRouter refused the code (${res.status}). ${body.slice(0, 120)}`)
    }
    const data = await res.json()
    const key = data?.key || data?.api_key || data?.user_key
    if (!key) throw new Error('No key came back from OpenRouter.')

    const st = keyState()
    saveKeys({ ...st, prov: 'openrouter' as ProviderId, keys: { ...st.keys, openrouter: key } })
    cleanUrl()
    return {
      ok: true,
      message: 'Signed in with Google. Free models are available now, plus GPT, Claude, Gemini and Qwen if your account has credit.',
    }
  } catch (e) {
    cleanUrl()
    return { ok: false, message: (e as Error).message }
  }
}

/** Remove the ?code=… from the address bar so a refresh does not re-exchange. */
function cleanUrl() {
  if (typeof history === 'undefined') return
  const url = new URL(location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  url.searchParams.delete('state')
  history.replaceState({}, '', url.toString())
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(RETURN_KEY)
}

/** Forget the signed-in account (the key is removed from this device). */
export function signOut() {
  const st = keyState()
  const keys = { ...st.keys }
  delete keys.openrouter
  delete keys.puter
  saveKeys({ ...st, prov: 'server', keys, puterOk: undefined })
}

/** Is a Google/OpenRouter account connected on this device? */
export function googleSignedIn(): boolean {
  return !!keyState().keys.openrouter
}

/** Is a Puter (email) account connected? */
export function emailSignedIn(): boolean {
  return !!keyState().puterOk
}

export type SignInMethod = 'google' | 'email' | 'none'

export function signInMethod(): SignInMethod {
  if (googleSignedIn()) return 'google'
  if (emailSignedIn()) return 'email'
  return 'none'
}
