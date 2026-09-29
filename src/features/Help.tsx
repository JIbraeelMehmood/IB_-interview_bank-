/** Help: how the app works, what is and is not possible, and how to keep it
 *  working offline. Carries the honest limits from the v7 handover. */
import { useState } from 'react'
import { canInstall, isStandalone, promptInstall } from '../lib/install'
import { aiReady, aiWhy, serverUrl } from '../lib/ai'
import { ttsAvailable, listVoices, voiceProblem } from '../lib/speech'
import { recognitionAvailable } from '../lib/speech'
import { Chip, Chips, toast } from '../components/ui'
import { glossList } from '../lib/text'
import { LANG_NAME, LANGS } from '../lib/types'

export default function Help() {
  const [gloss, setGloss] = useState<{ en: string; ur: string; hi: string }[] | null>(null)
  const voices = ttsAvailable() ? listVoices() : []
  const ur = voices.filter((v) => /^(ur|hi)/i.test(v.lang)).length
  const problem = voiceProblem()

  return (
    <div className="stack">
      <div className="card stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>How this app works</h2>
        <p className="small">
          Interview Box is a <b>Progressive Web App</b>. Install it and it opens like a normal app, works with
          no internet, and keeps your progress on this device.
        </p>
        <ul className="small">
          <li><b>1,950 questions</b> from your Interview Master Book plus a new bank, with English questions and explanations in Urdu, Roman Urdu or Hindi.</li>
          <li><b>Mark Weak / Okay / Solid</b> and a spaced-repetition schedule brings each question back at the right time (1, 3, 7 days and onward).</li>
          <li><b>Listen</b> hands-free while travelling: English question → explanation → the one English line to say in the interview.</li>
          <li><b>Everything offline</b>: the bank, your progress, saved translations, the SQL Lab and flashcards.</li>
        </ul>
        {!isStandalone() && canInstall() && (
          <button className="btn primary" onClick={() => void promptInstall()}>
            📲 Install Interview Box
          </button>
        )}
        {isStandalone() && <div className="badge ok">Installed</div>}
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>What works without AI</h3>
        <ul className="small">
          <li>The whole library, search, filters and topics</li>
          <li>JD Prep offline analysis (technologies, seniority, grouped questions)</li>
          <li>Flashcard mock interviews</li>
          <li>SQL Lab — 30 exercises on a real SQLite engine in your browser</li>
          <li>English audio, and every translation already saved on this device</li>
          <li>Progress, spaced repetition, backups</li>
        </ul>
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Turning AI on</h3>
        <p className="small">
          {aiReady()
            ? 'AI is connected. Every ✨ button is live.'
            : aiWhy() || 'Connect a provider to use the AI features.'}
        </p>
        <a className="btn" href="/progress">
          AI Connect
        </a>
        <div className="small muted">
          {serverUrl()
            ? 'You have a server set, so keys stay on your own server.'
            : 'You are connecting from the browser, so your key is stored only on this device and never included in a backup.'}
        </div>
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Audio and voice</h3>
        {problem && (
          <div className="card small" style={{ borderColor: 'var(--warn)' }}>
            <b>Nothing will play on this device yet.</b>
            <p style={{ marginBottom: 6 }}>{problem}</p>
            <ul style={{ marginBottom: 0 }}>
              <li><b>Windows:</b> Settings → Time &amp; language → Language → add a voice pack (e.g. English (United States)).</li>
              <li><b>Linux:</b> install <code>speech-dispatcher</code> and <code>espeak-ng</code>, then restart the browser.</li>
              <li><b>Android / iPhone:</b> voices come with the system — add them in Settings → Accessibility → Text-to-speech.</li>
              <li>Headless or a fresh container has no voices at all; that is expected.</li>
            </ul>
          </div>
        )}
        <ul className="small">
          <li>{voices.length} voice{voices.length === 1 ? '' : 's'} installed on this device; {ur} of them can read Urdu or Hindi.</li>
          <li>English tech words inside Urdu and Hindi are rewritten using a 260-term dictionary, so <i>Laravel</i> sounds like لاراول, not "laravel" read in English letters.</li>
          <li>Set your battery to <b>Unrestricted</b> so the browser does not pause speech when the screen locks.</li>
          <li>A server with neural Urdu and Hindi voices is planned; until then, quality depends on the voices on this phone.</li>
        </ul>
        <button className="btn sm" onClick={() => void glossList().then((g) => { setGloss(g); toast(`${g.length} terms`) })}>
          Show the pronunciation dictionary
        </button>
        {gloss && (
          <div className="tbl" style={{ maxHeight: 250, overflowY: 'auto' }}>
            <table className="res">
              <tbody>
                {gloss.map((g, i) => (
                  <tr key={i}><td>{g.en}</td><td>{g.ur}</td><td>{g.hi}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Pronunciation scoring</h3>
        <p className="small">
          The score in Shadowing and the Answer tab reflects what the speech recogniser understood, not a true
          accent analysis. Real phoneme-level scoring is planned for the server version.
        </p>
        {!recognitionAvailable() && (
          <div className="small" style={{ color: 'var(--warn)' }}>
            This browser cannot listen. Chrome works; in-app web views often do not. You can always type, or use
            your keyboard’s 🎤 dictation key.
          </div>
        )}
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Not possible, by design</h3>
        <div className="tbl">
          <table className="res">
            <tbody>
              <tr><td>Sign in with a ChatGPT or Claude subscription</td><td className="muted">Those companies do not allow third-party apps. Use Google sign-in (OpenRouter) — the same models.</td></tr>
              <tr><td>Use Cline or Kiro as the app’s AI</td><td className="muted">They are coding tools, not chat services other apps can call.</td></tr>
              <tr><td>Clone a voice fully on the phone</td><td className="muted">Needs a GPU model. Server-side cloning is planned; a voice-match option works today.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Languages</h3>
        <Chips>
          {LANGS.map((l) => (
            <Chip key={l} onClick={() => toast(`${LANG_NAME[l]} — set it in Progress → Language & audio`)}>
              {LANG_NAME[l]}
            </Chip>
          ))}
        </Chips>
        <p className="small muted" style={{ margin: 0 }}>
          Urdu uses Pakistani vocabulary and everyday spoken register, not bookish Urdu. Hindi is everyday
          Hinglish. Roman Urdu uses one consistent spelling. Tech names always stay in English.
        </p>
      </div>

      <div className="card stack-sm">
        <h3 style={{ fontSize: '1rem' }}>Your data</h3>
        <p className="small muted">
          Progress, ratings, notes, saved translations and recordings stay on this device. Nothing is sent
          anywhere except to the AI provider you choose, and only for the text you ask about. Backups live in
          Progress → Backup.
        </p>
        <a className="btn sm" href="/progress">
          Backup and sync
        </a>
      </div>
    </div>
  )
}
