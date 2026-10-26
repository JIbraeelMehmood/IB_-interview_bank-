/** Downloads (A-12, C-02): prepare a category offline in the background, and
 *  export a study pack as a self-contained HTML file, Markdown, text or JSON. */
import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { download } from '../lib/backup'
import { translateBatch, getTranslation } from '../lib/translate'
import { loadLibrary, DEFAULT_FILTERS, techCounts } from '../lib/queries'
import { useSettings } from '../lib/settings'
import { usePlayer } from '../lib/player'
import { stripHtml } from '../lib/text'
import { Chip, Chips, Sheet, toast } from '../components/ui'
import { LANG_NAME, type Lang, type Question } from '../lib/types'
import { aiReady, aiWhy } from '../lib/ai'

const SCOPES = [
  { id: 'important', label: 'Most important' },
  { id: 'all', label: 'Everything' },
  { id: 'weak', label: 'My weak ones' },
]

export default function Downloads() {
  const { settings } = useSettings()
  const player = usePlayer()
  const [lang, setLang] = useState<Lang>(settings.lang)
  const [scope, setScope] = useState('important')
  const [n, setN] = useState(25)
  const [list, setList] = useState<Question[]>([])
  const [busy, setBusy] = useState('')
  const [prog, setProg] = useState<{ done: number; total: number } | null>(null)
  const [open, setOpen] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const techs = useRef<{ slug: string; n: number }[]>([])

  useEffect(() => {
    void techCounts(DEFAULT_FILTERS).then((t) => {
      techs.current = t.slice(0, 30)
    })
  }, [])

  const pick = async () => {
    const all = await loadLibrary({ ...DEFAULT_FILTERS })
    let rows = all
    if (scope === 'important') rows = all.filter((q) => q.f?.includes('i'))
    if (scope === 'weak') {
      const weak = all.filter((q) => q.rating === 1)
      rows = weak.length ? weak : all
    }
    setList(rows.slice(0, n))
  }

  const prepare = async () => {
    await pick()
    if (lang === 'en') return toast('English needs no preparation.')
    if (!list.length) return toast('Nothing to prepare.')
    if (!aiReady()) return toast(aiWhy() || 'Connect AI, or import a translation pack.')
    abort.current = new AbortController()
    setProg({ done: 0, total: list.length })
    const written = await translateBatch(list, lang, (done, total) => setProg({ done, total }), abort.current.signal)
    setBusy('')
    setProg(null)
    toast(`${written} translations ready. They work offline now.`)
  }

  const exportFile = async (fmt: 'html' | 'md' | 'txt' | 'json') => {
    if (!list.length) await pick()
    if (!list.length) return toast('Nothing to export.')
    const items = await Promise.all(
      list.map(async (q) => ({ q, tr: lang === 'en' ? null : await getTranslation(q.code, lang) })),
    )
    const have = items.filter((i) => i.tr).length
    const name = `interview-box-${scope}-${lang}`
    if (fmt === 'json') {
      download(`${name}.json`, JSON.stringify(items.map((i) => ({ ...i.q, tr: i.tr || undefined })), null, 1))
    } else if (fmt === 'md') {
      const body = items
        .map(
          (i) =>
            `## ${i.q.q}\n\n_${i.q.c}_\n\n**${LANG_NAME[lang] === 'English' ? 'Answer' : 'جواب / Answer'}**\n\n${stripHtml(i.tr?.a || i.q.a)}${i.tr?.key ? `\n\n> ${i.tr.key}` : ''}\n`,
        )
        .join('\n---\n\n')
      download(`${name}.md`, `# Interview Box — ${scope}\n\n${have}/${list.length} translated\n\n${body}`, 'text/markdown')
    } else if (fmt === 'txt') {
      download(`${name}.txt`, items.map((i) => `${i.q.q}\n\n${stripHtml(i.tr?.a || i.q.a)}\n`).join('\n---\n'), 'text/plain')
    } else {
      download(`${name}.html`, packHtml(items, scope, lang), 'text/html')
    }
    toast(`${list.length} questions exported.`)
  }

  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>Prepare for offline</h2>
        <p className="small muted">
          Translations are made here and then stored on this device, so the library, audio and exports work
          with no signal. Per category is far cheaper than translating all 1,950.
        </p>
        <label className="fld">
          Language
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {(['ur', 'ru', 'hi', 'en'] as Lang[]).map((l) => (
              <option key={l} value={l}>
                {LANG_NAME[l]}
              </option>
            ))}
          </select>
        </label>
        <Chips>
          {SCOPES.map((s) => (
            <Chip key={s.id} on={scope === s.id} onClick={() => setScope(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Chips>
        <label className="fld">
          How many — {n}
          <input type="range" min={10} max={200} step={5} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </label>
        <div className="row">
          <button className="btn primary" onClick={() => void prepare()} disabled={!!prog}>
            ⬇ Prepare offline
          </button>
          <button
            className="btn"
            onClick={async () => {
              await pick()
              await player.load(list.map((q) => q.code), { label: scope, lang })
              await player.play()
            }}
          >
            🎧 Listen to this selection
          </button>
        </div>
        {prog && (
          <div className="stack-sm">
            <div className="bar">
              <i style={{ width: `${(prog.done / prog.total) * 100}%` }} />
            </div>
            <div className="spread tiny muted">
              <span>
                {prog.done} of {prog.total}
              </span>
              <button className="btn sm ghost" onClick={() => abort.current?.abort()}>
                Stop
              </button>
            </div>
          </div>
        )}
        {!aiReady() && lang !== 'en' && <div className="small" style={{ color: 'var(--warn)' }}>{aiWhy()}</div>}
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Download as a file</h3>
        <p className="small muted">
          A study pack is one HTML file with its own small player — open it anywhere, even with no app
          installed.
        </p>
        <div className="grid2">
          <button className="btn" onClick={() => void exportFile('html')}>
            Study pack (.html)
          </button>
          <button className="btn" onClick={() => void exportFile('md')}>
            Markdown (.md)
          </button>
          <button className="btn" onClick={() => void exportFile('txt')}>
            Plain text (.txt)
          </button>
          <button className="btn" onClick={() => void exportFile('json')}>
            JSON (.json)
          </button>
        </div>
        <button className="btn sm ghost" onClick={() => setOpen(true)}>
          Choose a specific category…
        </button>
      </div>

      <SavedCount />
    </div>
  )
}

function SavedCount() {
  const [n, setN] = useState(0)
  useEffect(() => {
    void db.translations.count().then(setN)
    return db.translations.hook('creating').subscribe(() => void db.translations.count().then(setN))
  }, [])
  return (
    <div className="card small muted">
      {n} translations saved on this device across all languages.
    </div>
  )
}

/** A single self-contained study-pack file with its own mini player. */
function packHtml(items: { q: Question; tr: any }[], scope: string, lang: Lang): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const data = JSON.stringify(
    items.map((i) => ({
      q: i.q.q,
      a: i.tr?.a || stripHtml(i.q.a),
      key: i.tr?.key || '',
      hook: i.tr?.hook || '',
    })),
  )
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interview Box — ${esc(scope)}</title>
<style>
:root{--bg:#EEF0EA;--card:#fff;--ink:#16201C;--muted:#5C6862;--line:#D6DBD2;--brand:#1D5C48}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,sans-serif;padding:12px}
h1{font-size:1.1rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin:8px 0}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
button{border:1px solid var(--line);background:var(--card);border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer}
button.p{background:var(--brand);color:#fff;border-color:var(--brand)}
.muted{color:var(--muted);font-size:.85rem}
[hidden]{display:none}
</style></head><body>
<h1>Interview Box — ${esc(scope)}</h1>
<div class="row">
  <button class="p" id="play">▶ Play</button>
  <button id="stop">Stop</button>
  <button id="next">Next</button>
  <label class="muted">Speed <input type="range" id="rate" min="0.6" max="1.4" step="0.05" value="0.95"></label>
  <label class="muted"><input type="checkbox" id="auto" checked> Auto-next</label>
  <span class="muted" id="pos"></span>
</div>
<div class="card" id="now"></div>
<div id="list"></div>
<script>
const D=${data};let i=0,playing=false;
const list=document.getElementById('list'),now=document.getElementById('now'),pos=document.getElementById('pos');
D.forEach((d,n)=>{const el=document.createElement('div');el.className='card';
el.innerHTML='<b>'+(n+1)+'. '+esc(d.q)+'</b><div class="muted" style="margin-top:6px">'+esc(d.a)+'</div>'+(d.key?'<div style="margin-top:8px"><b>Say it:</b> '+esc(d.key)+'</div>':'');
el.onclick=()=>{i=n;play()};list.appendChild(el)});
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function rate(){return parseFloat(document.getElementById('rate').value)}
function say(t,lang){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=rate();
const v=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith(lang));if(v)u.voice=v;else u.lang=lang==='ur'?'ur-PK':lang==='hi'?'hi-IN':'en-IN';
u.onend=()=>{if(playing&&document.getElementById('auto').checked&&i<D.length-1){i++;play()}};speechSynthesis.speak(u)}
function play(){if(!D.length)return;playing=true;const d=D[i];pos.textContent=(i+1)+' of '+D.length;
now.innerHTML='<b>'+esc(d.q)+'</b><div style="margin-top:8px">'+esc(d.a)+'</div>'+(d.key?'<div style="margin-top:8px"><b>Say it:</b> '+esc(d.key)+'</div>':'');
say(d.q,'en');setTimeout(()=>{if(d.a)say(d.a,'${lang}')},Math.max(800,d.q.length*55))}
document.getElementById('play').onclick=()=>play();
document.getElementById('stop').onclick=()=>{playing=false;speechSynthesis.cancel()};
document.getElementById('next').onclick=()=>{if(i<D.length-1){i++;play()}};
<\/script></body></html>`
}
