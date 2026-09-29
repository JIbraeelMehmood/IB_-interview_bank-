/** Mock interview (A-09, D-04): AI grading with cross-questions, or flashcards
 *  self-rated. Two personas, a timer, the mic, and a final scorecard. */
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deviceId } from '../lib/db'
import { review } from '../lib/fsrs'
import { mockCodes, DEFAULT_FILTERS } from '../lib/queries'
import { gradeAnswer, mockScorecard } from '../lib/features'
import { listen, recognitionAvailable, recError, stopSpeaking, pickVoice, ttsAvailable, speakSegments } from '../lib/speech'
import type { RecHandle } from '../lib/speech'
import { useSettings } from '../lib/settings'
import type { MockEval, MockSession, Question, Scorecard } from '../lib/types'
import { Chip, Chips, Empty, Md, Sheet, toast } from '../components/ui'
import { aiReady, aiWhy } from '../lib/ai'
import { stripHtml } from '../lib/text'

const PERSONAS = [
  { id: 'friendly', label: 'Friendly', note: 'Warm, encouraging, focuses on your story' },
  { id: 'technical', label: 'Deep technical', note: 'Dives into internals and trade-offs' },
  { id: 'hr', label: 'HR screen', note: 'Behavioural, motivation, salary' },
  { id: 'stern', label: 'Stern', note: 'Short questions, quick follow-ups' },
]

export default function Mock() {
  const { settings } = useSettings()
  const [started, setStarted] = useState(false)
  const [source, setSource] = useState('important')
  const [persona, setPersona] = useState('friendly')
  const [mode, setMode] = useState<'ai' | 'flash'>(aiReady() ? 'ai' : 'flash')
  const [count, setCount] = useState(8)

  if (started) return <Runner source={source} persona={persona} mode={mode} count={count} onExit={() => setStarted(false)} />

  return (
    <div className="stack">
      <div className="card">
        <h2 style={{ fontSize: '1.05rem' }}>Mock interview</h2>
        <p className="small muted">
          Answer out loud, the way you would in the room. Questions are graded 0–10 with a cross-question
          afterwards.
        </p>
      </div>

      <div className="card stack-sm">
        <strong className="small">Which questions?</strong>
        <Chips>
          {[
            { id: 'important', l: 'Most important' },
            { id: 'weak', l: 'My weak ones' },
            { id: 'all', l: 'Everything' },
          ].map((s) => (
            <Chip key={s.id} on={source === s.id} onClick={() => setSource(s.id)}>
              {s.l}
            </Chip>
          ))}
        </Chips>
      </div>

      <div className="card stack-sm">
        <strong className="small">Who is interviewing you?</strong>
        <Chips>
          {PERSONAS.map((p) => (
            <Chip key={p.id} on={persona === p.id} onClick={() => setPersona(p.id)} title={p.note}>
              {p.label}
            </Chip>
          ))}
        </Chips>
        <span className="tiny muted">{PERSONAS.find((p) => p.id === persona)?.note}</span>
      </div>

      <div className="card stack-sm">
        <strong className="small">How?</strong>
        <Chips>
          <Chip on={mode === 'ai'} onClick={() => setMode('ai')} title={aiWhy()}>
            ✨ AI grades each answer
          </Chip>
          <Chip on={mode === 'flash'} onClick={() => setMode('flash')}>
            🃏 Flashcards, I rate myself
          </Chip>
        </Chips>
        {mode === 'ai' && !aiReady() && (
          <div className="card small" style={{ borderColor: 'var(--warn)' }}>
            {aiWhy()} <a href="/help">How to fix →</a>
          </div>
        )}
        {!recognitionAvailable() && (
          <div className="card small" style={{ borderColor: 'var(--warn)' }}>
            This browser cannot listen. You can still type your answer, or use your keyboard’s 🎤 key.
          </div>
        )}
      </div>

      <div className="card stack-sm">
        <label className="fld">
          How many questions — {count}
          <input
            type="range"
            min={3}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
      </div>

      <button className="btn primary block" onClick={() => setStarted(true)} disabled={mode === 'ai' && !aiReady()}>
        Start interview
      </button>

      <History />
    </div>
  )
}

function Runner({
  source,
  persona,
  mode,
  count,
  onExit,
}: {
  source: string
  persona: string
  mode: 'ai' | 'flash'
  count: number
  onExit: () => void
}) {
  const { settings } = useSettings()
  const [codes, setCodes] = useState<string[]>([])
  const [i, setI] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evalr, setEvalr] = useState<MockEval | null>(null)
  const [busy, setBusy] = useState(false)
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [done, setDone] = useState<Scorecard | null>(null)
  const [turns, setTurns] = useState<{ q: string; me: string; score?: number }[]>([])
  const [showRef, setShowRef] = useState(false)
  const rec = useRef<RecHandle | null>(null)
  const t0 = useRef(Date.now())

  useEffect(() => {
    void (async () => {
      const list = await mockCodes(source, { ...DEFAULT_FILTERS })
      const picked = list.slice(0, count)
      setCodes(picked)
      const first = await db.questions.get(picked[0])
      setQ(first || null)
      t0.current = Date.now()
      if (first && ttsAvailable()) {
        void speakSegments([{ lang: 'en', text: first.q }], settings.au)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRec = () => {
    const h = listen({
      lang: 'en-US',
      onInterim: setInterim,
      onFinal: (r) => {
        setAnswer(r.text)
        setListening(false)
      },
      onError: (c) => {
        setListening(false)
        toast(recError(c))
      },
    })
    if (!h) {
      toast('This browser cannot listen. Type your answer instead.')
      return
    }
    rec.current = h
    setListening(true)
  }

  const submit = async () => {
    if (!q || !answer.trim()) return
    setBusy(true)
    const text = answer.trim()
    try {
      if (mode === 'ai') {
        const e = await gradeAnswer(q, text, settings.profile, settings.lang)
        setEvalr(e)
        setTurns((t) => [...t, { q: q.q, me: text, score: e.score }])
      } else {
        setShowRef(true)
      }
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    stopSpeaking()
    const n = i + 1
    if (n >= codes.length) {
      // Finish.
      if (mode === 'ai') {
        setBusy(true)
        try {
          const sc = await mockScorecard(turns, settings.profile, settings.lang)
          setDone(sc)
        } catch {
          /* keep the transcript even if the scorecard fails */
        } finally {
          setBusy(false)
        }
      } else {
        setDone({ overall: 0, technical: 0, communication: 0, confidence: 0, verdict: '', strengths: [], risks: [], tip: '' })
      }
      return
    }
    setI(n)
    const nq = await db.questions.get(codes[n])
    setQ(nq || null)
    setAnswer('')
    setEvalr(null)
    setShowRef(false)
    setInterim('')
    t0.current = Date.now()
    if (nq && ttsAvailable()) void speakSegments([{ lang: 'en', text: nq.q }], settings.au)
  }

  const selfRate = async (n: 1 | 2 | 3) => {
    const cur = q
    if (!cur) return
    await review(cur.code, n, deviceId())
    setTurns((t) => [...t, { q: cur.q, me: answer, score: n === 1 ? 3 : n === 2 ? 6 : 9 }])
    void next()
  }

  if (done) return <Result scorecard={done} turns={turns} onExit={onExit} mode={mode} />

  if (!q) return <Empty title="Loading the first question…" />

  const elapsed = Math.round((Date.now() - t0.current) / 1000)

  return (
    <div className="stack">
      <div className="spread">
        <span className="small muted">
          Question {i + 1} of {codes.length} · {PERSONAS.find((p) => p.id === persona)?.label}
        </span>
        <button className="btn sm ghost" onClick={onExit}>
          End
        </button>
      </div>
      <div className="bar">
        <i style={{ width: `${((i + (evalr ? 1 : 0)) / codes.length) * 100}%` }} />
      </div>

      <div className="card">
        <div className="qtext">{q.q}</div>
        {ttsAvailable() && (
          <button
            className="btn sm"
            style={{ marginTop: 10 }}
            onClick={() => void speakSegments([{ lang: 'en', text: q.q }], settings.au)}
          >
            🔊 Read it to me
          </button>
        )}
      </div>

      <div className="card stack-sm">
        <div className="spread">
          <strong className="small">Your answer</strong>
          <span className="tiny muted">{elapsed}s</span>
        </div>
        {listening && <div className="small muted">Listening… {interim}</div>}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            recognitionAvailable()
              ? 'Tap the mic and speak, or type here.'
              : 'Type your answer, or use your keyboard’s 🎤 dictation key.'
          }
        />
        <div className="row">
          {recognitionAvailable() && (
            <button className="btn" onClick={() => (listening ? rec.current?.stop() : startRec())}>
              {listening ? '⏹ Stop' : '🎤 Speak'}
            </button>
          )}
          <button className="btn primary grow" onClick={() => void submit()} disabled={busy || !answer.trim()}>
            {busy ? 'Grading…' : 'Submit answer'}
          </button>
        </div>
      </div>

      {mode === 'flash' && showRef && (
        <div className="card stack-sm">
          <strong className="small">Reference answer</strong>
          <div className="small" dangerouslySetInnerHTML={{ __html: q.a }} />
          <div className="rate">
            {([1, 2, 3] as const).map((n) => (
              <button key={n} className={`r${n}`} onClick={() => void selfRate(n)}>
                {n === 1 ? 'Missed it' : n === 2 ? 'Partly' : 'Nailed it'}
              </button>
            ))}
          </div>
        </div>
      )}

      {evalr && (
        <div className="card stack-sm">
          <div className="row">
            <span className={`badge ${evalr.score >= 7 ? 'ok' : evalr.score >= 4 ? 'warn' : 'bad'}`}>
              {evalr.score}/10
            </span>
            <b className="grow">{evalr.verdict}</b>
          </div>
          {!!evalr.strengths.length && (
            <div>
              <b className="small">What you got right</b>
              <ul className="small">
                {evalr.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {!!evalr.missing.length && (
            <div>
              <b className="small">What was missing</b>
              <ul className="small">
                {evalr.missing.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {evalr.better && (
            <div>
              <b className="small">A stronger answer</b>
              <div className="small">
                <Md text={evalr.better} />
              </div>
            </div>
          )}
          {evalr.tip && <div className="small">💡 {evalr.tip}</div>}
          <button className="btn primary" onClick={() => void next()}>
            {i + 1 >= codes.length ? 'Finish' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  )
}

function Result({
  scorecard,
  turns,
  onExit,
  mode,
}: {
  scorecard: Scorecard
  turns: { q: string; me: string; score?: number }[]
  onExit: () => void
  mode: 'ai' | 'flash'
}) {
  const avg = turns.length
    ? (turns.reduce((a, t) => a + (t.score || 0), 0) / turns.length).toFixed(1)
    : '0'
  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>Interview finished</h2>
        {mode === 'ai' ? (
          <>
            <div className="row">
              <span className="badge hl">Average {avg}/10</span>
              {scorecard.technical > 0 && <span className="badge">Technical {scorecard.technical}</span>}
              {scorecard.communication > 0 && <span className="badge">Comms {scorecard.communication}</span>}
              {scorecard.confidence > 0 && <span className="badge">Confidence {scorecard.confidence}</span>}
            </div>
            {scorecard.verdict && <p className="small">{scorecard.verdict}</p>}
            {!!scorecard.strengths.length && (
              <div>
                <b className="small">Strengths</b>
                <ul className="small">
                  {scorecard.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!scorecard.risks.length && (
              <div>
                <b className="small">Risks</b>
                <ul className="small">
                  {scorecard.risks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {scorecard.tip && <div className="small">🎯 {scorecard.tip}</div>}
          </>
        ) : (
          <p className="small">
            You rated {turns.length} answers yourself. Anything you marked weak has been rescheduled to come
            back sooner.
          </p>
        )}
      </div>
      <button className="btn primary" onClick={onExit}>
        Done
      </button>
    </div>
  )
}

function History() {
  const rows = useLiveQuery(() => db.mocks.orderBy('at').reverse().limit(5).toArray(), [], [])
  if (!rows?.length) return null
  return (
    <div className="card stack-sm">
      <strong className="small">Recent sessions</strong>
      {rows.map((m: MockSession) => (
        <div className="spread small" key={m.id}>
          <span>
            {new Date(m.at).toLocaleDateString()} · {m.turns.length} questions
          </span>
          <span className="muted">
            {m.turns.filter((t) => t.eval).length
              ? `avg ${(
                  m.turns.reduce((a, t) => a + (t.eval?.score || 0), 0) /
                  Math.max(1, m.turns.filter((t) => t.eval).length)
                ).toFixed(1)}`
              : m.mode}
          </span>
        </div>
      ))}
    </div>
  )
}
