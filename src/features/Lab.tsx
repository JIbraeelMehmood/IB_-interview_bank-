/** SQL Lab (A-11): 30 exercises on sql.js, fully offline, with Check, Hint,
 *  Solution, reset, quick-insert chips, and "why is this wrong" for AI users. */
import { useEffect, useState } from 'react'
import type { Database } from 'sql.js'
import { checkAnswer, labExercises, openLab, QUICK_INSERT, resetLab, runQuery, tableNames, type LabExercise, type RunResult } from '../lib/sqllab'
import { useSettings } from '../lib/settings'
import { useParams, useNavigate } from 'react-router-dom'
import { Chip, Chips, Empty, Loading, Md, Sheet, toast } from '../components/ui'
import { aiText, aiReady, aiWhy } from '../lib/ai'

export default function Lab() {
  const params = useParams()
  const nav = useNavigate()
  const { settings } = useSettings()
  const [db, setDb] = useState<Database | null>(null)
  const [list, setList] = useState<LabExercise[]>([])
  const [id, setId] = useState(params.ex || '')
  const [sql, setSql] = useState('')
  const [res, setRes] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<'' | 'pass' | 'fail'>('')
  const [note, setNote] = useState('')
  const [sheet, setSheet] = useState('')
  const [done, setDone] = useState<Record<string, 1>>({})
  const [free, setFree] = useState(false)

  useEffect(() => {
    void (async () => {
      const [d, ex] = await Promise.all([openLab(), labExercises()])
      setDb(d)
      setList(ex)
      const first = ex[0]
      if (first) {
        setId(params.ex || first.id)
        setSql(first.sol)
      }
      const saved = await db_getDone()
      setDone(saved)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ex = list.find((e) => e.id === id) || null

  const pick = (e: LabExercise) => {
    setId(e.id)
    setSql('')
    setRes(null)
    setVerdict('')
    setNote('')
    setFree(false)
    nav(`/lab/${e.id}`, { replace: true })
  }

  const run = () => {
    if (!db) return
    setRes(runQuery(db, sql))
    setVerdict('')
    setNote('')
  }

  const check = async () => {
    if (!db || !ex) return
    const r = checkAnswer(ex, sql, db)
    setRes(r.got)
    setVerdict(r.pass ? 'pass' : 'fail')
    setNote(r.note)
    if (r.pass) {
      setDone((d) => ({ ...d, [ex.id]: 1 }))
      await db_setDone({ ...done, [ex.id]: 1 })
      toast('Correct.')
    }
  }

  const why = async () => {
    if (!res) return
    if (!aiReady()) return toast(aiWhy())
    setSheet('why')
    try {
      const text = await aiText(
        `A candidate is practising this SQL question: "${ex?.p || 'free query'}"\n\nThey ran:\n${sql}\n\n${
          res.ok
            ? `Result columns: ${res.columns.join(', ')}\nFirst rows: ${JSON.stringify(res.rows.slice(0, 3))}\nExpected: ${JSON.stringify(checkAnswer(ex!, sql, db!).want.rows.slice(0, 3))}`
            : `Error: ${res.error}`
        }\n\nExplain what is wrong and how to fix it, for a beginner.`,
        { task: 'quick' },
      )
      setSheet(text)
    } catch (e) {
      setSheet(`Could not do that: ${(e as Error).message}`)
    }
  }

  if (!db) return <Loading label="Starting SQLite…" />

  return (
    <div className="stack">
      <div className="card row">
        <b className="grow">
          SQL Lab — {Object.keys(done).length} of {list.length} done
        </b>
        <a className="btn sm ghost" href="/lab">
          Playground
        </a>
      </div>

      {!ex ? (
        <>
          <select value={id} onChange={(e) => pick(list.find((x) => x.id === e.target.value)!)}>
            <option value="">Choose an exercise…</option>
            {['Video set', 'Classic'].map((set) => (
              <optgroup key={set} label={set}>
                {list
                  .filter((x) => (set === 'Video set' ? x.id.startsWith('v') : x.id.startsWith('c')))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id} — {x.t}
                      {done[x.id] ? ' ✓' : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <FreePlay sql={sql} setSql={setSql} db={db} res={res} run={run} tables={tableNames(db)} />
        </>
      ) : (
        <>
          <div className="card stack-sm">
            <div className="spread">
              <span className="badge">{ex.set}</span>
              <span className="badge">{ex.id}</span>
            </div>
            <div className="qtext">{ex.p}</div>
            <div className="tiny muted">{ex.q}</div>
          </div>

          <div className="card stack-sm">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="Write your SQL here…"
              style={{ fontFamily: 'var(--mono)', minHeight: 130 }}
              spellCheck={false}
            />
            <div className="row">
              <button className="btn primary" onClick={run}>
                ▶ Run
              </button>
              <button className="btn" onClick={() => void check()}>
                ✓ Check
              </button>
              <button className="btn sm ghost" onClick={() => setSheet(ex.h)}>
                💡 Hint
              </button>
              <button className="btn sm ghost" onClick={() => setSheet(ex.sol)}>
                Show solution
              </button>
              <button
                className="btn sm ghost"
                onClick={() => {
                  resetLab(db)
                  setRes(null)
                  toast('Tables reset.')
                }}
              >
                Reset DB
              </button>
              {res && (
                <button className="btn sm ghost" onClick={() => void why()} disabled={!aiReady()} title={aiWhy()}>
                  Why is this wrong?
                </button>
              )}
            </div>
          </div>

          {verdict && (
            <div className={`card ${verdict === 'pass' ? '' : ''}`} style={{ borderColor: verdict === 'pass' ? 'var(--ok)' : 'var(--warn)' }}>
              <b>{verdict === 'pass' ? '✅ Correct' : '❌ Not yet'}</b>
              <div className="small">{note}</div>
            </div>
          )}

          {res && <ResultTable res={res} />}

          <Chips>
            {list.map((x) => (
              <Chip key={x.id} on={x.id === ex.id} onClick={() => pick(x)} title={x.t}>
                {x.id}
                {done[x.id] ? ' ✓' : ''}
              </Chip>
            ))}
          </Chips>
        </>
      )}

      {sheet && typeof sheet === 'string' && (
        <Sheet title={sheet.startsWith('SELECT') || sheet.startsWith('select') ? 'Solution' : 'Hint'} onClose={() => setSheet('')}>
          <pre>{sheet}</pre>
          {typeof sheet === 'string' && sheet.length > 20 && (
            <button
              className="btn"
              style={{ marginTop: 10 }}
              onClick={async () => {
                const { speakSegments } = await import('../lib/speech')
                await speakSegments([{ lang: 'en', text: sheet }], settings.au)
              }}
            >
              🔊 Read it aloud
            </button>
          )}
        </Sheet>
      )}
    </div>
  )
}

function ResultTable({ res }: { res: RunResult }) {
  if (!res.ok) {
    return (
      <div className="card" style={{ borderColor: 'var(--bad)' }}>
        <b className="small">SQL error</b>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{res.error}</pre>
      </div>
    )
  }
  if (!res.rows.length) return <div className="card small muted">Ran fine — no rows returned ({res.ms} ms).</div>
  return (
    <div className="card">
      <div className="tiny muted" style={{ marginBottom: 6 }}>
        {res.rows.length} rows in {res.ms} ms
      </div>
      <div className="tbl">
        <table className="res">
          <thead>
            <tr>
              {res.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.rows.slice(0, 100).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c === null ? 'NULL' : String(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FreePlay({
  sql,
  setSql,
  db,
  res,
  run,
  tables,
}: {
  sql: string
  setSql: (s: string) => void
  db: Database
  res: RunResult | null
  run: () => void
  tables: string[]
}) {
  return (
    <div className="stack">
      <div className="card stack-sm">
        <b className="small">Free playground</b>
        <div className="tiny muted">Tables: {tables.join(', ')}</div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT * FROM employees LIMIT 10;"
          style={{ fontFamily: 'var(--mono)', minHeight: 120 }}
          spellCheck={false}
        />
        <div className="row">
          <button className="btn primary" onClick={run}>
            ▶ Run
          </button>
          {tables.map((t) => (
            <button key={t} className="btn sm ghost" onClick={() => setSql(`SELECT * FROM ${t} LIMIT 20;`)}>
              {t}
            </button>
          ))}
        </div>
        <div className="scroll-x">
          {QUICK_INSERT.map((q, i) => (
            <button key={i} className="btn sm ghost" onClick={() => setSql(q)}>
              {q.slice(0, 34)}…
            </button>
          ))}
        </div>
      </div>
      {res && <ResultTable res={res} />}
    </div>
  )
}

/* Progress is kept in a tiny kv row so it survives a reload. */
async function db_getDone(): Promise<Record<string, 1>> {
  const { db } = await import('../lib/db')
  const row = await db.kv.get('labDone')
  return (row?.value as Record<string, 1>) || {}
}
async function db_setDone(v: Record<string, 1>) {
  const { db } = await import('../lib/db')
  await db.kv.put({ key: 'labDone', value: v })
}
