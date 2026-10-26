/** AI Studio (D-01, D-02, D-06, D-07, D-10): Agent, Live interview, Smart
 *  review, CV ↔ JD, Stories, and the coach chat — all in one place. */
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { agentTurn, buildStory, cvMatch, nextInterviewQuestion, parseToolCall, planMyDay, stripToolCall } from '../lib/features'
import { aiJson, aiReady, aiText, aiWhy } from '../lib/ai'
import { useSettings } from '../lib/settings'
import { listen, recognitionAvailable, recError, speakSegments, stopSpeaking, ttsAvailable } from '../lib/speech'
import type { RecHandle } from '../lib/speech'
import { dueCodes, weakestCodes } from '../lib/fsrs'
import { Chip, Chips, Empty, Loading, Md, toast } from '../components/ui'
import { LANG_NAME, type Question } from '../lib/types'
import { stripHtml } from '../lib/text'

type Tab = 'agent' | 'live' | 'review' | 'cv' | 'stories' | 'chat'
interface Msg { role: 'me' | 'ai'; text: string }

export default function AiStudio() {
  const [tab, setTab] = useState<Tab>('agent')
  if (!aiReady()) {
    return (
      <div className="stack">
        <div className="card stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>AI Studio</h2>
          <p className="small muted">Everything here needs a model. It takes one tap to connect one.</p>
          <div className="card small" style={{ borderColor: 'var(--warn)' }}>{aiWhy()}</div>
          <a className="btn primary" href="/progress">
            Open AI Connect
          </a>
          <p className="tiny muted" style={{ margin: 0 }}>
            Or keep using the app offline: the library, SQL Lab, downloads, flashcard mocks and every
            translation already saved on this device all work with no AI.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="stack">
      <div className="scroll-x">
        {(
          [
            ['agent', '🤖 Agent'],
            ['live', '🎙 Live interview'],
            ['review', '🧠 Smart review'],
            ['cv', '📄 CV ↔ JD'],
            ['stories', '⭐ Stories'],
            ['chat', '💬 Coach'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <Chip key={id} on={tab === id} onClick={() => setTab(id)}>
            {label}
          </Chip>
        ))}
      </div>
      {tab === 'agent' && <Agent />}
      {tab === 'live' && <Live />}
      {tab === 'review' && <SmartReview />}
      {tab === 'cv' && <CvMatch />}
      {tab === 'stories' && <Stories />}
      {tab === 'chat' && <Coach />}
    </div>
  )
}

/* --------------------------- D-02 agent ---------------------------- */

const TOOLS = [
  { name: 'search_questions', description: 'find questions in the 1,950-question bank by meaning or keyword. args: {q: string, limit?: number}' },
  { name: 'get_progress', description: 'read the candidate’s ratings, reviews due and weak topics. args: {}' },
  { name: 'mark_weak', description: 'mark a question weak so it comes back sooner. args: {code: string}' },
  { name: 'make_playlist', description: 'build a Listen or Mock playlist. args: {codes: string[], label: string}' },
  { name: 'list_saved', description: 'list questions the candidate has already saved or imported. args: {}' },
]

function Agent() {
  const { settings } = useSettings()
  const [q, setQ] = useState('')
  const [log, setLog] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)

  const ask = async (text: string) => {
    if (!text.trim()) return
    setQ('')
    setBusy(true)
    const history = log.map((m) => ({ role: m.role === 'me' ? ('user' as const) : ('assistant' as const), content: m.text }))
    try {
      let out = ''
      let guard = 0
      // Allow up to 3 tool round-trips.
      while (guard++ < 4) {
        const reply = await agentTurn({ history, tools: TOOLS, context: await context(), lang: settings.lang })
        const call = parseToolCall(reply)
        if (!call || !TOOLS.some((t) => t.name === call.tool)) {
          out = stripToolCall(reply) || reply
          break
        }
        const result = await runTool(call.tool, call.args)
        history.push({ role: 'assistant', content: reply })
        history.push({ role: 'user', content: `Tool result:\n${result}` })
      }
      setLog((l) => [...l, { role: 'me', text }, { role: 'ai', text: out }])
    } catch (e) {
      setLog((l) => [...l, { role: 'me', text }, { role: 'ai', text: `Could not do that: ${(e as Error).message}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card small muted">
        This agent searches your bank, reads your progress, and can mark weak spots or build a playlist. It only
        reaches what is already on this device.
      </div>
      {log.map((m, i) => (
        <div key={i} className={`msg ${m.role === 'me' ? 'me' : 'ai'}`}>
          <Md text={m.text} lang={settings.lang} />
        </div>
      ))}
      {busy && <div className="row muted small"><span className="spin" /> thinking…</div>}
      <div className="chips">
        {['Quiz me on my weak Laravel questions', 'What should I revise today?', 'Make me a 10-question Redis drill', 'What am I worst at?'].map((s) => (
          <Chip key={s} onClick={() => void ask(s)}>
            {s}
          </Chip>
        ))}
      </div>
      <div className="composer">
        <textarea
          className="grow"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything about your preparation…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ask(q)
            }
          }}
        />
        <button className="btn primary" onClick={() => void ask(q)} disabled={busy || !q.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

async function context(): Promise<string> {
  const [ratings, due] = await Promise.all([db.ratings.toArray(), dueCodes(50)])
  const weak = ratings.filter((r) => r.rating === 1).length
  const solid = ratings.filter((r) => r.rating === 3).length
  return `CANDIDATE STATE\nPractised: ${ratings.length}\nWeak: ${weak}\nSolid: ${solid}\nDue for review: ${due.length}\nOwn questions: ${(await db.questions.filter((q) => !['b', 'n'].includes(q.s)).count())}`
}

async function runTool(name: string, args: any): Promise<string> {
  switch (name) {
    case 'search_questions': {
      const all = await db.questions.toArray()
      const terms = String(args?.q || '').toLowerCase().split(/\s+/).filter(Boolean)
      const hit = all
        .filter((q) => terms.every((t) => (q.search || '').includes(t)))
        .slice(0, args?.limit || 12)
      if (!hit.length) return 'No questions matched.'
      return hit.map((q) => `${q.code} [${q.p}] ${q.q}`).join('\n')
    }
    case 'get_progress':
      return await context()
    case 'mark_weak': {
      const code = String(args?.code || '')
      if (!code) return 'No code given.'
      const { review } = await import('../lib/fsrs')
      await review(code, 1, 'agent')
      return `Marked ${code} weak.`
    }
    case 'make_playlist': {
      const codes: string[] = Array.isArray(args?.codes) ? args.codes.map(String) : []
      if (!codes.length) return 'No codes given.'
      const mod = await import('../lib/player')
      await mod.usePlayer.getState().load(codes, { label: String(args?.label || 'Agent playlist') })
      return `Loaded ${codes.length} questions into the player.`
    }
    case 'list_saved': {
      const own = await db.questions.filter((q) => !['b', 'n'].includes(q.s)).toArray()
      return own.length ? own.map((q) => `${q.code} ${q.q}`).join('\n') : 'No saved or imported questions yet.'
    }
    default:
      return `Unknown tool ${name}.`
  }
}

/* ----------------------- D-04 live interviewer ---------------------- */

const PERSONAS = ['friendly', 'technical', 'stern', 'hr']

function Live() {
  const { settings } = useSettings()
  const [persona, setPersona] = useState('friendly')
  const [q, setQ] = useState<Question | null>(null)
  const [asked, setAsked] = useState(0)
  const [said, setSaid] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ q: string; a: string; follow: string }[]>([])
  const rec = useRef<RecHandle | null>(null)
  const [listening, setListening] = useState(false)

  const start = async () => {
    stopSpeaking()
    const pick = (await db.questions.toArray()).filter((x) => x.f?.includes('i'))
    const first = pick[Math.floor(Math.random() * pick.length)]
    setQ(first)
    setSaid(first.q)
    setAsked(1)
    setDone([])
    if (ttsAvailable()) void speakSegments([{ lang: 'en', text: first.q }], settings.au)
  }

  const send = async () => {
    if (!q || !answer.trim()) return
    setBusy(true)
    try {
      const { nextInterviewQuestion } = await import('../lib/features')
      const r = await nextInterviewQuestion({ question: q, asked, lastAnswer: answer, lang: settings.lang })
      setDone((d) => [...d, { q: said, a: answer, follow: r.say }])
      setSaid(r.say)
      setAnswer('')
      setAsked((n) => n + 1)
      if (ttsAvailable()) void speakSegments([{ lang: 'en', text: r.say }], settings.au)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!q) {
    return (
      <div className="card stack-sm">
        <b>Live voice interview</b>
        <p className="small muted">The interviewer asks, you answer out loud, and it follows up on what you said.</p>
        <Chips>
          {PERSONAS.map((p) => (
            <Chip key={p} on={persona === p} onClick={() => setPersona(p)}>
              {p}
            </Chip>
          ))}
        </Chips>
        <button className="btn primary" onClick={() => void start()}>
          Start
        </button>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="spread">
          <span className="badge">{persona}</span>
          <span className="tiny muted">Question {asked}</span>
        </div>
        <div className="qtext" style={{ marginTop: 8 }}>{said}</div>
        {ttsAvailable() && (
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => void speakSegments([{ lang: 'en', text: said }], settings.au)}>
            🔊 Repeat
          </button>
        )}
      </div>
      <div className="card stack-sm">
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer out loud, or type here…" />
        <div className="row">
          {recognitionAvailable() && (
            <button
              className="btn"
              onClick={() => {
                if (listening) return rec.current?.stop()
                const h = listen({
                  lang: 'en-US',
                  onFinal: (r) => { setAnswer(r.text); setListening(false) },
                  onError: (c) => { setListening(false); toast(recError(c)) },
                })
                if (!h) return toast('This browser cannot listen.')
                rec.current = h
                setListening(true)
              }}
            >
              {listening ? '⏹ Stop' : '🎤 Speak'}
            </button>
          )}
          <button className="btn primary grow" onClick={() => void send()} disabled={busy || !answer.trim()}>
            {busy ? '…' : 'Answer'}
          </button>
        </div>
      </div>
      {!!done.length && (
        <details className="card">
          <summary className="small">Transcript so far</summary>
          <div className="small" style={{ marginTop: 8 }}>
            {done.map((d, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <b>Q:</b> {d.q}
                <br />
                <b>A:</b> {d.a}
                <br />
                <b>→</b> {d.follow}
              </div>
            ))}
          </div>
        </details>
      )}
      <button className="btn" onClick={() => { setQ(null); setDone([]); stopSpeaking() }}>
        End interview
      </button>
    </div>
  )
}

/* -------------------------- D-05 review ---------------------------- */

function SmartReview() {
  const { settings } = useSettings()
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    try {
      const weak = await weakestCodes(30)
      const rows = (await db.questions.bulkGet(weak)).filter(Boolean) as Question[]
      setOut(
        await planMyDay({
          weak: rows.map((q) => ({ q: q.q, tech: q.p })),
          due: (await dueCodes(100)).length,
          minutes: 30,
          lang: settings.lang,
        }),
      )
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card stack-sm">
        <b>Smart review</b>
        <p className="small muted">Uses your weak questions and what is due to build a session for today.</p>
        <button className="btn primary" onClick={() => void go()} disabled={busy}>
          {busy ? 'Planning…' : 'Plan my day'}
        </button>
      </div>
      {out && <div className="card"><Md text={out} lang={settings.lang} /></div>}
    </div>
  )
}

/* -------------------------- D-06 CV ↔ JD --------------------------- */

function CvMatch() {
  const { settings } = useSettings()
  const [cv, setCv] = useState('')
  const [jd, setJd] = useState('')
  const [out, setOut] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="stack">
      <div className="card stack-sm">
        <label className="fld">
          Paste your CV (or upload a .txt / .md)
          <textarea value={cv} onChange={(e) => setCv(e.target.value)} style={{ minHeight: 140 }} />
        </label>
        <input
          type="file"
          accept=".txt,.md,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setCv(await f.text())
          }}
        />
        <label className="fld">
          Paste the job description
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} style={{ minHeight: 120 }} />
        </label>
        <button
          className="btn primary"
          disabled={busy || !cv.trim() || !jd.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              setOut(await cvMatch(cv, jd, settings.profile, settings.lang))
            } catch (e) {
              toast((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Comparing…' : 'Compare'}
        </button>
        <p className="tiny muted" style={{ margin: 0 }}>
          A PDF or DOCX is parsed on the server when one is connected; otherwise paste the text.
        </p>
      </div>
      {out && (
        <div className="stack">
          <div className="card row">
            <span className="badge hl">{out.score}% match</span>
          </div>
          <div className="card"><Md text={out.match} lang={settings.lang} /></div>
          {!!out.strongerBullets?.length && (
            <div className="card">
              <b className="small">Stronger CV bullets</b>
              <ul className="small">{out.strongerBullets.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
          {!!out.projectQuestions?.length && (
            <div className="card">
              <b className="small">They will ask about your projects</b>
              <ul className="small">{out.projectQuestions.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
          {out.pitch && <div className="card"><b className="small">60-second intro</b><Md text={out.pitch} /></div>}
          {!!out.gaps?.length && (
            <div className="card">
              <b className="small">Before you apply</b>
              <ul className="small">{out.gaps.map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------- D-07 stories --------------------------- */

function Stories() {
  const { settings } = useSettings()
  const rows = useLiveQuery(() => db.stories.orderBy('updatedAt').reverse().toArray(), [], [])
  const [comp, setComp] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="stack">
      <div className="card stack-sm">
        <b>STAR story builder</b>
        <label className="fld">
          Competency
          <input value={comp} onChange={(e) => setComp(e.target.value)} placeholder="Conflict resolution" />
        </label>
        <label className="fld">
          Rough notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any rough details; the model shapes it into a story with a measurable result." />
        </label>
        <button
          className="btn primary"
          disabled={busy || !comp.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              const s = await buildStory({ competency: comp, notes, lang: settings.lang })
              await db.stories.put({ id: `st-${Date.now().toString(36)}`, competency: comp, ...s, updatedAt: Date.now() })
              setComp('')
              setNotes('')
              toast('Story saved.')
            } catch (e) {
              toast((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Writing…' : 'Build the story'}
        </button>
      </div>
      {!!rows?.length && (
        <div className="stack">
          {rows.map((s) => (
            <div className="card stack-sm" key={s.id}>
              <b>{s.competency}</b>
              <div className="small"><b>Situation:</b> {s.situation}</div>
              <div className="small"><b>Task:</b> {s.task}</div>
              <div className="small"><b>Action:</b> {s.action}</div>
              <div className="small"><b>Result:</b> {s.result}</div>
              {s.spoken30 && (
                <details>
                  <summary className="small">30-second version</summary>
                  <div className="small" style={{ marginTop: 6 }}>
                    {s.spoken30}{' '}
                    {ttsAvailable() && (
                      <button className="btn sm ghost" onClick={() => void speakSegments([{ lang: 'en', text: s.spoken30! }], settings.au)}>🔊</button>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------- D-10 coach ----------------------------- */

function Coach() {
  const { settings } = useSettings()
  const [log, setLog] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')

  const send = async (text: string) => {
    if (!text.trim()) return
    const history = [...log, { role: 'me' as const, text }]
    setLog([...history, { role: 'ai', text: '' }])
    setQ('')
    setBusy('chat')
    try {
      const ctx = await context()
      const full = await aiText(
        [
          { role: 'user', content: `You are the Interview Box coach for a senior Laravel developer in Lahore. Use the state below. Answer in ${LANG_NAME[settings.lang]}. Keep it short and practical.\n\n${ctx}` },
          ...history.map((m) => ({ role: m.role === 'me' ? ('user' as const) : ('assistant' as const), content: m.text })),
        ],
        { task: 'chat' },
      )
      setLog([...history, { role: 'ai', text: full }])
    } catch (e) {
      setLog([...history, { role: 'ai', text: `Could not do that: ${(e as Error).message}` }])
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="stack">
      {log.map((m, i) => (
        <div key={i} className={`msg ${m.role === 'me' ? 'me' : 'ai'}`}>
          {m.text ? <Md text={m.text} lang={settings.lang} /> : <span className="spin" />}
        </div>
      ))}
      {!log.length && <Empty title="Ask the coach" hint="It can see your ratings, what is due, and your bank." />}
      <div className="chips">
        {['How do I answer “tell me about yourself”?', 'What should I revise today?', 'How do I explain a hard bug I fixed?'].map((s) => (
          <Chip key={s} onClick={() => void send(s)}>{s}</Chip>
        ))}
      </div>
      <div className="composer">
        <textarea className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the coach…" />
        <button className="btn primary" onClick={() => void send(q)} disabled={!!busy || !q.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
