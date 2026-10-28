/** Library (A-01, H-01/02): search, quick filters, tech chips, experience chips,
 *  category / level / progress / sort, the 📚 Topics browser, and lazy paging of 30. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import {
  DEFAULT_FILTERS,
  QUICK,
  toggleTech,
  loadLibrary,
  partCounts,
  techCounts,
  expYearsCounts,
  type Filters,
  type Ranked,
} from '../lib/queries'
import { QCard } from '../components/QCard'
import { Chips, Chip, Empty, Loading, toast } from '../components/ui'
import { useSettings } from '../lib/settings'
import { usePlayer } from '../lib/player'
import { generateQuestions } from '../lib/features'
import { aiReady, aiWhy, aiConfigured } from '../lib/ai'
import { beginGoogleSignIn } from '../lib/auth'
import { canInstall, promptInstall } from '../lib/install'
import { EXP_SHORT, LEVEL_NAME, type ExpYears, type Level } from '../lib/types'

const PAGE = 30

/** Experience bands: what each year means in plain English. */
const EXP_TITLE: Record<number, string> = {
  1: 'Fresher / Intern',
  2: 'Junior',
  3: 'Mid-level',
  4: 'Mid+ / 4 yrs',
  5: 'Senior',
  6: 'Lead / Staff',
}

/** Which existing `l` (level) values each year band maps to — used as hint text. */
const EXP_LEVEL_HINT: Record<number, string> = {
  1: 'Basic',
  2: 'Basic',
  3: 'Mid',
  4: 'Mid',
  5: 'Senior',
  6: 'Senior',
}

export default function Library() {
  const { settings, set } = useSettings()
  const player = usePlayer()
  const [f, setF] = useState<Filters>({ ...DEFAULT_FILTERS, hiddenTechs: settings.hiddenTechs, customTechs: settings.customTechs })
  const [rows, setRows] = useState<Ranked[]>([])
  const [shown, setShown] = useState(PAGE)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [genBusy, setGenBusy] = useState(false)

  const run = useCallback(async (next: Filters) => {
    setLoading(true)
    try {
      setRows(await loadLibrary(next))
      setShown(PAGE)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run(f)
  }, [f, run])

  const techs = useLiveQuery(async () => (await techCounts(f)).slice(0, 40), [f], [])
  const parts = useLiveQuery(async () => partCounts(f), [f], [])
  const expCounts = useLiveQuery(async () => expYearsCounts(f), [f], [])
  const unrated = useLiveQuery(() => db.ratings.count(), [], 0)

  const patch = (p: Partial<Filters>) => setF((cur) => ({ ...cur, ...p }))

  const onQuick = (id: string) => {
    if (f.flag === id || f.source === id) patch({ flag: '', source: '' })
    else if (['c', 'i', 'h'].includes(id)) patch({ flag: id as 'c' | 'i' | 'h', source: '' })
    else patch({ source: id as any, flag: '' })
  }

  const toggleExp = (yr: ExpYears) =>
    patch({ expYears: f.expYears === yr ? '' : yr })

  const playAll = async () => {
    await player.load(rows.slice(0, 100).map((r) => r.code), { label: f.part || f.techs.join(' + ') || 'Library' })
    await player.play()
  }

  const more = async () => {
    if (!aiReady()) {
      toast(aiWhy() || 'Connect AI first.')
      return
    }
    setGenBusy(true)
    try {
      const expLabel = f.expYears ? ` for ${f.expYears} year${f.expYears > 1 ? 's' : ''} experience (${EXP_TITLE[f.expYears]})` : ''
      const topic = (f.part || f.techs.join(' + ') || 'senior Laravel engineering') + expLabel
      const made = await generateQuestions({
        topic,
        existing: rows.map((r) => r.q),
        lang: settings.lang,
        expYears: f.expYears || undefined,
      })
      const now = Date.now()
      for (const [i, m] of made.entries()) {
        await db.questions.put({
          code: `AI-${now.toString(36).toUpperCase()}-${i}`,
          q: m.q,
          a: m.a,
          l: f.expYears && f.expYears <= 2 ? 'j' : f.expYears && f.expYears <= 4 ? 'm' : 's',
          p: f.part || f.techs.join(' + ') || 'AI generated',
          c: 'AI generated',
          f: '',
          t: f.techs,
          s: 'ai',
          expYears: f.expYears || undefined,
          search: `${m.q} ${m.a}`.toLowerCase(),
          updatedAt: now,
        })
      }
      toast(`${made.length} new questions added. Filter by "AI generated" to see them.`)
      patch({ source: 'ai' })
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setGenBusy(false)
    }
  }

  const quickCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of rows) {
      for (const ch of r.f || '') c[ch] = (c[ch] || 0) + 1
      if (r.s === 'ai' || r.s === 'my' || r.s === 'import') c[r.s] = (c[r.s] || 0) + 1
    }
    return c
  }, [rows])

  const activeFiltersCount =
    (f.part ? 1 : 0) +
    (f.level ? 1 : 0) +
    (f.expYears ? 1 : 0) +
    (f.progress ? 1 : 0) +
    (f.source ? 1 : 0) +
    (f.flag ? 1 : 0) +
    f.techs.length

  return (
    <div className="stack">
      {/* H-05: AI Studio is reachable from the home tiles. */}
      <div className="grid3">
        <Link className="tile" to="/ai">
          <span className="ic">✨</span>
          <b>AI Studio</b>
          <span className="tiny muted">Agent, live interview, CV ↔ JD</span>
        </Link>
        <Link className="tile" to="/topics">
          <span className="ic">📚</span>
          <b>Topics</b>
          <span className="tiny muted">Browse by chapter</span>
        </Link>
        <Link className="tile" to="/lab">
          <span className="ic">🧪</span>
          <b>SQL Lab</b>
          <span className="tiny muted">30 exercises, offline</span>
        </Link>
        <Link className="tile" to="/learn">
          <span className="ic">📥</span>
          <b>Learn</b>
          <span className="tiny muted">From a transcript</span>
        </Link>
        <Link className="tile" to="/downloads">
          <span className="ic">🎧</span>
          <b>Offline</b>
          <span className="tiny muted">Prepare for no signal</span>
        </Link>
        <InstallTile />
      </div>

      {!aiConfigured() && !settings.bannerOff && (
        <div className="card stack-sm" style={{ borderColor: 'var(--brand)' }}>
          <div className="spread">
            <b>Turn on AI (one tap)</b>
            <button
              className="btn sm ghost"
              onClick={() => set({ bannerOff: true })}
              aria-label="Hide"
            >
              ✕
            </button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Every question, filter, SQL Lab exercise and download below already works offline. AI adds
            Urdu/Hindi explanations, mock-interview grading, JD prep and the agent.
          </p>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => void beginGoogleSignIn().catch((e) => toast((e as Error).message))}
            >
              <span aria-hidden="true">🔵</span> Continue with Google
            </button>
            <Link className="btn" to="/progress">
              Use a key instead
            </Link>
          </div>
          <span className="tiny muted">{aiWhy()}</span>
        </div>
      )}

      {unrated === 0 && (
        <div className="card row">
          <span className="grow small">
            Welcome. Tap <b>Weak / Okay / Solid</b> on any card and the app schedules it to come back — 1, 3, then 7 days.
          </span>
        </div>
      )}

      {/* Search + Filters toggle */}
      <div className="row">
        <input
          type="search"
          placeholder="Search 2,481 questions…"
          value={f.search}
          onChange={(e) => patch({ search: e.target.value })}
          className="grow"
          aria-label="Search questions"
        />
        <button
          className={`btn${activeFiltersCount > 0 ? ' primary' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
        </button>
      </div>

      {/* Quick flags + source */}
      <Chips>
        {QUICK.map((qk) => (
          <Chip
            key={qk.id}
            on={(f.flag || f.source) === qk.id}
            onClick={() => onQuick(qk.id)}
          >
            {qk.label}
            {quickCounts[qk.id] ? <span className="n">{quickCounts[qk.id]}</span> : null}
          </Chip>
        ))}
      </Chips>

      {/* ── Experience-year filter chips ────────────────────────────── */}
      <div>
        <div className="tiny muted" style={{ marginBottom: 4 }}>
          🎯 Filter by experience
        </div>
        <div className="scroll-x">
          {([1, 2, 3, 4, 5, 6] as ExpYears[]).map((yr) => {
            const count = expCounts?.find((e) => e.exp === yr)?.n ?? 0
            return (
              <Chip
                key={yr}
                on={f.expYears === yr}
                onClick={() => toggleExp(yr)}
                title={EXP_TITLE[yr]}
              >
                {EXP_SHORT[yr]}
                {count > 0 && <span className="n">{count}</span>}
              </Chip>
            )
          })}
        </div>
        {f.expYears ? (
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Showing questions for <b>{f.expYears} yr{f.expYears > 1 ? 's' : ''} experience</b> —{' '}
            {EXP_TITLE[f.expYears]} · {EXP_LEVEL_HINT[f.expYears]} level
            {' · '}
            <button
              className="btn sm ghost"
              style={{ padding: '0 4px', fontSize: 'inherit' }}
              onClick={() => patch({ expYears: '' })}
            >
              Clear ✕
            </button>
          </div>
        ) : (
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Tap a year to show questions matched to that experience level
          </div>
        )}
      </div>

      {/* ── Advanced filter panel ────────────────────────────────────── */}
      {showFilters && (
        <div className="card stack-sm">
          <b className="small">Advanced filters</b>
          <div className="grid2">
            <label className="fld">
              Category
              <select value={f.part} onChange={(e) => patch({ part: e.target.value })}>
                <option value="">All categories</option>
                {(parts || []).map((p) => (
                  <option key={p.part} value={p.part}>
                    {p.part} ({p.n})
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              Level
              <select value={f.level} onChange={(e) => patch({ level: e.target.value as Level | '' })}>
                <option value="">Any level</option>
                {(['j', 'm', 's'] as Level[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_NAME[l]}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              Experience (years)
              <select
                value={f.expYears}
                onChange={(e) => patch({ expYears: e.target.value ? (Number(e.target.value) as ExpYears) : '' })}
              >
                <option value="">Any experience</option>
                {([1, 2, 3, 4, 5, 6] as ExpYears[]).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} yr{yr > 1 ? 's' : ''} — {EXP_TITLE[yr]}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              My progress
              <select
                value={f.progress}
                onChange={(e) => patch({ progress: e.target.value as Filters['progress'] })}
              >
                <option value="">Any</option>
                <option value="none">Not practised yet</option>
                <option value="weak">Weak</option>
                <option value="ok">Okay</option>
                <option value="solid">Solid</option>
              </select>
            </label>

            <label className="fld">
              Sort
              <select
                value={f.sort}
                onChange={(e) => patch({ sort: e.target.value as Filters['sort'] })}
              >
                <option value="default">Most important first</option>
                <option value="important">Importance score</option>
                <option value="newest">Newest bank</option>
                <option value="az">A–Z</option>
              </select>
            </label>
          </div>

          {activeFiltersCount > 0 && (
            <button
              className="btn sm ghost"
              onClick={() => setF({ ...DEFAULT_FILTERS, hiddenTechs: settings.hiddenTechs, customTechs: settings.customTechs })}
            >
              Clear all {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Technologies: tap several. AND (the default) means "has all of these",
          so Laravel + React + Most important gives questions that are all three. */}
      {!!techs?.length && (
        <>
          <div className="scroll-x">
            {techs.map((t) => (
              <Chip
                key={t.slug}
                on={f.techs.includes(t.slug)}
                onClick={() => setF((cur) => toggleTech(cur, t.slug))}
              >
                {t.slug}
                <span className="n">{t.n}</span>
              </Chip>
            ))}
          </div>

          {f.techs.length > 0 && (
            <div className="card stack-sm">
              <div className="spread">
                <div className="grow">
                  <b className="small">
                    {f.techs.length} technolog{f.techs.length === 1 ? 'y' : 'ies'} selected
                  </b>
                  <div className="tiny muted">
                    {f.techs.join(f.techMode === 'and' ? ' + ' : ' or ')}
                    {' — '}
                    {f.techMode === 'and'
                      ? 'showing questions that have all of them'
                      : 'showing questions that have any of them'}
                  </div>
                </div>
                <Chips>
                  <Chip on={f.techMode === 'and'} onClick={() => patch({ techMode: 'and' })}>
                    Match all
                  </Chip>
                  <Chip on={f.techMode === 'or'} onClick={() => patch({ techMode: 'or' })}>
                    Match any
                  </Chip>
                </Chips>
              </div>
              <div className="chips">
                {f.techs.map((t) => (
                  <Chip key={t} on onClick={() => setF((cur) => toggleTech(cur, t))}>
                    {t} ✕
                  </Chip>
                ))}
                <button className="btn sm ghost" onClick={() => patch({ techs: [] })}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="spread">
        <span className="small muted">
          {loading ? 'Loading…' : `${rows.length} question${rows.length === 1 ? '' : 's'}`}
          {f.expYears ? ` · ${f.expYears} yr${f.expYears > 1 ? 's' : ''} exp` : ''}
          {f.techs.length ? ` · ${f.techs.join(f.techMode === 'and' ? ' + ' : ' or ')}` : ''}
        </span>
        <div className="row">
          <button className="btn sm" onClick={playAll} disabled={!rows.length}>
            🎧 Play all
          </button>
          <button className="btn sm" onClick={() => void more()} disabled={genBusy}>
            {genBusy ? 'Writing…' : '✨ 8 more like these'}
          </button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="Nothing matches those filters" hint="Try a different experience level, or clear a filter." />
      ) : (
        <div className="stack">
          {rows.slice(0, shown).map((q) => (
            <QCard key={q.code} q={q} selectedTechs={f.techs} onChanged={() => void run(f)} />
          ))}
          {shown < rows.length && (
            <button className="btn block" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, rows.length - shown)} more ({rows.length - shown} left)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function InstallTile() {
  const [can, setCan] = useState(false)
  useEffect(() => {
    setCan(canInstall())
    const t = setInterval(() => setCan(canInstall()), 2000)
    return () => clearInterval(t)
  }, [])
  if (!can) return <span />
  return (
    <button className="tile" onClick={() => void promptInstall()}>
      <span className="ic">📲</span>
      <b>Install app</b>
      <span className="tiny muted">Works offline, opens like a real app</span>
    </button>
  )
}
