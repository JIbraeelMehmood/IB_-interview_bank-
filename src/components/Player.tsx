/** The player bar above the nav: transport controls, the now-playing list, and
 *  the listen-mode options v7 had (think time, memorise, auto-next, sleep). */
import { useState } from 'react'
import { usePlayer } from '../lib/player'
import { useSettings } from '../lib/settings'
import { Sheet, toast } from './ui'
import { LANG_NAME, type Lang } from '../lib/types'

export function PlayerBar() {
  const p = usePlayer()
  const { settings, setAudio } = useSettings()
  const [open, setOpen] = useState(false)
  const au = settings.au
  const cur = p.queue[p.index]

  return (
    <>
      <div className="player">
        <div className="row">
          <button
            className="btn sm"
            onClick={() => void p.prev()}
            disabled={p.index === 0}
            aria-label="Previous"
          >
            ⏮
          </button>
          <button className="btn sm primary" onClick={() => void p.toggle()} aria-label={p.playing ? 'Pause' : 'Play'}>
            {p.playing ? '⏸' : '▶'}
          </button>
          <button
            className="btn sm"
            onClick={() => void p.next()}
            disabled={p.index >= p.queue.length - 1}
            aria-label="Next"
          >
            ⏭
          </button>
          <div className="grow">
            <div className="ptitle" title={cur?.q}>
              {cur?.q || p.label}
            </div>
            <div className="tiny muted">
              {p.index + 1} of {p.queue.length} · {LANG_NAME[p.lang]}
              {p.prepared ? '' : ' · preparing…'}
            </div>
          </div>
          <button className="btn sm ghost" onClick={() => setOpen(true)} aria-label="Listen options">
            ⋯
          </button>
          <button className="btn sm ghost" onClick={() => p.stop()} aria-label="Stop">
            ✕
          </button>
        </div>
        {p.segIndex >= 0 && (
          <div className="bar" style={{ marginTop: 7 }} aria-hidden="true">
            <i style={{ width: `${Math.min(100, ((p.segIndex + 1) / 5) * 100)}%` }} />
          </div>
        )}
      </div>

      {open && (
        <Sheet title="Now playing" onClose={() => setOpen(false)}>
          <div className="stack">
            <div className="small muted">
              {p.label} · {p.queue.length} questions
            </div>
            <label className="fld">
              Language
              <select
                value={p.lang}
                onChange={(e) => {
                  const lang = e.target.value as Lang
                  p.load(p.queue.map((q) => q.code), { label: p.label, lang })
                }}
              >
                {(['en', 'ur', 'ru', 'hi'] as Lang[]).map((l) => (
                  <option key={l} value={l}>
                    {LANG_NAME[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              Listen mode
              <select value={au.mode} onChange={(e) => setAudio({ mode: e.target.value as any })}>
                <option value="en">English only</option>
                <option value="mix">English question + explanation</option>
                <option value="all">Everything in one language</option>
              </select>
            </label>
            <label className="fld">
              Speed — {au.rate.toFixed(2)}×
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={au.rate}
                onChange={(e) => setAudio({ rate: Number(e.target.value) })}
              />
            </label>
            <label className="fld">
              Think time before the answer — {(au.gap / 1000).toFixed(1)}s
              <input
                type="range"
                min={0}
                max={8000}
                step={500}
                value={au.gap}
                onChange={(e) => setAudio({ gap: Number(e.target.value) })}
              />
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={au.auto}
                onChange={(e) => setAudio({ auto: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span>Auto-play the next question</span>
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={au.loop}
                onChange={(e) => setAudio({ loop: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span>Loop the list</span>
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={au.mem}
                onChange={(e) => setAudio({ mem: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span>Memorise mode — repeat the key line and the hook</span>
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={au.qonly}
                onChange={(e) => setAudio({ qonly: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span>Questions only</span>
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={au.splitEn}
                onChange={(e) => setAudio({ splitEn: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <span>Speak English tech words with the English voice</span>
            </label>
            <label className="fld">
              Sleep timer
              <select value={au.sleep} onChange={(e) => setAudio({ sleep: Number(e.target.value) })}>
                <option value={0}>Off</option>
                <option value={10}>10 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
            <div className="hr sep" />
            <div className="stack-sm">
              <strong className="small">In this list</strong>
              {p.queue.slice(0, 30).map((it, i) => (
                <button
                  key={it.code}
                  className="btn sm ghost"
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'start',
                    color: i === p.index ? 'var(--brand)' : undefined,
                    fontWeight: i === p.index ? 700 : 400,
                  }}
                  onClick={() => void p.seek(i)}
                >
                  {i + 1}. {it.q.slice(0, 80)}
                </button>
              ))}
            </div>
            <button
              className="btn"
              onClick={() => {
                setOpen(false)
                void p.play()
                toast('Playing — the screen can be locked')
              }}
            >
              ▶ Play this list
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
