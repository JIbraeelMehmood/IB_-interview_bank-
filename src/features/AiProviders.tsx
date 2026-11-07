/**
 * AI Providers page — /ai-providers
 *
 * Lets signed-in users connect their AI provider accounts (API keys) and
 * attach them to their Interview Box account so the keys roam across devices.
 *
 * Supported providers and their free tiers:
 *  - OpenRouter  → free models (Llama, Mistral, Qwen, Gemini …) via Google Sign-In
 *  - Google Gemini → free API quota, no card needed
 *  - Groq        → free tier, very fast Llama models
 *  - Mistral     → free tier
 *  - xAI (Grok)  → free trial credits
 *  - Fireworks   → free trial
 *  - OpenAI      → paid (user pastes their own key)
 *  - Anthropic   → paid (user pastes their own key)
 *  - Ollama      → free, local
 *
 * Keys are saved to MongoDB (per user, roam to any device) AND to localStorage
 * so they work offline.
 */
import { useState, useEffect } from 'react'
import { accountRequest, promptForSignIn } from '../lib/account'
import { keyState, saveKeys, PROVIDERS, type ProviderId, type KeyState } from '../lib/ai'
import { beginGoogleSignIn } from '../lib/auth'
import { gatewayStatus, detectGateway, gatewayReady } from '../lib/freeGateway'
import { checkTtsServer, ttsServerAvailable, fetchEngines, type TtsEngineInfo } from '../lib/ttsClient'

/** Providers shown on this page, in display order. */
const LISTED_PROVIDERS: { id: ProviderId; emoji: string; freeNote: string }[] = [
  { id: 'openrouter', emoji: '🌐', freeNote: 'Free models available (Llama, Mistral, Qwen, Gemini)' },
  { id: 'gemini',    emoji: '♊', freeNote: 'Free tier — no card needed' },
  { id: 'groq',      emoji: '⚡', freeNote: 'Free tier — very fast Llama 3' },
  { id: 'mistral',   emoji: '🌊', freeNote: 'Free tier — strong on code & Urdu' },
  { id: 'fireworks', emoji: '🔥', freeNote: 'Free trial credits' },
  { id: 'xai',       emoji: '𝕏',  freeNote: 'Free trial credits' },
  { id: 'openai',    emoji: '🤖', freeNote: 'Paid — paste your API key' },
  { id: 'anthropic', emoji: '🧠', freeNote: 'Paid — paste your API key' },
  { id: 'custom',    emoji: '🖥️', freeNote: 'Free — runs locally (Ollama, LM Studio)' },
]

export default function AiProviders() {
  const [st, setSt] = useState<KeyState>(keyState())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(true)

  // On mount: load keys from the server to restore them on this device.
  useEffect(() => {
    accountRequest('/api/v1/ai-keys')
      .then((data: Partial<KeyState>) => {
        // Merge: server values win for keys that exist on server,
        // but keep any locally-added values for keys absent from server.
        const local = keyState()
        const merged: KeyState = {
          keys: { ...local.keys, ...(data.keys || {}) },
          models: { ...local.models, ...(data.models || {}) },
          base: { ...local.base, ...(data.base || {}) },
          prov: (data.prov as ProviderId) || local.prov,
          mt: data.mt || local.mt,
          puterOk: local.puterOk,
        }
        saveKeys(merged)
        setSt(merged)
      })
      .catch(() => { /* offline — use local state */ })
      .finally(() => setSyncing(false))
  }, [])

  function update(partial: Partial<KeyState>) {
    setSt((prev) => {
      const next = { ...prev, ...partial }
      saveKeys(next)
      return next
    })
  }

  function setKey(providerId: string, value: string) {
    update({ keys: { ...st.keys, [providerId]: value.trim() } })
  }

  function setModel(providerId: string, value: string) {
    update({ models: { ...st.models, [providerId]: value.trim() } })
  }

  function setBase(providerId: string, value: string) {
    update({ base: { ...st.base, [providerId]: value.trim() } })
  }

  async function syncToServer() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await accountRequest('/api/v1/ai-keys', {
        keys: st.keys,
        models: st.models,
        base: st.base,
        prov: st.prov,
        mt: st.mt,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      const message = (e as Error).message || 'Could not save to server.'
      setError(message)
      if (/not signed in|request failed \(401\)/i.test(message)) promptForSignIn()
    } finally {
      setSaving(false)
    }
  }

  async function openRouterGoogleSignIn() {
    try {
      await beginGoogleSignIn()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (syncing) return <p className="center muted" style={{ padding: 40 }}>Loading your AI settings…</p>

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', paddingBottom: 40 }}>
      <h2 style={{ marginBottom: 4 }}>AI Providers</h2>
      <p className="muted" style={{ marginBottom: 24 }}>
        Connect free AI providers to power mock interviews, explanations, and translations.
        Keys are saved to your account and work on any device.
      </p>

      {/* Active provider selector */}
      <section className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px' }}>Active provider</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          The provider used for AI features in this app.
        </p>
        <select
          value={st.prov}
          onChange={(e) => update({ prov: e.target.value as ProviderId })}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border, #ddd)' }}
        >
          {LISTED_PROVIDERS.map(({ id }) => (
            <option key={id} value={id}>{PROVIDERS[id].name}</option>
          ))}
        </select>
      </section>

      {/* Provider cards */}
      {LISTED_PROVIDERS.map(({ id, emoji, freeNote }) => {
        const prov = PROVIDERS[id]
        const hasKey = !!st.keys[id]
        const isOpenRouter = id === 'openrouter'

        return (
          <section
            key={id}
            className="card"
            style={{
              padding: 20,
              marginBottom: 14,
              borderLeft: st.prov === id ? '3px solid var(--accent, #4f8ef7)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 15 }}>{prov.name}</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 12 }}>{freeNote}</span>
                  {hasKey && (
                    <span style={{ fontSize: 12, color: 'var(--ok, #22c55e)', fontWeight: 600 }}>
                      ✓ Key saved
                    </span>
                  )}
                </div>
              </div>
              {prov.keyUrl && (
                <a
                  href={prov.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost"
                  style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '4px 10px' }}
                >
                  Get key ↗
                </a>
              )}
            </div>

            {/* OpenRouter: "Continue with Google" for free models */}
            {isOpenRouter && (
              <button
                type="button"
                onClick={openRouterGoogleSignIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1.5px solid var(--border, #ddd)',
                  background: '#fff',
                  color: '#222',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginBottom: 10,
                  width: 'fit-content',
                }}
              >
                <GoogleIcon />
                Connect with Google (free models)
              </button>
            )}

            {/* API key input (shown for all except puter/server/claude) */}
            {prov.needsKey !== false && id !== 'puter' && id !== 'claude' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 13 }}>
                  API Key
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={isOpenRouter ? 'sk-or-… (optional if using Google sign-in above)' : `Paste your ${prov.name} key…`}
                    value={st.keys[id] || ''}
                    onChange={(e) => setKey(id, e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border, #ddd)',
                      fontFamily: 'monospace',
                      fontSize: 13,
                    }}
                  />
                </label>
              </div>
            )}

            {/* Custom / Ollama: show model + base URL fields */}
            {id === 'custom' && (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: 13 }}>
                  Base URL
                  <input
                    type="url"
                    autoComplete="off"
                    placeholder={prov.base || 'http://localhost:11434/v1'}
                    value={st.base[id] || ''}
                    onChange={(e) => setBase(id, e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border, #ddd)',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 13 }}>
                  Model name
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={prov.model || 'llama3'}
                    value={st.models[id] || ''}
                    onChange={(e) => setModel(id, e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border, #ddd)',
                      fontSize: 13,
                    }}
                  />
                </label>
              </div>
            )}
          </section>
        )
      })}

      {/* Save to account button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button
          className="btn primary"
          type="button"
          onClick={syncToServer}
          disabled={saving}
          style={{ minWidth: 180 }}
        >
          {saving ? 'Saving…' : '💾 Save to my account'}
        </button>
        {saved && <span style={{ color: 'var(--ok, #22c55e)', fontWeight: 600 }}>Saved ✓</span>}
      </div>
      {error && <p role="alert" style={{ color: 'var(--bad)', marginTop: 8 }}>{error}</p>}

      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Keys are saved to your private account in the database and restored on any device you sign in to.
        They are never shared with others. Clear them any time by deleting the key values and saving.
      </p>

      {/* ── Local AI Gateway Status ── */}
      <LocalServiceStatus />

      {/* Free AI notes */}
      <section className="card" style={{ padding: 20, marginTop: 24 }}>
        <h3 style={{ margin: '0 0 12px' }}>About free AI providers</h3>
        <ul className="muted" style={{ fontSize: 13, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li><strong>OpenRouter</strong> — sign in with Google to get free access to Llama 3, Mistral, Qwen, and Gemini 1.5 Flash. No credit card. <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">openrouter.ai</a></li>
          <li><strong>Gemini</strong> — free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. Best for Urdu/Hindi translation.</li>
          <li><strong>Groq</strong> — free tier with rate limits. Very fast responses. <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com</a></li>
          <li><strong>Ollama</strong> — runs entirely on your own machine. Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a>, pull a model, set base URL to <code>http://localhost:11434/v1</code>.</li>
          <li><strong>ChatGPT (OpenAI) &amp; Claude (Anthropic)</strong> — no free API tier. If you have a paid API key you can paste it here.</li>
          <li><strong>Kiro</strong> — Kiro is an IDE assistant, not a public API. It cannot be connected as an AI provider.</li>
        </ul>
      </section>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function LocalServiceStatus() {
  const [gwStatus, setGwStatus] = useState(gatewayStatus())
  const [gwOn, setGwOn] = useState(gatewayReady())
  const [ttsOn, setTtsOn] = useState(ttsServerAvailable())
  const [engines, setEngines] = useState<TtsEngineInfo[]>([])
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetchEngines().then(setEngines).catch(() => {})
  }, [])

  async function recheck() {
    setChecking(true)
    await Promise.all([detectGateway(), checkTtsServer()])
    setGwOn(gatewayReady())
    setGwStatus(gatewayStatus())
    setTtsOn(ttsServerAvailable())
    if (ttsServerAvailable()) fetchEngines().then(setEngines).catch(() => {})
    setChecking(false)
  }

  const dot = (on: boolean) => (
    <i style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: on ? 'var(--ok, #22c55e)' : 'var(--muted, #888)',
      marginRight: 6,
    }} />
  )

  const qualityBadge: Record<string, string> = {
    excellent: '🟢', 'very good': '🟢', good: '🟡', studio: '🟢', expressive: '🔵',
  }

  return (
    <section className="card" style={{ padding: 20, marginTop: 20, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 10px' }}>Local Services (localhost)</h3>
      <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
        Optional local services for offline AI and high-quality Urdu/Hindi TTS.
        Only active when running on localhost — gracefully ignored on mobile/Vercel.
      </p>

      {/* Free AI Gateway */}
      <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          {dot(gwOn)}
          <strong>Free AI Gateway</strong>
          <span className="muted" style={{ fontSize: 12 }}>— {gwStatus}</span>
        </div>
        <div className="muted" style={{ fontSize: 12, paddingLeft: 14 }}>
          Start: <code>pip install freellmpool && freellmpool serve</code>
          {' '}→ 178 free AI routes, auto-failover, no API key needed
        </div>
      </div>

      {/* TTS Server */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6 }}>
          {dot(ttsOn)}
          <strong>TTS Server</strong>
          <span className="muted" style={{ fontSize: 12 }}>
            — {ttsOn ? 'Running on port 5052' : 'Not detected (port 5052)'}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, paddingLeft: 14, marginBottom: 8 }}>
          Start: <code>pip install edge-tts gTTS flask flask-cors && python server/tts_server.py</code>
        </div>

        {/* Engine list */}
        {engines.length > 0 && (
          <div style={{ paddingLeft: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Available TTS engines:</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {engines.map((eng) => (
                <div key={eng.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span>{eng.available ? '✓' : '○'}</span>
                  <span style={{ color: eng.available ? 'inherit' : 'var(--muted)' }}>
                    <strong>{eng.name}</strong>
                    {' '}{qualityBadge[eng.quality] ?? ''} {eng.offline ? '📴' : '🌐'}{eng.gpu ? ' GPU' : ''}
                  </span>
                  {!eng.available && (
                    <code style={{ fontSize: 11, color: 'var(--muted)' }}>{eng.install.split(' ')[0] === 'pip' ? eng.install : 'See docs'}</code>
                  )}
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              📴 = offline capable &nbsp; 🌐 = needs internet &nbsp; GPU = needs NVIDIA GPU
            </div>
          </div>
        )}
      </div>

      <button className="btn ghost" type="button" onClick={recheck} disabled={checking} style={{ fontSize: 13 }}>
        {checking ? 'Checking…' : '🔄 Re-check local services'}
      </button>
    </section>
  )
}
