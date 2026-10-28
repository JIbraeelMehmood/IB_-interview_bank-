/** 📚 Topics: browse the 212 chapters and 41 parts of the bank. */
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { usePlayer } from '../lib/player'
import { useSettings } from '../lib/settings'
import { Chip, Chips, Empty, Loading, toast } from '../components/ui'

export default function Topics() {
  const { settings } = useSettings()
  const player = usePlayer()
  const [part, setPart] = useState('')
  const [open, setOpen] = useState('')
  const parts = useLiveQuery(async () => {
    const rows = await db.questions.toArray()
    const m = new Map<string, { n: number; chapters: Map<string, number> }>()
    for (const q of rows) {
      const p = m.get(q.p) || { n: 0, chapters: new Map() }
      p.n++
      p.chapters.set(q.c, (p.chapters.get(q.c) || 0) + 1)
      m.set(q.p, p)
    }
    return [...m.entries()].map(([name, v]) => ({ name, n: v.n, chapters: [...v.chapters.entries()].map(([c, n]) => ({ c, n })) })).sort((a, b) => b.n - a.n)
  }, [], null)

  const shown = useMemo(() => (part ? (parts || []).filter((p) => p.name === part) : parts || []), [parts, part])

  const listen = async (chapter: string) => {
    const rows = await db.questions.filter((q) => q.c === chapter).toArray()
    if (!rows.length) return
    await player.load(rows.map((r) => r.code), { label: chapter, lang: settings.lang })
    await player.play()
  }

  if (!parts) return <Loading label="Reading the bank…" />

  return (
    <div className="stack">
      <div className="scroll-x">
        <Chip on={!part} onClick={() => setPart('')}>
          All parts
        </Chip>
        {(parts || []).map((p) => (
          <Chip key={p.name} on={part === p.name} onClick={() => setPart(p.name)}>
            {p.name} <span className="n">{p.n}</span>
          </Chip>
        ))}
      </div>

      {shown.map((p) => (
        <div className="card stack-sm" key={p.name}>
          <div className="spread">
            <b>{p.name}</b>
            <span className="badge">{p.n}</span>
          </div>
          {p.chapters
            .sort((a, b) => b.n - a.n)
            .map((ch) => (
              <div key={ch.c} className="spread">
                <button className="btn sm ghost" onClick={() => setOpen(open === ch.c ? '' : ch.c)}>
                  {open === ch.c ? '▾' : '▸'} {ch.c} <span className="muted">({ch.n})</span>
                </button>
                <div className="row">
                  <button className="btn sm" onClick={() => void listen(ch.c)}>
                    🎧
                  </button>
                </div>
              </div>
            ))}
        </div>
      ))}
      {!shown.length && <Empty title="No chapters found." />}
    </div>
  )
}
