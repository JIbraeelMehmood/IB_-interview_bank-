/** Learn (A-12): paste or upload a video/article transcript, turn it into a
 *  summary, sections, code and Q&A by category, then save into the bank. */
import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { useSettings } from '../lib/settings'
import { usePlayer } from '../lib/player'
import { aiJson, aiText, aiReady, aiWhy } from '../lib/ai'
import { summarise } from '../lib/translate'
import { splitText, stripHtml } from '../lib/text'
import { Chip, Chips, Empty, Md, Sheet, toast } from '../components/ui'
import { LANG_NAME, type Lang } from '../lib/types'

interface Category { name: string; qas: { q: string; a: string }[] }
interface Result {
  title: string
  summary: string
  keyPoints: string[]
  sections: string[]
  code: string[]
  categories: Category[]
}

export default function Learn() {
  const { settings } = useSettings()
  const player = usePlayer()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [out, setOut] = useState<Result | null>(null)
  const [tab, setTab] = useState<'summary' | 'sections' | 'code' | 'qa'>('summary')
  const [saved, setSaved] = useState(false)
  const history = db.imports

  useEffect(() => {
    void (async () => {
      const rows = await history.orderBy('at').reverse().limit(6).toArray()
      setPast(rows)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [past, setPast] = useState<{ id: string; title: string; at: number }[]>([])

  const run = async () => {
    if (!text.trim()) return
    if (!aiReady()) return toast(aiWhy() || 'Connect AI to import a transcript.')
    setBusy('summary')
    setOut(null)
    setSaved(false)
    try {
      const title = text.split('\n').find((l) => l.trim())?.slice(0, 70) || 'Imported'
      // Byte-safe: Devanagari/Urdu transcripts blow the prompt limit fast.
      const parts = splitText(text, 24 * 1024)
      const summaries: string[] = []
      for (const [i, part] of parts.entries()) {
        summaries.push(
          await aiText(
            `Summarise this part of a technical interview video transcript. Keep every technical fact, command and code snippet. Bullet points. Write the summary in ${LANG_NAME[settings.lang]}. Part ${i + 1} of ${parts.length}:\n\n${part}`,
            { task: 'quick' },
          ),
        )
        setBusy(`summary ${i + 1}/${parts.length}`)
      }
      const summary = summaries.join('\n\n')

      setBusy('plan')
      const plan = await aiJson<{ keyPoints: string[]; sections: string[]; code: string[]; categories: string[] }>(
        `From this transcript summary, extract the structure. Reply with JSON only:
{"keyPoints":["..."],"sections":["..."],"code":["short code or SQL snippets"],"categories":["3-6 topic names, each short"]}

${summary.slice(0, 20000)}`,
        { task: 'quick' },
      )

      setBusy('qa')
      const categories: Category[] = []
      for (const cat of plan.categories || []) {
        const made = await aiJson<{ items: { q: string; a: string }[] }>(
          `From this transcript summary, write 5 interview questions about "${cat}" with focused answers (3–5 sentences each). Questions and answers in ENGLISH.

${summary.slice(0, 16000)}

Reply with JSON only: {"items":[{"q":"...","a":"..."}]}`,
          { task: 'quick' },
        )
        categories.push({ name: cat, qas: made.items || [] })
      }

      setOut({ title, summary, keyPoints: plan.keyPoints || [], sections: plan.sections || [], code: plan.code || [], categories })
      setTab('summary')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  const save = async () => {
    if (!out) return
    const now = Date.now()
    let n = 0
    for (const cat of out.categories) {
      for (const qa of cat.qas) {
        await db.questions.put({
          code: `IMP-${now.toString(36).toUpperCase()}-${n}`,
          q: qa.q,
          a: qa.a,
          l: 'm',
          p: 'Imported',
          c: `${out.title} › ${cat.name}`,
          f: '',
          t: [],
          s: 'import',
          cat: cat.name,
          src: out.title,
          search: `${qa.q} ${qa.a}`.toLowerCase(),
          updatedAt: now,
        })
        n++
      }
    }
    await history.put({
      id: `imp-${now.toString(36)}`,
      title: out.title,
      summary: out.summary,
      keyPoints: out.keyPoints,
      sections: out.sections,
      code: out.code,
      categories: out.categories,
      at: now,
    })
    setPast(await history.orderBy('at').reverse().limit(6).toArray())
    setSaved(true)
    toast(`${n} questions saved. Find them in Library → Imported.`)
  }

  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>Learn from a video or article</h2>
        <p className="small muted">
          Paste the transcript, or upload a .txt, .srt, .vtt or .json. The app makes a summary and a set of
          interview questions you can save into the bank.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the transcript here…" style={{ minHeight: 150 }} />
        <input
          type="file"
          accept=".txt,.srt,.vtt,.json,.md"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            let body = await f.text()
            // Strip SRT/VTT timing lines and cue numbers.
            if (/\.srt$|\.vtt$/i.test(f.name)) {
              body = body
                .replace(/^\d+$/gm, '')
                .replace(/-->/g, '')
                .replace(/^\d{2}:\d{2}:\d{2}[.,]\d{3}/gm, '')
                .replace(/^WEBVTT.*$/gm, '')
            }
            setText(body)
          }}
        />
        <button className="btn primary" onClick={() => void run()} disabled={!!busy || !text.trim()}>
          {busy ? `${busy}…` : 'Summarise & make Q&A'}
        </button>
        {!aiReady() && <div className="small" style={{ color: 'var(--warn)' }}>{aiWhy()}</div>}
      </div>

      {out && (
        <>
          <div className="scroll-x">
            {(
              [
                ['summary', '📝 Summary'],
                ['sections', '🗂 Sections'],
                ['code', '💻 Code'],
                ['qa', `❓ Q&A (${out.categories.reduce((a, c) => a + c.qas.length, 0)})`],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} on={tab === id} onClick={() => setTab(id)}>
                {label}
              </Chip>
            ))}
          </div>

          {tab === 'summary' && (
            <div className="card stack-sm">
              <div className="spread">
                <b>{out.title}</b>
                {ttsSafe() && (
                  <button className="btn sm" onClick={() => void speak(out.summary)}>
                    🔊 Listen
                  </button>
                )}
              </div>
              <Md text={out.summary} lang={settings.lang} />
              {!!out.keyPoints.length && (
                <>
                  <b className="small">Key points</b>
                  <ul className="small">{out.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </>
              )}
            </div>
          )}

          {tab === 'sections' && (
            <div className="card stack-sm">
              {out.sections.map((s, i) => (
                <div key={i}>
                  <b className="small">{s}</b>
                </div>
              ))}
            </div>
          )}

          {tab === 'code' && (
            <div className="card stack-sm">
              {out.code.map((c, i) => (
                <pre key={i}>{c}</pre>
              ))}
            </div>
          )}

          {tab === 'qa' && (
            <div className="stack">
              {out.categories.map((cat) => (
                <div className="card stack-sm" key={cat.name}>
                  <div className="spread">
                    <b>{cat.name}</b>
                    <div className="row">
                      <button
                        className="btn sm"
                        onClick={async () => {
                          const codes: string[] = []
                          for (const qa of cat.qas) {
                            const code = `IMP-L-${Date.now().toString(36).toUpperCase()}-${codes.length}`
                            codes.push(code)
                            await db.questions.put({
                              code, q: qa.q, a: qa.a, l: 'm', p: 'Imported', c: cat.name, f: '', t: [], s: 'import',
                              search: `${qa.q} ${qa.a}`.toLowerCase(), updatedAt: Date.now(),
                            })
                          }
                          await player.load(codes, { label: cat.name, lang: settings.lang })
                          await player.play()
                        }}
                      >
                        🎧 Listen
                      </button>
                    </div>
                  </div>
                  {cat.qas.map((qa, i) => (
                    <details key={i}>
                      <summary className="small">{qa.q}</summary>
                      <div className="small" style={{ marginTop: 6 }}>{qa.a}</div>
                    </details>
                  ))}
                </div>
              ))}
              <button className="btn primary" onClick={() => void save()} disabled={saved}>
                {saved ? '✓ Saved' : 'Save all questions to the bank'}
              </button>
            </div>
          )}
        </>
      )}

      {!!past.length && (
        <div className="card stack-sm">
          <b className="small">Your imports</b>
          {past.map((p) => (
            <div className="spread" key={p.id}>
              <span className="small grow">{p.title}</span>
              <span className="tiny muted">{new Date(p.at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ttsSafe() {
  return typeof speechSynthesis !== 'undefined'
}
async function speak(text: string) {
  try {
    const { speakSegments } = await import('../lib/speech')
    const { useSettings } = await import('../lib/settings')
    await speakSegments([{ lang: 'en', text }], useSettings.getState().settings.au)
  } catch {
    /* no speech engine */
  }
}
