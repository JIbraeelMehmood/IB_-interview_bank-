import { useState, type FormEvent } from 'react'
import { accountRequest, activateAccount, type AccountUser } from '../lib/account'

export default function Auth({ onSignedIn }: { onSignedIn: (user: AccountUser) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Read any error that came back from the Google OAuth redirect.
  const urlError = new URLSearchParams(window.location.search).get('auth_error')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const data = await accountRequest(
        mode === 'signup' ? '/api/auth/signup' : '/api/auth/login',
        mode === 'signup' ? { name, email, password } : { email, password },
      )
      await activateAccount(data.user.id)
      await onSignedIn(data.user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function googleSignIn() {
    // Full page redirect — the callback will set the session cookie and
    // redirect back, then App.tsx picks up the session via /api/auth/me.
    window.location.href = '/api/auth/google'
  }

  return (
    <main className="wrap" style={{ maxWidth: 460, paddingTop: '10vh' }}>
      <section className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 34 }}>📦</div>
          <h1>Interview Box</h1>
          <p className="muted">
            {mode === 'signup'
              ? 'Create your account to save your progress.'
              : 'Sign in to continue your interview preparation.'}
          </p>
        </div>

        {/* ── Google Sign-In ── */}
        <button
          type="button"
          onClick={googleSignIn}
          disabled={busy}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 8,
            border: '1.5px solid var(--border, #ddd)',
            background: '#fff',
            color: '#222',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 18,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border, #ddd)' }} />
          <span className="muted" style={{ fontSize: 12 }}>or use email</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border, #ddd)' }} />
        </div>

        {/* ── Email/password form ── */}
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          {mode === 'signup' && (
            <label className="fld">
              Name
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
          )}
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          {(error || urlError) && (
            <p role="alert" style={{ color: 'var(--bad)', margin: 0 }}>
              {error || friendlyAuthError(urlError!)}
            </p>
          )}

          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="center muted" style={{ marginTop: 18 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="btn ghost"
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <p className="muted center" style={{ fontSize: 12 }}>
          Your progress is private to your account. The app also works offline after you sign in.
        </p>
      </section>
    </main>
  )
}

function friendlyAuthError(code: string): string {
  const map: Record<string, string> = {
    state_mismatch: 'Sign-in failed (security check). Please try again.',
    token_exchange: 'Could not complete Google sign-in. Please try again.',
    profile_fetch: 'Could not load your Google profile. Please try again.',
    missing_params: 'Sign-in was incomplete. Please try again.',
    server_error: 'A server error occurred during Google sign-in.',
    access_denied: 'You declined the Google sign-in.',
  }
  return map[code] || `Sign-in error: ${code}`
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
