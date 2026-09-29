/** A question card. One clean action row (H-02), a 4-way language switch, the
 *  v7 key line and memory hook, and the card-level AI tools. */
import { useEffect, useState } from 'react'
import { db, deviceId } from '../lib/db'
import { review } from '../lib/fsrs'
import { getOrTranslate, getTranslation, spokenText, LANG_LABEL } from '../lib/translate'
import { useSettings } from '../lib/settings'
import { usePlayer } from '../lib/player'
import { queue } from '../lib/sync'
import { LANGS, LANG_NAME, LEVEL_NAME, type Lang, type Question, type Translation } from '../lib/types'
import { Md, Sheet, toast } from './ui'
import { explain, explainKey } from '../lib/features'
import { aiReady, aiWhy } from '../lib/ai'
import { voiceProblem } from '../lib/speech'
import { bidiFix, esc, md } from '../lib/text'

export function QCard({
  q,
  onChanged,
  selectedTechs = [],
}: {
  q: Question
  onChanged?: () => void
  /** Technologies currently being filtered on — shown first in the badge row. */
  selectedTechs?: string[]
}) {
  const { settings } = useSettings()
  const [lang, setLang] = useState<Lang>(settings.lang)
  const [tr, setTr] = useState<Translation | null>(null)
  const [busy, setBusy] = useState('')
  const [rate, setRate] = useState<0 | 1 | 2 | 3>(0)
  const [open, setOpen] = useState<'' | 'explain' | 'ai' | ''>('')
  const [explainOut, setExplainOut] = useState<ExplainState>({
    focus: 'both',
    style: 'simple',
    text: '',
    loading: false,
  })
  const player = usePlayer()

  useEffect(() => {
    setLang(settings.lang)
  }, [settings.lang])

  useEffect(() => {
    if (lang === 'en') {
      setTr(null)
      return
    }
    let live = true
    void getTranslation(q.code, lang).then((t) => {
      if (live) setTr(t)
    })
    return () => {
      live = false
    }
  }, [q.code, lang])

  // B-01 / C-01: the Listen button follows the tab you are looking at.
  const listen = async (useLang: Lang) => {
    if (busy) return
    const problem = voiceProblem()
    if (problem) {
      toast(problem)
      return
    }
    setBusy('listen')
    try {
      let entry = tr
      if (useLang !== 'en' && (!entry || !entry.sayq)) {
        const res = await getOrTranslate(q, useLang, { prefer: 'auto' })
        entry = res.entry
        setTr(entry)
        if (!entry) {
          toast('No translation yet — connect AI, or use the free translator.')
          return
        }
        if (!entry.say) {
          const say = await spokenText(q.code, useLang)
          entry = { ...entry, ...say }
        }
      }
      const { speakSegments } = await import('../lib/speech')
      await speakSegments(
        [
          { lang: 'en', text: q.q },
          { lang: useLang, text: entry?.say || entry?.a || '', gap: settings.au.gap },
          { lang: 'en', text: entry?.key || '' },
          { lang: useLang, text: entry?.sayhook || entry?.hook || '' },
        ],
        settings.au,
      )
    } finally {
      setBusy('')
    }
  }

  const rateIt = async (n: 1 | 2 | 3) => {
    setRate(n)
    await review(q.code, n, deviceId())
    onChanged?.()
    toast(
      n === 1
        ? 'Marked weak — it will come back soon.'
        : n === 2
          ? 'Marked okay.'
          : 'Marked solid — spaced out further.',
    )
  }

  const translateNow = async () => {
    if (lang === 'en') return
    setBusy('tr')
    try {
      const res = await getOrTranslate(q, lang, { prefer: 'ai' })
      if (res.entry) {
        setTr(res.entry)
        toast(
          res.source === 'machine'
            ? 'Machine translation (free). Connect AI for a better one.'
            : res.source === 'builtin'
              ? 'Hand-written translation.'
              : 'Translated.',
        )
      } else {
        toast('Could not translate. Try AI Connect.')
      }
    } finally {
      setBusy('')
    }
  }

  const runExplain = async () => {
    setExplainOut((s) => ({ ...s, loading: true, text: '' }))
    try {
      const text = await explain(q, lang, explainOut.focus, explainOut.style)
      setExplainOut((s) => ({ ...s, text, loading: false }))
      await db.explains.put({
        id: explainKey(q, lang, explainOut.focus, explainOut.style),
        code: q.code,
        lang,
        focus: explainOut.focus,
        style: explainOut.style,
        markdown: text,
        updatedAt: Date.now(),
      })
    } catch (e) {
      setExplainOut((s) => ({ ...s, loading: false }))
      toast((e as Error).message)
    }
  }

  const showEnglish = lang === 'en'
  const bodyHtml = showEnglish ? q.a : tr?.a || ''
  const keyLine = showEnglish ? '' : tr?.key || ''
  const hook = showEnglish ? '' : tr?.hook || ''

  return (
    <>
      <article className="qcard">
        <header>
          <div className="qtext">{q.q}</div>
          <div className="qmeta">
            <span className={`badge ${q.l}`}>{LEVEL_NAME[q.l]}</span>
            {q.f?.includes('c') && <span className="badge hl">Most asked</span>}
            {q.f?.includes('i') && <span className="badge hl">Important</span>}
            {q.f?.includes('h') && <span className="badge">How it works</span>}
            {(() => {
              // Selected technologies first, so it is obvious why this card
              // matched. Then the rest, capped so the row cannot overflow.
              const rest = q.t.filter((t) => !selectedTechs.includes(t))
              const shown = [...selectedTechs.filter((t) => q.t.includes(t)), ...rest].slice(0, 6)
              const extra = q.t.length - shown.length
              return shown.map((t) => (
                <span
                  className={`badge ${selectedTechs.includes(t) ? 'ok' : ''}`}
                  key={t}
                >
                  {t}
                </span>
              ))
            })()}
            {q.ex && (
              <a className="badge" href="/lab" style={{ textDecoration: 'none' }}>
                🧪 SQL
              </a>
            )}
          </div>
        </header>

        <div className="qbody">
          {showEnglish ? (
            <div dangerouslySetInnerHTML={{ __html: q.a }} />
          ) : lang === 'ur' ? (
            <div className="ur" dir="rtl" dangerouslySetInnerHTML={{ __html: bidiFix(md(tr?.a || '')) }} />
          ) : lang === 'hi' ? (
            <div className="hi" dangerouslySetInnerHTML={{ __html: md(tr?.a || '') }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: md(tr?.a || '') }} />
          )}

          {!showEnglish && !tr && (
            <div className="card center stack-sm" style={{ marginTop: 10 }}>
              <span className="small">No {LANG_NAME[lang]} explanation yet.</span>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn sm primary" onClick={() => void translateNow()} disabled={!!busy}>
                  {busy === 'tr' ? 'Translating…' : 'Translate now'}
                </button>
                <a className="btn sm" href="/help">
                  How to connect AI
                </a>
              </div>
            </div>
          )}

          {keyLine && (
            <div className="keybox">
              <b>Say it in the interview:</b> {keyLine}
            </div>
          )}
          {hook && (
            <div className="hookbox">
              <b>Remember it:</b> {hook}
              {tr?.mt && <span className="tiny muted"> · machine translation</span>}
            </div>
          )}
        </div>

        <div className="actions">
          <button className="btn sm" onClick={() => void listen(lang)} disabled={!!busy}>
            🎧 {busy === 'listen' ? 'Playing…' : 'Listen'}
          </button>
          <button
            className="btn sm"
            disabled={!!busy}
            onClick={async () => {
              // `load` is async: playing before the queue is filled silently
              // does nothing, which is what this used to do.
              const problem = voiceProblem()
              if (problem) return toast(problem)
              await player.load([q.code], { label: q.p, lang })
              await player.play()
            }}
          >
            ▶ Queue
          </button>
          <button className="btn sm" onClick={() => setOpen('explain')}>
            💡 Explain
          </button>
          <button className="btn sm" onClick={() => setOpen('ai')} disabled={!aiReady()} title={aiWhy()}>
            ✨ AI
          </button>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
            aria-label="Answer language"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_NAME[l]}
              </option>
            ))}
          </select>
        </div>

        <div className="actions" style={{ paddingTop: 0 }}>
          <div className="rate grow">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                className={`r${n}`}
                aria-pressed={rate === n}
                onClick={() => void rateIt(n)}
              >
                {n === 1 ? 'Weak' : n === 2 ? 'Okay' : 'Solid'}
              </button>
            ))}
          </div>
        </div>
      </article>

      {open === 'explain' && (
        <Sheet title="Explain to me" onClose={() => setOpen('')}>
          <div className="stack">
            <div className="grid2">
              <label className="fld">
                Focus
                <select
                  value={explainOut.focus}
                  onChange={(e) => setExplainOut((s) => ({ ...s, focus: e.target.value as any }))}
                >
                  <option value="concept">The idea</option>
                  <option value="code">Code, line by line</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="fld">
                Depth
                <select
                  value={explainOut.style}
                  onChange={(e) => setExplainOut((s) => ({ ...s, style: e.target.value as any }))}
                >
                  <option value="simple">Simple</option>
                  <option value="interview">As an interview answer</option>
                  <option value="deep">Deep dive</option>
                </select>
              </label>
            </div>
            <div className="row">
              {LANGS.map((l) => (
                <button
                  key={l}
                  className="chip"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                >
                  {LANG_NAME[l]}
                </button>
              ))}
            </div>
            <button className="btn primary" onClick={() => void runExplain()} disabled={explainOut.loading}>
              {explainOut.loading ? 'Thinking…' : 'Explain'}
            </button>
            {explainOut.text && <Md text={explainOut.text} lang={lang} />}
          </div>
        </Sheet>
      )}

      {open === 'ai' && <CardAiSheet q={q} lang={lang} onClose={() => setOpen('')} />}
    </>
  )
}

interface ExplainState {
  focus: 'concept' | 'code' | 'both'
  style: 'simple' | 'interview' | 'deep'
  text: string
  loading: boolean
}

/** D-08 card tools: 30-second answer, cross-questions, use my experience. */
function CardAiSheet({ q, lang, onClose }: { q: Question; lang: Lang; onClose: () => void }) {
  const { settings } = useSettings()
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState('')

  const run = async (kind: 'simple' | 'xq' | 'me' | 'trap' | 'whiteboard') => {
    setBusy(kind)
    setOut('')
    const p = settings.profile
    try {
      const { aiText } = await import('../lib/ai')
      const prompts: Record<string, string> = {
        simple: `Rewrite this answer so a 12-year-old could follow it. Keep it short and concrete.\n\nQ: ${q.q}`,
        xq: `Give 4 cross-questions an interviewer would ask after this answer, hardest last, with one line on what a strong answer says.\n\nQ: ${q.q}`,
        me: `Rewrite this answer using MY background as proof, without inventing anything I did not do.\nMy role: ${p.role || 'senior full-stack developer'}. My experience: ${p.years}. About me: ${p.about}\n\nQ: ${q.q}`,
        trap: `What do candidates most commonly get wrong when answering this? List 4 traps and how to avoid each.\n\nQ: ${q.q}`,
        whiteboard: `How would you whiteboard this answer? Give the diagram in text, then the 6 things you would say while drawing it.\n\nQ: ${q.q}`,
      }
      const text = await aiText(prompts[kind], { task: 'quick' })
      setOut(text)
    } catch (e) {
      setOut(`Could not do that: ${(e as Error).message}`)
    } finally {
      setBusy('')
    }
  }

  const addOwn = async () => {
    await db.questions.put({
      code: `MY-${Date.now().toString(36).toUpperCase()}`,
      q: q.q,
      a: q.a,
      l: q.l,
      p: 'My questions',
      c: q.c,
      f: q.f,
      t: q.t,
      s: 'my',
      search: `${q.q} ${q.a}`.toLowerCase(),
      updatedAt: Date.now(),
    })
    void queue('question', { code: q.code })
    toast('Saved to My questions')
    onClose()
  }

  return (
    <Sheet title="AI tools" onClose={onClose}>
      <div className="stack">
        <div className="grid2">
          <button className="btn" onClick={() => void run('simple')} disabled={!!busy}>
            {busy === 'simple' ? '…' : 'Explain simpler'}
          </button>
          <button className="btn" onClick={() => void run('xq')} disabled={!!busy}>
            {busy === 'xq' ? '…' : 'Cross-questions'}
          </button>
          <button className="btn" onClick={() => void run('me')} disabled={!!busy}>
            {busy === 'me' ? '…' : 'Use my experience'}
          </button>
          <button className="btn" onClick={() => void run('trap')} disabled={!!busy}>
            {busy === 'trap' ? '…' : 'Common traps'}
          </button>
          <button className="btn" onClick={() => void run('whiteboard')} disabled={!!busy}>
            {busy === 'whiteboard' ? '…' : 'Whiteboard it'}
          </button>
          <button className="btn" onClick={() => void addOwn()}>Save to mine</button>
        </div>
        <div className="small muted">Answer language: {LANG_LABEL[lang]}</div>
        {out && <Md text={out} lang={lang} />}
      </div>
    </Sheet>
  )
}
