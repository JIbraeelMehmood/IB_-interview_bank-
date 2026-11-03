import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { BottomNav, ToastHost, toast } from './components/ui'
import { useSettings } from './lib/settings'
import { ensureSeeded } from './lib/seed'
import { startSync, flush } from './lib/sync'
import { dueCount } from './lib/fsrs'
import { aiReady, aiWhy } from './lib/ai'
import { finishSignIn } from './lib/auth'
import { accountRequest, activateAccount, type AccountUser } from './lib/account'
import Auth from './features/Auth'
import { usePlayer } from './lib/player'
import { PlayerBar } from './components/Player'
import { update } from './lib/install'
import Library from './features/Library'
import JdPrep from './features/JdPrep'
import Mock from './features/Mock'
import Speak from './features/Speak'
import Progress from './features/Progress'
import Lab from './features/Lab'
import Learn from './features/Learn'
import Downloads from './features/Downloads'
import AiStudio from './features/AiStudio'
import Topics from './features/Topics'
import Help from './features/Help'

export default function App() {
  const { loaded, init } = useSettings()
  const [ready, setReady] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<AccountUser | null>(null)
  const [due, setDue] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const location = useLocation()
  const player = usePlayer()

  async function enterApp(account: AccountUser) {
    setUser(account)
    // Restore this account's cloud state before initializing the local settings store.
    await flush()
    await init()
    try { await ensureSeeded() } catch { /* Library displays seed errors */ }
    localStorage.setItem('ibx-user-cache', JSON.stringify(account))
    const r = await finishSignIn()
    if (r.message) toast(r.message)
    setReady(true)
    window.setTimeout(() => void flush(), 500)
  }

  useEffect(() => {
    let alive = true
    void accountRequest('/api/auth/me').then(async data => {
      if (!alive) return
      await activateAccount(data.user.id)
      localStorage.setItem('ibx-user-cache', JSON.stringify(data.user))
      await enterApp(data.user)
    }).catch(async (error) => {
      // Do not treat an expired/rejected server session as an offline session.
      if (!alive) return
      if (/Request failed \\(\\d+\\)/.test(String(error?.message || ''))) {
        setUser(null); setReady(false); return
      }
      // A previously signed-in user can still open the PWA offline.
      try {
        const cached = JSON.parse(localStorage.getItem('ibx-user-cache') || 'null') as AccountUser | null
        if (cached?.id && cached.email) {
          await activateAccount(cached.id)
          await enterApp(cached)
        } else {
          setUser(null); setReady(false)
        }
      } catch {
        setUser(null); setReady(false)
      }
    }).finally(() => { if (alive) setAuthChecked(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => { if (user) return startSync() }, [user?.id])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = window.setInterval(() => { if (user) void dueCount().then(setDue) }, 30_000)
    if (user) void dueCount().then(setDue)
    return () => {
      window.removeEventListener('online', on); window.removeEventListener('offline', off)
      window.clearInterval(t)
    }
  }, [location.pathname, user?.id])

  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  async function signedIn(account: AccountUser) {
    await enterApp(account)
    setAuthChecked(true)
  }
  async function signOut() {
    // Best-effort upload before ending the session; pending rows remain local if offline.
    if (online) await flush()
    try { await accountRequest('/api/auth/logout', {}) } catch { /* local sign-out still proceeds */ }
    localStorage.removeItem('ibx-user-cache')
    setUser(null); setReady(false); setDue(0)
  }

  if (!authChecked) return <p className="center muted" style={{ padding: 40 }}>Checking your account…</p>
  if (!user) return <Auth onSignedIn={signedIn} />

  const aiOn = aiReady()
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link to="/library" className="logo" style={{ textDecoration: 'none' }}>
            <span className="box" aria-hidden="true">📦</span><span>Interview Box</span>
          </Link>
          <span className="ai-state">
            {!online ? <><i className="dot" /> Offline</> : aiOn ? <><i className="dot on" /> AI ready</> :
              <><i className="dot" /><Link to="/help" title={aiWhy()}>AI off</Link></>}
          </span>
          <button className="iconbtn" type="button" onClick={() => void signOut()} aria-label="Sign out" title={user.email}>↪</button>
          <Link className="iconbtn" to="/help" aria-label="Help">?</Link>
        </div>
      </header>
      <main className="wrap" style={{ paddingBlockStart: 12, paddingBlockEnd: 90 }}>
        {!ready || !loaded ? <p className="center muted" style={{ padding: 30 }}>Loading the question bank…</p> : (
          <Routes>
            <Route path="/" element={<Library />} /><Route path="/library" element={<Library />} />
            <Route path="/jd" element={<JdPrep />} /><Route path="/mock" element={<Mock />} />
            <Route path="/speak" element={<Speak />} /><Route path="/progress" element={<Progress />} />
            <Route path="/lab" element={<Lab />} /><Route path="/lab/:ex" element={<Lab />} />
            <Route path="/learn" element={<Learn />} /><Route path="/downloads" element={<Downloads />} />
            <Route path="/ai" element={<AiStudio />} /><Route path="/topics" element={<Topics />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<div className="card center"><p>Page not found.</p><Link className="btn primary" to="/library">Back to Library</Link></div>} />
          </Routes>
        )}
      </main>
      {player.queue.length > 0 && <PlayerBar />}
      <BottomNav dueCount={due} /><ToastHost /><UpdatePrompt />
    </>
  )
}

function UpdatePrompt() {
  const [show, setShow] = useState(false)
  useEffect(() => update((offlineReady) => { if (offlineReady) setShow(true) }), [])
  if (!show) return null
  return <div className="toast" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
    <span className="grow">A new version is ready.</span>
    <button className="btn sm primary" onClick={() => location.reload()}>Reload</button>
  </div>
}
