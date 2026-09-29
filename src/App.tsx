import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { BottomNav, ToastHost, toast } from './components/ui'
import { useSettings } from './lib/settings'
import { ensureSeeded } from './lib/seed'
import { startSync } from './lib/sync'
import { dueCount } from './lib/fsrs'
import { aiReady, aiWhy, aiConfigured } from './lib/ai'
import { finishSignIn } from './lib/auth'
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
  const { settings, loaded, init } = useSettings()
  const [ready, setReady] = useState(false)
  const [due, setDue] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const location = useLocation()
  const player = usePlayer()

  useEffect(() => {
    void (async () => {
      await init()
      try {
        await ensureSeeded()
      } catch {
        /* the Library screen shows the error if the bank is missing */
      }
      // Finish a Google/OpenRouter sign-in if we came back with a code.
      const r = await finishSignIn()
      if (r.message) toast(r.message)
      setReady(true)
    })()
  }, [init])

  useEffect(() => startSync(), [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = setInterval(() => void dueCount().then(setDue), 30_000)
    void dueCount().then(setDue)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(t)
    }
  }, [location.pathname])

  // Scroll to the top on every navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const aiOn = aiReady()
  const title: Record<string, string> = {
    '/library': 'Library',
    '/jd': 'JD Prep',
    '/mock': 'Mock interview',
    '/speak': 'Speaking coach',
    '/progress': 'Progress',
    '/lab': 'SQL Lab',
    '/learn': 'Learn',
    '/downloads': 'Downloads',
    '/ai': 'AI Studio',
    '/topics': 'Topics',
    '/help': 'Help',
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link to="/library" className="logo" style={{ textDecoration: 'none' }}>
            <span className="box" aria-hidden="true">
              📦
            </span>
            <span>Interview Box</span>
          </Link>
          <span className="ai-state">
            {!online ? (
              <>
                <i className="dot" /> Offline
              </>
            ) : aiOn ? (
              <>
                <i className="dot on" /> AI ready
              </>
            ) : (
              <>
                <i className="dot" />{' '}
                <Link to="/help" title={aiWhy()}>
                  AI off
                </Link>
              </>
            )}
          </span>
          <Link className="iconbtn" to="/help" aria-label="Help">
            ?
          </Link>
        </div>
      </header>

      <main className="wrap" style={{ paddingBlockStart: 12, paddingBlockEnd: 90 }}>
        {!ready || !loaded ? (
          <p className="center muted" style={{ padding: 30 }}>
            Loading the question bank…
          </p>
        ) : (
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/library" element={<Library />} />
            <Route path="/jd" element={<JdPrep />} />
            <Route path="/mock" element={<Mock />} />
            <Route path="/speak" element={<Speak />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/lab/:ex" element={<Lab />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/ai" element={<AiStudio />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/help" element={<Help />} />
            <Route
              path="*"
              element={
                <div className="card center">
                  <p>Page not found.</p>
                  <Link className="btn primary" to="/library">
                    Back to Library
                  </Link>
                </div>
              }
            />
          </Routes>
        )}
      </main>

      {player.queue.length > 0 && <PlayerBar />}
      <BottomNav dueCount={due} />
      <ToastHost />
      <UpdatePrompt />
    </>
  )
}

/** registerType:'prompt' — never reload while someone is mid-answer. */
function UpdatePrompt() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    return update((offlineReady) => {
      if (offlineReady) setShow(true)
    })
  }, [])
  if (!show) return null
  return (
    <div className="toast" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span className="grow">A new version is ready.</span>
      <button className="btn sm primary" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  )
}
