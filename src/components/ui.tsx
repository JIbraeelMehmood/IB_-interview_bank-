/** Small shared UI pieces. Kept unstyled-but-classed so the CSS stays in one place. */
import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { md as renderMd } from '../lib/text'

/* ----------------------------- toast -------------------------------- */

let toastFn: ((m: string) => void) | null = null

export function toast(msg: string) {
  toastFn?.(msg)
}

export function ToastHost() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    toastFn = (m: string) => {
      const el = ref.current
      if (!el) return
      el.textContent = m
      el.hidden = false
      clearTimeout((el as any)._t)
      ;(el as any)._t = setTimeout(() => {
        el.hidden = true
      }, 3200)
    }
    return () => {
      toastFn = null
    }
  }, [])
  return <div className="toast" ref={ref} hidden role="status" aria-live="polite" />
}

/* ----------------------------- sheet -------------------------------- */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="sheet-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grip" />
        <div className="spread" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: '1.1rem' }}>{title}</h2>
          <button className="btn sm ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------ chips ------------------------------- */

export function Chip({
  on,
  onClick,
  children,
  title,
}: {
  on?: boolean
  onClick?: () => void
  children: ReactNode
  title?: string
}) {
  return (
    <button className="chip" aria-pressed={!!on} onClick={onClick} type="button" title={title}>
      {children}
    </button>
  )
}

export function Chips({ children }: { children: ReactNode }) {
  return <div className="chips">{children}</div>
}

/* ------------------------- loading / empty -------------------------- */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="row center" style={{ padding: 22, color: 'var(--muted)' }}>
      <span className="spin" /> <span>{label}</span>
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card center stack-sm" style={{ alignItems: 'center' }}>
      <strong>{title}</strong>
      {hint && <div className="small muted">{hint}</div>}
      {action}
    </div>
  )
}

/* ---------------------------- bottom nav ---------------------------- */

const TABS = [
  { to: '/library', label: 'Library', ic: '📚' },
  { to: '/jd', label: 'JD Prep', ic: '🎯' },
  { to: '/mock', label: 'Mock', ic: '🎤' },
  { to: '/speak', label: 'Speak', ic: '🗣' },
  { to: '/progress', label: 'Progress', ic: '📈' },
]

export function BottomNav({ dueCount = 0 }: { dueCount?: number }) {
  const { pathname } = useLocation()
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => (isActive ? 'active' : '')}
          aria-current={pathname === t.to ? 'page' : undefined}
        >
          <span className="ic" aria-hidden="true">
            {t.ic}
          </span>
          <span>{t.label}</span>
          {t.to === '/progress' && dueCount > 0 && (
            <span className="badge" aria-label={`${dueCount} due`}>
              {dueCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/* ------------------------- markdown renderer ----------------------- */

/** Render model markdown. Content is escaped first, so this stays safe. */
export function Md({ text, lang = 'en' }: { text: string; lang?: string }) {
  return (
    <div
      className={lang === 'ur' ? 'ur' : lang === 'hi' ? 'hi' : ''}
      dir={lang === 'ur' ? 'rtl' : undefined}
      dangerouslySetInnerHTML={{ __html: renderMd(text) }}
    />
  )
}
