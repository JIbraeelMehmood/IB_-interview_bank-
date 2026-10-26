/** Speaking coach (A-10, D-05): Today plan, Calm, Sounds, Shadow, Answer,
 *  Phrases. All content is the real v7 data from public/data/speaking.json. */
import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { useSettings } from '../lib/settings'
import { listen, pickVoice, recognitionAvailable, recError, speakSegments, ttsAvailable, stopSpeaking } from '../lib/speech'
import type { RecHandle } from '../lib/speech'
import { alignWords, words as normWords } from '../lib/text'
import { speechMetrics, speakingFeedback } from '../lib/features'
import { Chip, Chips, Md, toast } from '../components/ui'
import { aiReady, aiWhy } from '../lib/ai'
import type { SpeakingFeedback } from '../lib/types'

interface SpeakingData {
  sounds: Record<string, { t: string; why: string; how: string; pairs?: [string, string][] }>
  fixes: [string, string, string][]
  phrases: [string, string[]][]
  fnWords: Record<string, number>
  tabs: [string, string][]
  breathing: Record<string, { name: string; ph: [string, number, number][] }>
  practiceQs: string[]
  core: string[]
}

let cache: SpeakingData | null = null
async function load(): Promise<SpeakingData> {
  if (cache) return cache
  const data = (await (await fetch('/data/speaking.json')).json()) as SpeakingData
  cache = data
  return data
}

export default function Speak() {
  const { settings, setSpeaking } = useSettings()
  const sp = settings.sp
  const [data, setData] = useState<SpeakingData | null>(null)

  useEffect(() => {
    void load().then(setData)
  }, [])

  if (!data) return <p className="center muted">Loading…</p>

  const tabs: [string, string][] = [
    ['today', 'Today'],
    ['calm', '😮‍💨 Calm'],
    ['sounds', '🔤 Sounds'],
    ['shadow', '🗣 Shadow'],
    ['speak', '🎤 Answer'],
    ['phrases', '💬 Phrases'],
  ]

  return (
    <div className="stack">
      <div className="scroll-x">
        {tabs.map(([id, label]) => (
          <Chip key={id} on={sp.tab === id} onClick={() => setSpeaking({ tab: id as any })}>
            {label}
          </Chip>
        ))}
      </div>

      {sp.tab === 'today' && <Today data={data} />}
      {sp.tab === 'calm' && <Calm data={data} />}
      {sp.tab === 'sounds' && <Sounds data={data} />}
      {sp.tab === 'shadow' && <Shadow data={data} />}
      {sp.tab === 'speak' && <AnswerTab />}
      {sp.tab === 'phrases' && <Phrases data={data} />}
    </div>
  )
}

/** 10-minute daily plan with a streak. */
function Today({ data }: { data: SpeakingData }) {
  const { settings, setSpeaking } = useSettings()
  const sp = settings.sp
  const today = new Date().toISOString().slice(0, 10)
  const done = sp.days[today] || {}
  const streak = (() => {
    let n = 0
    const d = new Date()
    for (;;) {
      const k = d.toISOString().slice(0, 10)
      const y = sp.days[k]
      if (y && Object.keys(y).length >= 2) {
        n++
        d.setDate(d.getDate() - 1)
      } else break
    }
    return n
  })()

  const step = (id: string, label: string, go: () => void) => (
    <button
      className="btn block"
      style={{ justifyContent: 'space-between' }}
      onClick={() => {
        setSpeaking({ days: { ...sp.days, [today]: { ...done, [id]: 1 } } })
        go()
      }}
    >
      <span>{done[id] ? '✅' : '⬜'} {label}</span>
    </button>
  )

  return (
    <div className="stack">
      <div className="card row">
        <b className="grow">10-minute plan</b>
        {streak > 0 && <span className="badge hl">🔥 {streak} day streak</span>}
      </div>
      {step('calm', 'Calm — 1 min', () => setSpeaking({ tab: 'calm' }))}
      {step('sounds', 'Sounds — 3 min', () => setSpeaking({ tab: 'sounds' }))}
      {step('shadow', 'Shadow — read 5 lines after the model', () => setSpeaking({ tab: 'shadow' }))}
      {step('answer', 'Answer one question out loud', () => setSpeaking({ tab: 'speak' }))}
      <div className="card small muted">
        Strict English listening by default: if a strict listener understands you, an international interviewer
        will too. The model voice for shadowing is US or UK, so you copy a clear standard accent.
      </div>
    </div>
  )
}

/** Box breathing and cyclic sighing, with vibration where supported. */
function Calm({ data }: { data: SpeakingData }) {
  const [on, setOn] = useState(false)
  const [mode, setMode] = useState<'sigh' | 'box'>('box')
  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    if (!on) return
    const ph = data.breathing[mode].ph
    let i = 0
    let cancelled = false
    const stepFn = async () => {
      if (cancelled) return
      const [label, ms] = ph[i % ph.length]
      try {
        navigator.vibrate?.(Math.min(200, ms / 4))
      } catch {
        /* not supported */
      }
      i++
      setTimeout(stepFn, ms)
    }
    void stepFn()
    return () => {
      cancelled = true
    }
  }, [on, mode, data])

  return (
    <div className="stack">
      <div className="card center stack">
        <div className={on ? 'breath on' : 'breath'} aria-hidden="true" />
        <div className="small muted">
          {on ? 'Follow the circle. Breathe through the nose, out slowly through the mouth.' : 'Tap start'}
        </div>
        <Chips>
          <Chip on={mode === 'box'} onClick={() => setMode('box')}>
            Box breathing
          </Chip>
          <Chip on={mode === 'sigh'} onClick={() => setMode('sigh')}>
            Cyclic sighing
          </Chip>
        </Chips>
        <button className="btn primary" onClick={() => setOn((v) => !v)}>
          {on ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="card stack-sm">
        <b className="small">The day before</b>
        <ul className="small">
          <li>Sleep badly is normal. You will still be better prepared than most candidates.</li>
          <li>Say it out loud once: “I am nervous because I care about this, not because I can’t do the job.”</li>
          <li>Charge your phone. Open the app once so it works offline.</li>
          <li>Prepare water, a pen, and your printed resume.</li>
          <li>Arrive ten minutes early. Silence in the lift is not a judgement.</li>
        </ul>
      </div>
    </div>
  )
}

/** Drills for V/W, TH, S-clusters, -ed, vowels and word stress. */
function Sounds({ data }: { data: SpeakingData }) {
  const { settings, setSpeaking } = useSettings()
  const sp = settings.sp
  const [open, setOpen] = useState<string>(sp.focus)
  const focus = data.sounds[open] || data.sounds[sp.focus]
  if (!focus) return null

  return (
    <div className="stack">
      <Chips>
        {Object.keys(data.sounds).map((k) => (
          <Chip key={k} on={open === k} onClick={() => { setOpen(k); setSpeaking({ focus: k as any }) }}>
            {data.sounds[k].t}
          </Chip>
        ))}
      </Chips>
      <div className="card stack-sm">
        <b>{focus.t}</b>
        <p className="small" dangerouslySetInnerHTML={{ __html: focus.why }} />
        <div className="small" dangerouslySetInnerHTML={{ __html: focus.how }} />
        {ttsAvailable() && (
          <button
            className="btn sm"
            onClick={() => void speakSegments([{ lang: 'en', text: focus.t }], settings.au)}
          >
            🔊 Hear the words
          </button>
        )}
      </div>
      {!!focus.pairs?.length && (
        <div className="card stack-sm">
          <b className="small">Practise these</b>
          {focus.pairs.map(([a, b], i) => (
            <div className="spread" key={i}>
              <span className="small">
                {a} → {b}
              </span>
              {ttsAvailable() && (
                <button
                  className="btn sm ghost"
                  onClick={() => void speakSegments([{ lang: 'en', text: `${a}, ${b}` }], settings.au)}
                >
                  🔊
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Model voice reads a line; you repeat it and get a word-level score. */
function Shadow({ data }: { data: SpeakingData }) {
  const { settings, setSpeaking } = useSettings()
  const [line, setLine] = useState(0)
  const [interim, setInterim] = useState('')
  const [score, setScore] = useState<{ score: number; words: string[]; ok: boolean[] } | null>(null)
  const rec = useRef<RecHandle | null>(null)
  const target = data.core[line % data.core.length]

  const play = () => {
    if (!ttsAvailable()) return toast('No speech engine here — open in Chrome.')
    // A clear standard accent to copy: US or UK model voice.
    const voice = settings.sp.model === 'gb' ? 'en-GB' : 'en-US'
    void speakSegments([{ lang: 'en', text: target, gap: 400 }], { ...settings.au, voiceEn: '' })
    void voice
  }

  const tryIt = () => {
    const h = listen({
      lang: 'en-US',
      onInterim: setInterim,
      onFinal: (r) => {
        const a = alignWords(target, r.text)
        setScore(a)
        setSpeaking({
          shadowQ: [...new Set([target, ...settings.sp.shadowQ])].slice(0, 20),
        })
        const best = (settings.sp.best[target] || 0) < a.score ? a.score : settings.sp.best[target] || 0
        setSpeaking({ best: { ...settings.sp.best, [target]: best } })
      },
      onError: (c) => toast(recError(c)),
    })
    if (!h) return toast('This browser cannot listen. Use your keyboard’s 🎤 dictation instead.')
    rec.current = h
    setTimeout(() => h.stop(), 9000)
  }

  return (
    <div className="stack">
      <div className="card stack-sm">
        <div className="spread">
          <b className="small">Line {line + 1} of {data.core.length}</b>
          <Chips>
            <Chip on={settings.sp.model === 'us'} onClick={() => setSpeaking({ model: 'us' })}>
              US
            </Chip>
            <Chip on={settings.sp.model === 'gb'} onClick={() => setSpeaking({ model: 'gb' })}>
              UK
            </Chip>
          </Chips>
        </div>
        <p className="qtext">{target}</p>
        <div className="row">
          <button className="btn" onClick={play} disabled={!ttsAvailable()}>
            🔊 Play model
          </button>
          <button className="btn primary" onClick={tryIt} disabled={!recognitionAvailable()}>
            🎤 Repeat it
          </button>
          <button
            className="btn sm ghost"
            onClick={() => setLine((l) => (l + 1) % data.core.length)}
          >
            Next line
          </button>
        </div>
        {interim && <div className="small muted">{interim}</div>}
      </div>

      {score && (
        <div className="card stack-sm">
          <div className="spread">
            <b>Score</b>
            <span className={`badge ${score.score >= 80 ? 'ok' : score.score >= 50 ? 'warn' : 'bad'}`}>
              {score.score}%
            </span>
          </div>
          <div className="small">
            {score.words.map((w, i) => (
              <span key={i} className={`spw ${score.ok[i] ? 'ok' : 'miss'}`}>
                {w}{' '}
              </span>
            ))}
          </div>
          <div className="tiny muted">This is what the recogniser understood, not true accent analysis.</div>
        </div>
      )}
    </div>
  )
}

/** Answer a question out loud; offline metrics plus optional AI feedback. */
function AnswerTab() {
  const { settings, setSpeaking } = useSettings()
  const [q, setQ] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [metrics, setMetrics] = useState<ReturnType<typeof speechMetrics> | null>(null)
  const [fb, setFb] = useState<SpeakingFeedback | null>(null)
  const rec = useRef<RecHandle | null>(null)
  const t0 = useRef(0)

  const start = () => {
    t0.current = Date.now()
    const h = listen({
      lang: settings.sp.listener || 'en-US',
      onInterim: setInterim,
      onFinal: (r) => {
        setQ(r.text)
        setMetrics(speechMetrics(r.text, r.dur, r.pauses))
        setListening(false)
      },
      onError: (c) => {
        setListening(false)
        toast(recError(c))
      },
    })
    if (!h) return toast('This browser cannot listen. Type your answer instead.')
    rec.current = h
    setListening(true)
  }

  const analyse = async () => {
    if (!q.trim()) return
    setBusy(true)
    try {
      const m = metrics || speechMetrics(q, Math.max(20, q.split(/\s+/).length / 2))
      setMetrics(m)
      if (!aiReady()) {
        toast(aiWhy() || 'Offline metrics only — connect AI for full feedback.')
        return
      }
      setFb(
        await speakingFeedback({
          question: settings.sp.shadowQ[0] || 'Tell me about yourself.',
          transcript: q,
          metrics: m,
          lang: settings.lang,
          hasAudio: !settings.sp.written,
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
        <div className="row">
          <label className="row small grow">
            <input
              type="checkbox"
              checked={settings.sp.pressure}
              onChange={(e) => setSpeaking({ pressure: e.target.checked })}
              style={{ width: 'auto' }}
            />
            Pressure mode (90 s, I read the question aloud)
          </label>
        </div>
        <label className="row small">
          <input
            type="checkbox"
            checked={settings.sp.written}
            onChange={(e) => setSpeaking({ written: e.target.checked })}
            style={{ width: 'auto' }}
          />
          Written answer (skip pronunciation)
        </label>
        <select
          value={settings.sp.listener}
          onChange={(e) => setSpeaking({ listener: e.target.value })}
          aria-label="Listener accent"
        >
          <option value="en-US">Strict US listener</option>
          <option value="en-GB">Strict UK listener</option>
          <option value="en-IN">South Asian listener</option>
        </select>
      </div>

      <div className="card stack-sm">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Speak or type your answer here…"
        />
        {listening && <div className="small muted">Listening… {interim}</div>}
        <div className="row">
          {recognitionAvailable() && (
            <button className="btn" onClick={() => (listening ? rec.current?.stop() : start())}>
              {listening ? '⏹ Stop' : '🎤 Speak'}
            </button>
          )}
          <button className="btn primary grow" onClick={() => void analyse()} disabled={busy || !q.trim()}>
            {busy ? 'Analysing…' : 'Get feedback'}
          </button>
        </div>
      </div>

      {metrics && (
        <div className="card">
          <div className="row">
            <span className="badge">{metrics.wpm} wpm</span>
            <span className={`badge ${metrics.wpm >= 110 && metrics.wpm <= 160 ? 'ok' : 'warn'}`}>
              {metrics.wpm >= 110 && metrics.wpm <= 160 ? 'Good pace' : 'Slow or fast'}
            </span>
            <span className="badge">{metrics.fillers} fillers</span>
            <span className="badge">{metrics.restarts} restarts</span>
            <span className="badge">{metrics.words} words</span>
          </div>
        </div>
      )}

      {fb && (
        <div className="card stack-sm">
          <div><b className="small">Fluency</b> <span className="small">{fb.fluency}</span></div>
          <div><b className="small">Clarity</b> <span className="small">{fb.clarity}</span></div>
          <div><b className="small">Structure</b> <span className="small">{fb.structure}</span></div>
          {!!fb.grammar.length && (
            <div>
              <b className="small">Grammar</b>
              <ul className="small">
                {fb.grammar.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {!!fb.mispronounced.length && (
            <div>
              <b className="small">Likely mispronounced</b>
              <div className="small">{fb.mispronounced.join(', ')}</div>
            </div>
          )}
          {fb.better && (
            <div>
              <b className="small">A better spoken answer</b>
              <Md text={fb.better} />
            </div>
          )}
          {!!fb.practice.length && (
            <div>
              <b className="small">Practise these lines</b>
              <ul className="small">
                {fb.practice.map((p, i) => (
                  <li key={i}>
                    {p}{' '}
                    {ttsAvailable() && (
                      <button
                        className="btn sm ghost"
                        onClick={() => void speakSegments([{ lang: 'en', text: p }], settings.au)}
                      >
                        🔊
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fb.tip && <div className="small">💡 {fb.tip}</div>}
        </div>
      )}
    </div>
  )
}

/** Answer structures, South Asian English fixes, and the rescue phrases. */
function Phrases({ data }: { data: SpeakingData }) {
  const { settings } = useSettings()
  const [open, setOpen] = useState(0)
  return (
    <div className="stack">
      <div className="card stack-sm">
        <b className="small">Answer structures</b>
        {data.phrases.map(([title, lines], i) => (
          <div key={i}>
            <button className="btn sm ghost" onClick={() => setOpen(open === i ? -1 : i)}>
              {open === i ? '▾' : '▸'} {title}
            </button>
            {open === i && (
              <ul className="small">
                {lines.map((l, j) => (
                  <li key={j}>
                    {l}{' '}
                    {ttsAvailable() && (
                      <button
                        className="btn sm ghost"
                        onClick={() => void speakSegments([{ lang: 'en', text: l }], settings.au)}
                      >
                        🔊
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="card stack-sm">
        <b className="small">16 fixes for South Asian English</b>
        <div className="tbl">
          <table className="res">
            <tbody>
              {data.fixes.map(([wrong, right, why], i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--bad)' }}>{wrong}</td>
                  <td style={{ color: 'var(--ok)' }}>{right}</td>
                  <td className="muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
