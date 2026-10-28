/** JD Prep (A-08): paste a job post → offline analysis, or an AI prep pack with
 *  16 tailored Q&As, rounds, gaps, STAR stories, pitch and red flags. */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { analyseJdOffline, jdPrepPack } from '../lib/features'
import { loadLibrary, DEFAULT_FILTERS } from '../lib/queries'
import { usePlayer } from '../lib/player'
import { useSettings } from '../lib/settings'
import { aiReady, aiWhy } from '../lib/ai'
import { Chip, Chips, Empty, Md, Sheet, toast } from '../components/ui'
import type { JdPlan, Question } from '../lib/types'

export default function JdPrep() {
  const { settings } = useSettings()
  const player = usePlayer()
  const [text, setText] = useState('')
  const [plan, setPlan] = useState<JdPlan | null>(null)
  const [groups, setGroups] = useState<{ tech: string; codes: string[]; rows: Question[] }[]>([])
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<number>(-1)
  const techs = useLiveQuery(async () => (await (await fetch('/data/meta.json')).json()).techs, [], [])

  const analyse = async () => {
    if (!text.trim()) return
    setBusy('offline')
    setErr('')
    try {
      const res = analyseJdOffline(text, techs || [])
      const id = `jd-${Date.now().toString(36)}`
      const all = await loadLibrary({ ...DEFAULT_FILTERS })
      const g: JdPlan['groups'] = []
      for (const t of res.techs) {
        const rows = all.filter((q) => q.t.includes(t)).slice(0, 25)
        if (rows.length) g.push({ tech: t, codes: rows.map((r) => r.code) })
      }
      const p: JdPlan = {
        id,
        raw: text,
        title: text.split('\n')[0].slice(0, 80),
        techs: res.techs,
        niceTechs: res.niceTechs,
        seniority: res.seniority,
        groups: g,
        at: Date.now(),
      }
      setPlan(p)
      const withRows = await Promise.all(
        g.map(async (x) => ({ tech: x.tech, codes: x.codes, rows: (await db.questions.bulkGet(x.codes)).filter(Boolean) as Question[] })),
      )
      setGroups(withRows)
      await db.jds.put(p)
      toast(`${res.techs.length} required technologies found.`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const deepPrep = async () => {
    if (!text.trim()) return
    if (!aiReady()) return toast(aiWhy() || 'Connect AI first.')
    setBusy('ai')
    setErr('')
    try {
      const pack = await jdPrepPack(text, settings.profile, settings.lang)
      setPlan((p) => (p ? { ...p, ai: pack } : p))
      toast('Prep pack ready.')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const listenGroup = async (g: { tech: string; codes: string[]; rows: Question[] }) => {
    await player.load(g.codes, { label: g.tech, lang: settings.lang })
    await player.play()
  }

  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>Paste a job post</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the whole job description here…"
          style={{ minHeight: 160 }}
        />
        <div className="row">
          <button className="btn primary" onClick={() => void analyse()} disabled={!!busy || !text.trim()}>
            {busy === 'offline' ? 'Analysing…' : 'Analyse (works offline)'}
          </button>
          <button
            className="btn"
            onClick={() => void deepPrep()}
            disabled={!!busy || !text.trim() || !aiReady()}
            title={aiWhy()}
          >
            {busy === 'ai' ? 'Writing…' : '✨ AI deep prep'}
          </button>
        </div>
        {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      </div>

      {plan && (
        <>
          <div className="card stack-sm">
            <div className="row">
              {plan.seniority && <span className="badge hl">{plan.seniority}</span>}
              <span className="badge">Required: {plan.techs.length}</span>
              <span className="badge">Nice to have: {plan.niceTechs.length}</span>
            </div>
            <div>
              <b className="small">Required</b>
              <Chips>
                {plan.techs.map((t) => (
                  <Chip key={t} on>
                    {t}
                  </Chip>
                ))}
                {!plan.techs.length && <span className="tiny muted">None detected — try pasting more of the post.</span>}
              </Chips>
            </div>
            {!!plan.niceTechs.length && (
              <div>
                <b className="small">Nice to have</b>
                <Chips>
                  {plan.niceTechs.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </Chips>
              </div>
            )}
          </div>

          <div className="card stack-sm">
            <b className="small">What this job asks for</b>
            {groups.map((g, i) => (
              <div key={g.tech} className="hr sep" style={{ margin: '6px 0' }}>
                <div className="spread">
                  <b>{g.tech}</b>
                  <span className="row">
                    <span className="tiny muted">{g.rows.length} questions</span>
                    <button className="btn sm" onClick={() => void listenGroup(g)}>
                      🎧 Listen
                    </button>
                  </span>
                </div>
                <div className="stack-sm" style={{ marginTop: 6 }}>
                  {g.rows.slice(0, open === i ? 6 : 3).map((q) => (
                    <div key={q.code} className="small">
                      <span className="muted">{q.code}</span> {q.q}
                    </div>
                  ))}
                  {g.rows.length > 3 && (
                    <button className="btn sm ghost" onClick={() => setOpen(open === i ? -1 : i)}>
                      {open === i ? 'Show less' : `Show ${g.rows.length - 3} more`}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!groups.length && <Empty title="No questions matched those technologies." />}
          </div>
        </>
      )}

      {plan?.ai && (
        <div className="stack">
          <div className="card">
            <b>Role summary</b>
            <Md text={plan.ai.summary} lang={settings.lang} />
          </div>
          {!!plan.ai.rounds.length && (
            <div className="card">
              <b className="small">Likely rounds</b>
              <ol className="small">
                {plan.ai.rounds.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}
          {!!plan.ai.qas.length && (
            <div className="card stack-sm">
              <b className="small">Tailored questions ({plan.ai.qas.length})</b>
              {plan.ai.qas.map((qa, i) => (
                <details key={i}>
                  <summary className="small">{qa.q}</summary>
                  <div className="small" style={{ marginTop: 6 }}>
                    <Md text={qa.a} />
                  </div>
                  <button
                    className="btn sm"
                    style={{ marginTop: 6 }}
                    onClick={async () => {
                      const { speakSegments } = await import('../lib/speech')
                      await speakSegments([{ lang: 'en', text: qa.q }], settings.au)
                    }}
                  >
                    🔊 Read the question
                  </button>
                </details>
              ))}
            </div>
          )}
          <div className="grid2">
            {!!plan.ai.gaps.length && (
              <div className="card">
                <b className="small">Gaps</b>
                <ul className="small">
                  {plan.ai.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!plan.ai.redFlags.length && (
              <div className="card">
                <b className="small">Worth clarifying</b>
                <ul className="small">
                  {plan.ai.redFlags.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {!!plan.ai.stories.length && (
            <div className="card">
              <b className="small">STAR stories to prepare</b>
              <ul className="small">
                {plan.ai.stories.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {plan.ai.pitch && (
            <div className="card">
              <b className="small">Your 60-second pitch</b>
              <Md text={plan.ai.pitch} />
            </div>
          )}
          {!!plan.ai.questions.length && (
            <div className="card">
              <b className="small">Questions to ask them</b>
              <ul className="small">
                {plan.ai.questions.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <PastPlans onPick={async (p) => { setText(p.raw); setPlan(p); const all = await loadLibrary(DEFAULT_FILTERS); setGroups(await Promise.all(p.groups.map(async (x) => ({ tech: x.tech, codes: x.codes, rows: (await db.questions.bulkGet(x.codes)).filter(Boolean) as Question[] })))) }} />
    </div>
  )
}

function PastPlans({ onPick }: { onPick: (p: JdPlan) => void }) {
  const rows = useLiveQuery(() => db.jds.orderBy('at').reverse().limit(5).toArray(), [], [])
  if (!rows?.length) return null
  return (
    <div className="card stack-sm">
      <b className="small">Recent job posts</b>
      {rows.map((p) => (
        <div className="spread" key={p.id}>
          <span className="small grow">{p.title || p.raw.slice(0, 50)}</span>
          <button className="btn sm" onClick={() => onPick(p)}>
            Open
          </button>
        </div>
      ))}
    </div>
  )
}
