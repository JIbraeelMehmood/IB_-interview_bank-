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
const VERIFIER_EXP_KEY = 'ibx-pkce-verifier-exp'
const RETURN_KEY = 'ibx-auth-return'
// How long a PKCE verifier is valid for (10 minutes).
const VERIFIER_TTL_MS = 10 * 60 * 1000

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
 * Generates a PKCE verifier, stores it in localStorage (not sessionStorage —
 * sessionStorage is wiped when a mobile browser opens the OAuth flow in a
 * system browser and then redirects back, causing a 400 on the token exchange),
 * and redirects to OpenRouter. Must be called from a real user tap: browsers
 * block popups and silent redirects on mobile.
 */
export async function beginGoogleSignIn(): Promise<void> {
  if (location.protocol === 'file:') {
    throw new Error(
      'Open the app from a web address (localhost or https), not from a file on disk. Sign-in cannot work from a file.',
    )
  }
  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  // Use localStorage so the verifier survives a system-browser OAuth redirect on mobile.
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(VERIFIER_EXP_KEY, String(Date.now() + VERIFIER_TTL_MS))
  localStorage.setItem(RETURN_KEY, currentUrl())

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

  // Read verifier from localStorage (not sessionStorage — see beginGoogleSignIn).
  const verifier = localStorage.getItem(VERIFIER_KEY)
  const expStr = localStorage.getItem(VERIFIER_EXP_KEY)
  try {
    if (!verifier) {
      throw new Error(
        'The sign-in verifier was not found. This usually means sign-in was started in a different browser tab or the page was reloaded before completing. Please try signing in again.',
      )
    }
    if (expStr && Date.now() > Number(expStr)) {
      throw new Error('The sign-in link has expired (10 minutes). Please try again.')
    }
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // OpenRouter requires code_challenge_method to match what was sent in step 1.
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if (res.status === 400) {
        throw new Error(
          `Sign-in failed (400). This can happen if the sign-in link was already used or expired. Please tap "Continue with Google" again.${body ? ' Detail: ' + body.slice(0, 120) : ''}`,
        )
      }
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
  // Clear the verifier from localStorage — it's single-use.
  localStorage.removeItem(VERIFIER_KEY)
  localStorage.removeItem(VERIFIER_EXP_KEY)
  localStorage.removeItem(RETURN_KEY)
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
