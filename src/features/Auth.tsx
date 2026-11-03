import { useState, type FormEvent } from 'react'
import { accountRequest, activateAccount, type AccountUser } from '../lib/account'

export default function Auth({ onSignedIn }: { onSignedIn: (user: AccountUser) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const data = await accountRequest(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login',
        mode === 'signup' ? { name, email, password } : { email, password })
      await activateAccount(data.user.id)
      await onSignedIn(data.user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 460, paddingTop: '12vh' }}>
      <section className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 34 }}>📦</div>
          <h1>Interview Box</h1>
          <p className="muted">{mode === 'signup' ? 'Create your account to save your progress.' : 'Sign in to continue your interview preparation.'}</p>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          {mode === 'signup' && <label className="fld">Name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>}
          <label className="field">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label className="field">Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p role="alert" style={{ color: 'var(--bad)', margin: 0 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="center muted" style={{ marginTop: 18 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className="btn ghost" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <p className="muted center" style={{ fontSize: 12 }}>Your progress is private to your account. The app also works offline after you sign in.</p>
      </section>
    </main>
  )
}
