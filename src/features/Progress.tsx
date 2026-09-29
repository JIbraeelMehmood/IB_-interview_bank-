/** Progress (v-1 in v7, v6 in v6): per-tech stats, spaced repetition, About me,
 *  language & audio, tech manager, theme, AI Connect, backup, sync. */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { progressSummary, techProgress } from '../lib/queries'
import { dueCodes, nextDue, review, weakestCodes } from '../lib/fsrs'
import { useSettings } from '../lib/settings'
import {
  backupFilename,
  backupText,
  download,
  importBackup,
  makeBackup,
  makeTranslationPack,
  importTranslationPack,
  resetProgress,
  upgradeOldTranslations,
} from '../lib/backup'
import {
  PROVIDERS,
  aiReady,
  aiWhy,
  keyState,
  providerModels,
  saveKeys,
  setServerUrl,
  serverUrl,
  type ProviderId,
} from '../lib/ai'
import { flush, pendingCount, pullBank } from '../lib/sync'
import { glossList } from '../lib/text'
import { Chip, Chips, Empty, Md, Sheet, toast } from '../components/ui'
import { listVoices, pickVoice, ttsAvailable, chunkText } from '../lib/speech'
import { LANGS, LANG_NAME, type Lang } from '../lib/types'
import { planMyDay } from '../lib/features'
import { RULES_VERSION } from '../lib/lang'
import { canInstall, isStandalone, promptInstall } from '../lib/install'
import { beginGoogleSignIn, signOut, signInMethod, googleSignedIn } from '../lib/auth'

export default function Progress() {
  const sum = useLiveQuery(progressSummary, [], null)
  const techs = useLiveQuery(techProgress, [], [])
  const [sheet, setSheet] = useState('')

  if (!sum) return <p className="center muted">Loading…</p>

  return (
    <div className="stack">
      <div className="card stack-sm">
        <div className="spread">
          <b>Your progress</b>
          <span className="badge hl">{sum.percent}%</span>
        </div>
        <div className="bar"><i style={{ width: `${sum.percent}%` }} /></div>
        <div className="row">
          <span className="badge">{sum.practised} practised</span>
          <span className="badge bad">{sum.byRating.weak} weak</span>
          <span className="badge warn">{sum.byRating.ok} okay</span>
          <span className="badge ok">{sum.byRating.solid} solid</span>
          <span className="badge">{sum.due} due</span>
        </div>
      </div>

      <div className="grid2">
        <button className="tile" onClick={() => setSheet('today')}>
          <span className="ic">🗓</span>
          <b>Due today</b>
          <span className="tiny muted">{sum.due} scheduled</span>
        </button>
        <button className="tile" onClick={() => setSheet('tech')}>
          <span className="ic">📊</span>
          <b>By technology</b>
          <span className="tiny muted">Weakest first</span>
        </button>
        <button className="tile" onClick={() => setSheet('profile')}>
          <span className="ic">👤</span>
          <b>About me</b>
          <span className="tiny muted">Used by every AI feature</span>
        </button>
        <button className="tile" onClick={() => setSheet('audio')}>
          <span className="ic">🎧</span>
          <b>Language &amp; audio</b>
          <span className="tiny muted">Voices, accent, speed</span>
        </button>
        <button className="tile" onClick={() => setSheet('techmgr')}>
          <span className="ic">🏷</span>
          <b>Technologies</b>
          <span className="tiny muted">Show, hide, add your own</span>
        </button>
        <button className="tile" onClick={() => setSheet('ai')}>
          <span className="ic">🤖</span>
          <b>AI Connect</b>
          <span className="tiny muted">{aiReady() ? 'Connected' : 'Not connected'}</span>
        </button>
        <button className="tile" onClick={() => setSheet('backup')}>
          <span className="ic">💾</span>
          <b>Backup</b>
          <span className="tiny muted">Export, import, reset</span>
        </button>
        <button className="tile" onClick={() => setSheet('about')}>
          <span className="ic">ℹ️</span>
          <b>About &amp; help</b>
          <span className="tiny muted">Install, offline, voices</span>
        </button>
      </div>

      {sheet === 'today' && <DueToday onClose={() => setSheet('')} />}
      {sheet === 'tech' && <TechStats techs={techs} onClose={() => setSheet('')} />}
      {sheet === 'profile' && <Profile onClose={() => setSheet('')} />}
      {sheet === 'audio' && <AudioSheet onClose={() => setSheet('')} />}
      {sheet === 'techmgr' && <TechManager onClose={() => setSheet('')} />}
      {sheet === 'ai' && <AiConnect onClose={() => setSheet('')} />}
      {sheet === 'backup' && <BackupSheet onClose={() => setSheet('')} />}
      {sheet === 'about' && <AboutSheet onClose={() => setSheet('')} />}
    </div>
  )
}

function DueToday({ onClose }: { onClose: () => void }) {
  const { settings } = useSettings()
  const [codes, setCodes] = useState<string[]>([])
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState('')
  const [plan, setPlan] = useState('')
  useEffect(() => {
    void dueCodes(50).then(setCodes)
  }, [])

  const rows = useLiveQuery(async () => {
    const got = await db.questions.bulkGet(codes)
    return got.filter(Boolean)
  }, [codes], [])

  if (!codes.length) {
    return (
      <Sheet title="Due today" onClose={onClose}>
        <Empty
          title="Nothing due right now."
          hint="Mark questions Weak / Okay / Solid and they will come back on a spaced schedule."
        />
      </Sheet>
    )
  }

  const cur = (rows || [])[i]

  return (
    <Sheet title={`Due today — ${codes.length}`} onClose={onClose}>
      <div className="stack">
        {cur && (
          <>
            <div className="card">
              <div className="qtext">{cur.q}</div>
              <div className="small" style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: cur.a }} />
            </div>
            <div className="rate">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  className={`r${n}`}
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(String(n))
                    await review(cur.code, n, 'local')
                    setBusy('')
                    if (i + 1 < codes.length) setI(i + 1)
                    else {
                      const left = await dueCodes(50)
                      setCodes(left)
                      setI(0)
                    }
                  }}
                >
                  {n === 1 ? 'Still weak' : n === 2 ? 'Getting there' : 'Got it'}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          className="btn"
          disabled={busy === 'plan' || !settings.profile.about}
          title={settings.profile.about ? '' : 'Fill in About me first'}
          onClick={async () => {
            setBusy('plan')
            try {
              const weak = await weakestCodes(20)
              const qs = await db.questions.bulkGet(weak)
              setPlan(
                await planMyDay({
                  weak: qs.filter(Boolean).map((q) => ({ q: q!.q, tech: q!.p })),
                  due: codes.length,
                  minutes: 20,
                  lang: settings.lang,
                }),
              )
            } catch (e) {
              toast((e as Error).message)
            } finally {
              setBusy('')
            }
          }}
        >
          {busy === 'plan' ? 'Planning…' : '✨ Plan my day'}
        </button>
        {plan && <Md text={plan} lang={settings.lang} />}
      </div>
    </Sheet>
  )
}

function TechStats({ techs, onClose }: { techs: { slug: string; n: number; done: number }[]; onClose: () => void }) {
  return (
    <Sheet title="Progress by technology" onClose={onClose}>
      <div className="stack-sm">
        {techs.slice(0, 40).map((t) => (
          <div key={t.slug}>
            <div className="spread small">
              <span>{t.slug}</span>
              <span className="muted">
                {t.done}/{t.n}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${(t.done / t.n) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

function Profile({ onClose }: { onClose: () => void }) {
  const { settings, set } = useSettings()
  const p = settings.profile
  return (
    <Sheet title="About me" onClose={onClose}>
      <div className="stack">
        <p className="small muted">
          Every AI feature uses this: mock grading, “use my experience”, CV ↔ JD and the coach.
        </p>
        <label className="fld">
          Name
          <input value={p.name} onChange={(e) => set({ profile: { ...p, name: e.target.value } })} />
        </label>
        <label className="fld">
          Role
          <input value={p.role} onChange={(e) => set({ profile: { ...p, role: e.target.value } })} placeholder="Senior Laravel / full-stack engineer" />
        </label>
        <label className="fld">
          Years of experience
          <input value={p.years} onChange={(e) => set({ profile: { ...p, years: e.target.value } })} placeholder="5" />
        </label>
        <label className="fld">
          Background — projects, domains, what you are proud of
          <textarea
            value={p.about}
            onChange={(e) => set({ profile: { ...p, about: e.target.value } })}
            placeholder="Multi-tenant IoT SaaS with Laravel and queues; RAG assistant; Laravel REST APIs…"
          />
        </label>
      </div>
    </Sheet>
  )
}

function AudioSheet({ onClose }: { onClose: () => void }) {
  const { settings, setAudio, setLang } = useSettings()
  const au = settings.au
  const [test, setTest] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!ttsAvailable()) return
    setVoices(listVoices())
    const t = setTimeout(() => setVoices(listVoices()), 800)
    return () => clearTimeout(t)
  }, [])

  const urVoices = voices.filter((v) => /^(ur|hi)/i.test(v.lang))
  const enVoices = voices.filter((v) => /^en/i.test(v.lang))
  const hiVoices = voices.filter((v) => /^hi/i.test(v.lang))

  return (
    <Sheet title="Language & audio" onClose={onClose}>
      <div className="stack">
        <div>
          <b className="small">App language</b>
          <Chips>
            {LANGS.map((l) => (
              <Chip key={l} on={settings.lang === l} onClick={() => setLang(l)}>
                {LANG_NAME[l]}
              </Chip>
            ))}
          </Chips>
        </div>

        <label className="fld">
          English accent for listening — {au.acc === 'in' ? 'South Asian (default)' : au.acc.toUpperCase()}
          <select value={au.acc} onChange={(e) => setAudio({ acc: e.target.value as any })}>
            <option value="in">South Asian (en-IN) — most familiar</option>
            <option value="us">US (en-US)</option>
            <option value="gb">UK (en-GB)</option>
          </select>
        </label>

        <label className="fld">
          Speed — {au.rate.toFixed(2)}×
          <input type="range" min={0.6} max={1.4} step={0.05} value={au.rate} onChange={(e) => setAudio({ rate: Number(e.target.value) })} />
        </label>

        <label className="row">
          <input type="checkbox" checked={au.splitEn} onChange={(e) => setAudio({ splitEn: e.target.checked })} style={{ width: 'auto' }} />
          <span className="small">Speak English tech words with the English voice inside Urdu/Hindi speech</span>
        </label>

        {!ttsAvailable() ? (
          <div className="card small" style={{ borderColor: 'var(--warn)' }}>
            This browser has no speech engine. Open the app in Chrome or Edge for audio.
          </div>
        ) : (
          <>
            <label className="fld">
              English voice
              <select value={au.voiceEn} onChange={(e) => setAudio({ voiceEn: e.target.value })}>
                <option value="">Automatic (best available)</option>
                {enVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              Urdu voice
              <select value={au.voiceUr} onChange={(e) => setAudio({ voiceUr: e.target.value })}>
                <option value="">Automatic</option>
                {urVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              {!urVoices.length && <span className="tiny muted">No Urdu or Hindi voice installed. Urdu is read with a Hindi voice, keeping the nukta letters.</span>}
            </label>
            <label className="fld">
              Hindi voice
              <select value={au.voiceHi} onChange={(e) => setAudio({ voiceHi: e.target.value })}>
                <option value="">Automatic</option>
                {hiVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <input
                className="grow"
                value={test}
                onChange={(e) => setTest(e.target.value)}
                placeholder="Type a sentence to test the voice"
              />
              <button
                className="btn"
                onClick={async () => {
                  const { speakSegments } = await import('../lib/speech')
                  const lang: Lang = settings.lang
                  await speakSegments([{ lang, text: test }], au)
                }}
              >
                🔊 Test
              </button>
            </div>
          </>
        )}

        <div className="card small muted">
          Audio uses the voices installed on this device, so quality varies. A server with neural voices
          (MMS-TTS / Chatterbox) is planned; until then, the 260-term dictionary makes English tech words
          sound right inside Urdu and Hindi.
        </div>
      </div>
    </Sheet>
  )
}

function TechManager({ onClose }: { onClose: () => void }) {
  const { settings, set } = useSettings()
  const meta = useLiveQuery(async () => (await (await fetch('/data/meta.json')).json()).techs, [], [])
  const [add, setAdd] = useState('')

  return (
    <Sheet title="Technologies" onClose={onClose}>
      <div className="stack">
        <p className="small muted">Hide what you never want to see, or add your own.</p>
        <Chips>
          {(meta || []).map((t: { slug: string }) => {
            const hidden = settings.hiddenTechs.includes(t.slug)
            const custom = settings.customTechs.includes(t.slug)
            return (
              <Chip
                key={t.slug}
                on={!hidden}
                onClick={() =>
                  set({
                    hiddenTechs: hidden
                      ? settings.hiddenTechs.filter((x) => x !== t.slug)
                      : [...settings.hiddenTechs, t.slug],
                  })
                }
              >
                {t.slug}
              </Chip>
            )
          })}
        </Chips>
        <div className="row">
          <input
            className="grow"
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            placeholder="Add your own, e.g. Inertia"
          />
          <button
            className="btn"
            onClick={() => {
              const v = add.trim().toLowerCase()
              if (!v || settings.customTechs.includes(v)) return
              set({ customTechs: [...settings.customTechs, v], hiddenTechs: settings.hiddenTechs.filter((x) => x !== v) })
              setAdd('')
              toast('Added.')
            }}
          >
            Add
          </button>
        </div>
        {!!settings.customTechs.length && (
          <div>
            <b className="small">Yours</b>
            <Chips>
              {settings.customTechs.map((t) => (
                <Chip
                  key={t}
                  on
                  onClick={() => set({ customTechs: settings.customTechs.filter((x) => x !== t) })}
                >
                  {t} ✕
                </Chip>
              ))}
            </Chips>
          </div>
        )}
      </div>
    </Sheet>
  )
}

/** E-01…E-09: pick a provider, explain what each needs. */
function AiConnect({ onClose }: { onClose: () => void }) {
  const st = keyState()
  const [, force] = useState(0)
  const [models, setModels] = useState<string[]>([])
  const [busy, setBusy] = useState('')
  const refresh = () => force((n) => n + 1)

  const signedIn = signInMethod()
  return (
    <Sheet title="AI Connect" onClose={onClose}>
      <div className="stack">
        {signedIn === 'none' ? (
          <div className="card stack-sm" style={{ borderColor: 'var(--brand)' }}>
            <b>Turn AI on in one tap</b>
            <p className="small muted" style={{ margin: 0 }}>
              Sign in with Google and every AI feature works — no key to copy. The same account works in
              Cline and Claude Desktop.
            </p>
            <button
              className="btn primary"
              onClick={() => {
                void beginGoogleSignIn().catch((e) => toast((e as Error).message))
              }}
            >
              <span aria-hidden="true">🔵</span> Continue with Google
            </button>
            <p className="tiny muted" style={{ margin: 0 }}>
              Works on localhost and https. It cannot work when the app is opened as a file on disk.
            </p>
          </div>
        ) : (
          <div className="card row">
            <span className="grow small">
              {signedIn === 'google' ? '✅' : '✅'} Signed in with {signedIn === 'google' ? 'Google' : 'email'}.
            </span>
            <button className="btn sm ghost" onClick={() => { signOut(); refresh(); toast('Signed out.') }}>
              Sign out
            </button>
          </div>
        )}

        <div className="card small">
          <b>Where do the keys live?</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            Keys are saved on this device only, never in a backup, and never sent anywhere except the
            provider you choose. With a server set, keys stay on your own server instead.
          </p>
        </div>

        <div>
          <b className="small">Use my own server (recommended)</b>
          <div className="row">
            <input
              className="grow"
              value={serverUrl()}
              placeholder="https://interview-box.example.com"
              onChange={(e) => {
                setServerUrl(e.target.value)
                refresh()
              }}
            />
          </div>
          <span className="tiny muted">
            Point this at your Laravel API. Then no key is ever needed in the browser.
          </span>
        </div>

        <div>
          <b className="small">Or connect a provider directly</b>
          <div className="stack-sm" style={{ marginTop: 6 }}>
            {(Object.keys(PROVIDERS) as ProviderId[])
              .filter((p) => p !== 'server')
              .map((p) => {
                const prov = PROVIDERS[p]
                const on = st.prov === p
                return (
                  <div className="card" key={p} style={{ padding: 10 }}>
                    <div className="spread">
                      <b className="small">{prov.name}</b>
                      <span className="badge">{prov.cost}</span>
                    </div>
                    <div className="tiny muted">{prov.note}</div>
                    <div className="row" style={{ marginTop: 7 }}>
                      {on && <span className="badge ok">In use</span>}
                      {prov.keyUrl && (
                        <a className="btn sm" href={prov.keyUrl} target="_blank" rel="noreferrer">
                          Get a free key
                        </a>
                      )}
                      {prov.needsKey && (
                        <input
                          className="grow"
                          type="password"
                          placeholder="Paste your API key"
                          value={st.keys[p] || ''}
                          onChange={(e) => saveKeys({ ...keyState(), keys: { ...st.keys, [p]: e.target.value } })}
                        />
                      )}
                      <button
                        className="btn sm"
                        onClick={() => {
                          saveKeys({ ...keyState(), prov: p })
                          refresh()
                          toast(`${prov.name} selected.`)
                        }}
                      >
                        Use this
                      </button>
                    </div>
                    {(prov.needsKey || p === 'custom') && on && (
                      <div className="row" style={{ marginTop: 6 }}>
                        <input
                          className="grow"
                          placeholder="Model id (blank = default)"
                          value={st.models[p] || ''}
                          onChange={(e) => saveKeys({ ...keyState(), models: { ...st.models, [p]: e.target.value } })}
                        />
                        {p === 'custom' && (
                          <input
                            className="grow"
                            placeholder="Base URL"
                            value={st.base[p] || ''}
                            onChange={(e) => saveKeys({ ...keyState(), base: { ...st.base, [p]: e.target.value } })}
                          />
                        )}
                        <button
                          className="btn sm"
                          disabled={busy === 'models'}
                          onClick={async () => {
                            setBusy('models')
                            try {
                              setModels(await providerModels(p))
                            } catch (e) {
                              toast((e as Error).message)
                            } finally {
                              setBusy('')
                            }
                          }}
                        >
                          {busy === 'models' ? '…' : 'List models'}
                        </button>
                      </div>
                    )}
                    {!!models.length && on && (
                      <select
                        onChange={(e) => {
                          saveKeys({ ...keyState(), models: { ...st.models, [p]: e.target.value } })
                          refresh()
                        }}
                      >
                        <option value="">Pick a model…</option>
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        <div className="card small">
          <b>Translation model</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            Urdu and Hindi work best on Gemini. Leave on automatic, or set a model id.
          </p>
        </div>

        {!aiReady() && <div className="card small" style={{ borderColor: 'var(--warn)' }}>{aiWhy()}</div>}

        <div className="card small muted">
          <b>Not possible, by design:</b> signing in with a ChatGPT or Claude subscription does not work in a
          third-party app — those companies do not offer it. Use Google sign-in through OpenRouter, or an
          email account, and you get the same models.
        </div>
      </div>
    </Sheet>
  )
}

function BackupSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const pending = useLiveQuery(pendingCount, [], 0)

  return (
    <Sheet title="Backup" onClose={onClose}>
      <div className="stack">
        <button
          className="btn primary"
          disabled={!!busy}
          onClick={async () => {
            setBusy('out')
            try {
              const b = await makeBackup(true)
              download(backupFilename(), backupText(b))
              toast('Backup downloaded.')
            } finally {
              setBusy('')
            }
          }}
        >
          ⬇ Download a backup (includes translations)
        </button>

        <label className="fld">
          …or paste a backup here to restore
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder='{"app":"interview-box",…}' />
        </label>
        <button
          className="btn"
          disabled={!text.trim() || !!busy}
          onClick={async () => {
            setBusy('in')
            try {
              const r = await importBackup(text)
              toast(r.message)
              if (r.ok) setText('')
            } catch (e) {
              toast((e as Error).message)
            } finally {
              setBusy('')
            }
          }}
        >
          Restore
        </button>

        <hr className="sep" />

        <button
          className="btn"
          disabled={!!busy}
          onClick={async () => {
            setBusy('pack')
            try {
              const p = await makeTranslationPack()
              download('interview-box-translations.json', JSON.stringify(p))
              toast('Translation pack downloaded — import it on any device for offline languages.')
            } finally {
              setBusy('')
            }
          }}
        >
          ⬇ Export translation pack
        </button>
        <label className="fld">
          Import a translation pack
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const n = await importTranslationPack(await f.text())
                toast(`${n} translations imported.`)
              } catch (err) {
                toast((err as Error).message)
              }
            }}
          />
        </label>

        <button
          className="btn"
          disabled={!!busy}
          onClick={async () => {
            setBusy('up')
            const n = await upgradeOldTranslations(RULES_VERSION)
            toast(n ? `${n} old translations removed — they will be re-made with the modern rules.` : 'Nothing to upgrade.')
            setBusy('')
          }}
        >
          Upgrade old translations (rules v{RULES_VERSION})
        </button>

        <hr className="sep" />

        <div className="card small">
          <b>Sync</b>
          <p className="muted" style={{ marginBottom: 6 }}>
            {serverUrl()
              ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload.`
              : 'No server set, so everything stays on this device. Set one in AI Connect to sync.'}
          </p>
          <div className="row">
            <button className="btn sm" onClick={() => void flush()}>
              Sync now
            </button>
            <button
              className="btn sm"
              onClick={async () => {
                try {
                  const n = await pullBank()
                  toast(`${n} questions updated from the server.`)
                } catch (e) {
                  toast((e as Error).message)
                }
              }}
            >
              Refresh bank
            </button>
          </div>
        </div>

        <button
          className="btn danger"
          disabled={!!busy}
          onClick={async () => {
            if (!confirm('Delete all your progress, ratings, notes and translations? The 1,950 built-in questions stay.')) return
            setBusy('reset')
            await resetProgress()
            setBusy('')
            toast('Progress reset.')
            location.reload()
          }}
        >
          Reset all progress
        </button>
      </div>
    </Sheet>
  )
}

function AboutSheet({ onClose }: { onClose: () => void }) {
  const [gloss, setGloss] = useState<{ en: string; ur: string; hi: string }[] | null>(null)
  const { settings, toggleTheme } = useSettings()
  return (
    <Sheet title="About & help" onClose={onClose}>
      <div className="stack">
        <div className="card small">
          <b>Interview Box 2.0</b>
          <p className="muted">
            An installable PWA. 1,950 questions, 4 languages, audio, speaking coach, mock interviews and an
            SQL lab — all working offline.
          </p>
        </div>

        {!isStandalone() && canInstall() && (
          <button className="btn primary" onClick={() => void promptInstall()}>
            📲 Install as an app
          </button>
        )}

        <div className="card small">
          <b>Appearance</b>
          <div className="row" style={{ marginTop: 6 }}>
            {(['auto', 'light', 'dark'] as const).map((t) => (
              <Chip key={t} on={settings.theme === t} onClick={() => (t === 'auto' ? toggleTheme() : undefined)}>
                {t}
              </Chip>
            ))}
            <button className="btn sm" onClick={toggleTheme}>
              Toggle theme (now: {settings.theme})
            </button>
          </div>
        </div>

        <div className="card small">
          <b>Working offline</b>
          <ul>
            <li>The question bank is cached on first load, then available with no signal.</li>
            <li>Progress, translations and answers are stored on this device.</li>
            <li>With a server set, changes sync when you come back online.</li>
          </ul>
        </div>

        <div className="card small">
          <b>Audio</b>
          <p className="muted">
            Audio uses this device’s installed voices. Set your battery to Unrestricted to stop the browser
            pausing speech when the screen locks. Neural server voices are planned for 2.0.
          </p>
        </div>

        <button className="btn" onClick={() => void glossList().then(setGloss)}>
          Pronunciation dictionary ({gloss ? gloss.length : 260} terms)
        </button>
        {gloss && (
          <div className="tbl" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="res">
              <tbody>
                {gloss.map((g, i) => (
                  <tr key={i}>
                    <td>{g.en}</td>
                    <td>{g.ur}</td>
                    <td>{g.hi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Sheet>
  )
}
