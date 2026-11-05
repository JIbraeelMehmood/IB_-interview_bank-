# Interview Box — Updated Master Plan
## Mobile PWA · Vercel Deployment · Integration Roadmap · Improvements

**Updated:** 2026-10-27
**Based on analysis of:** `plan.md`, `pwa/` directory (React 19 + Vite + vite-plugin-pwa),
`interview-box.html` (v7, 3.55 MB), existing integrations (audio/5, AI gateway/7, translation/11)

---

## Table of Contents

1. [Situation Summary — Where Things Stand](#1-situation-summary)
2. [The Core Decision: HTML file vs PWA](#2-the-core-decision-html-vs-pwa)
3. [Recommended Approach: Ship the PWA, Keep v7 as Fallback](#3-recommended-approach)
4. [Mobile Support — What Already Works and What Needs Fixing](#4-mobile-support)
5. [Vercel Deployment Plan](#5-vercel-deployment)
6. [PWA Completion Gaps — What Must Be Finished First](#6-pwa-completion-gaps)
7. [Integration Roadmap (Mobile + Web Compatible)](#7-integration-roadmap)
8. [Phase 0 — Deploy the PWA to Vercel (Today)](#8-phase-0)
9. [Phase 1 — Fill PWA Gaps (This Week)](#9-phase-1)
10. [Phase 2 — Mobile UX Polish](#10-phase-2)
11. [Phase 3 — AI Gateway (Reliability)](#11-phase-3)
12. [Phase 4 — Language + Transliteration](#12-phase-4)
13. [Phase 5 — Audio Layer](#13-phase-5)
14. [Phase 6 — Knowledge Base (PAKGOV)](#14-phase-6)
15. [What Does NOT Work on Mobile/Vercel (By Design)](#15-what-does-not-work)
16. [Architecture After All Phases](#16-final-architecture)
17. [Vercel Config Checklist](#17-vercel-checklist)
18. [Decision Log — Why Each Choice Was Made](#18-decision-log)

---

## 1. Situation Summary

### What exists right now

| Asset | State | Size | Mobile? | Vercel? |
|-------|-------|------|---------|---------|
| `interview-box.html` (v7) | Deployed on Vercel, AI broken | 3.55 MB | Loads but not installable | ⚠️ Loads, AI fails |
| `pwa/` directory | React 19 PWA, build scripts exist | 9,322 lines TS | Installable, offline-first | Ready to deploy |
| `ibx-transliteration.js` | Deployed alongside HTML | 636 KB | Works in browser | ✅ |
| Whisper Flask server | Localhost only (port 5051) | — | Not applicable | ❌ Cannot run on Vercel |
| freellmpool / Ollama | Localhost only | — | Not applicable | ❌ Cannot run on Vercel |
| PAKGOV RAG | Localhost only (port 8501) | — | Not applicable | ❌ Cannot run on Vercel |

### The core problem

v7 (`interview-box.html`) was designed for **localhost**. On Vercel (and on a phone),
the AI layer (Puter popup sign-in) is broken or blocked, making the app appear to work
but silently fail on its most important feature.

The `pwa/` directory is a **proper rewrite** that solves every structural problem:
- Installable on Android and iOS (service worker + manifest)
- Works offline (Workbox precaches the bank + app shell)
- AI uses direct API keys with no popup (Groq, Gemini, OpenRouter)
- No localhost dependencies in normal usage
- Mobile UX verified at 390 px / Pixel 5 / iPhone 13 profiles

---

## 2. The Core Decision: HTML File vs PWA

### Option A — Keep v7 HTML, patch for Vercel

| Pro | Con |
|-----|-----|
| Less work in the short term | AI is structurally broken (Puter popup won't work on Vercel in most browsers) |
| Single file is simple to understand | Cannot install on phone (no service worker on a plain .html file) |
| All 2474 questions already there | Cannot work offline after first load |
| All Phase 1 integrations patched in | Mobile UX was never designed for small screens |
| | Needs a separate `vercel.json` fix + cloud-mode detection code |
| | Still fails for offline/mobile use cases |

**Verdict: Dead end for mobile.** A `file://` or plain `http://` served HTML page cannot
register a service worker, so you can never get offline support or the "Add to Home Screen"
install experience. The `pwa/` directory already solves this.

### Option B — Ship the PWA, Keep v7 on a Separate Route

| Pro | Con |
|-----|-----|
| Installable on Android/iOS today | PWA needs the question bank extracted from v7 first |
| Works fully offline | Slightly more complex deploy (two builds) |
| Proper mobile UX (touch targets, bottom nav, no overflow) | PWA has 1,950 questions vs v7's 2,474 |
| AI uses direct API keys — no popup | Some Phase 1 integrations (MistakeClassifier, STAR, Prosody) not yet ported to PWA |
| TypeScript, tested (37 unit + 39 browser checks) | |
| Multi-device sync when Laravel server is connected | |
| Google sign-in (OpenRouter OAuth PKCE) | |

**Verdict: The right path. The PWA was purpose-built for exactly this goal.**

### Recommendation: Option B

- **Primary URL:** `https://your-app.vercel.app/` → PWA (installable, offline, mobile)
- **Legacy URL:** `https://your-app.vercel.app/v7` → v7 HTML (full question bank, fallback)
- The PWA's extractor (`npm run extract`) pulls the question bank from v7 automatically —
  so you get 1,950 high-quality questions immediately and can add the remaining 524 later.

---

## 3. Recommended Approach

### One Vercel deployment, two builds

```
interview-box/
├── pwa/                    ← PRIMARY — React PWA, Vite, vite-plugin-pwa
│   ├── dist/               ← Vite output: JS chunks, service worker, icons
│   └── ...
├── interview-box.html      ← LEGACY v7 — still deployed at /v7
├── ibx-transliteration.js  ← SHARED — loaded by both
└── vercel.json             ← routes /v7 to HTML, / to PWA dist
```

### Deploy strategy

```
Vercel project root = interview-box/
Build command: cd pwa && npm install && npm run build
Output directory: pwa/dist
```

v7 is served as a static file alongside the PWA build. One deploy, both work.

---

## 4. Mobile Support

### What the PWA already has

These are verified by `node e2e/mobile.mjs` against iPhone 13 + Pixel 5 profiles:

| Mobile requirement | Status |
|-------------------|--------|
| Installable via browser | ✅ Manifest + service worker |
| Works fully offline | ✅ Workbox precaches app + bank |
| No horizontal overflow at 390 px / 393 px | ✅ Fixed in e2e |
| Touch targets ≥ 32 px | ✅ Fixed (was 23–28 px) |
| Bottom nav above player bar | ✅ |
| Lock-screen audio controls | ✅ Media Session API |
| Offline after first load | ✅ Service worker precaches everything |
| iOS Safari install (Add to Home Screen) | ✅ |
| Android Chrome install | ✅ |
| Theme color + background color | ✅ (#1D5C48 / #0E1311) |
| Portrait orientation hint | ✅ |

### Online vs Offline capability (mobile)

| Feature | Online | Offline |
|---------|--------|---------|
| Browse 1,950 questions | ✅ | ✅ (cached by SW) |
| Filter by tech, level, category | ✅ | ✅ |
| Listen (English/Urdu/Hindi) | ✅ | ✅ if phone has voices installed |
| Speak + rate questions | ✅ | ✅ |
| Progress tracking | ✅ | ✅ (IndexedDB) |
| Spaced repetition (due today) | ✅ | ✅ |
| SQL Lab | ✅ | ✅ (asm.js, no WASM fetch) |
| JD Prep (offline analysis) | ✅ | ✅ |
| JD Prep (AI deep prep) | ✅ | ❌ (needs AI provider) |
| Mock interview (flashcard mode) | ✅ | ✅ |
| Mock interview (AI grading) | ✅ | ❌ (needs AI provider) |
| Speaking coach (metrics) | ✅ | ✅ |
| Speaking coach (AI feedback) | ✅ | ❌ (needs AI provider) |
| Translation / explanations (cached) | ✅ | ✅ (IndexedDB cache of 3,000) |
| Translation / explanations (new) | ✅ | ❌ (needs AI provider) |
| Backup / restore | ✅ | ✅ |
| Sync (when Laravel server set) | ✅ | ❌ (queued, flushes on reconnect) |

### Mobile AI flow (cloud mode, no localhost)

```
User taps Explain/Mock/Coach (phone, online)
    │
    ▼
PWA ai.ts → keyState().prov
    │
    ├── 'groq'     → fetch('https://api.groq.com/openai/v1/chat/completions')
    ├── 'gemini'   → fetch('https://generativelanguage.googleapis.com/v1beta/...')
    ├── 'openrouter' → fetch('https://openrouter.ai/api/v1/chat/completions')
    ├── 'puter'    → puter.ai.chat() (free, needs sign-in once)
    └── 'server'   → fetch('https://your-laravel.app/api/v1/ai/text') [optional]

No popup blockers, no localhost ports, works on every device
```

---

## 5. Vercel Deployment Plan

### 5.1 vercel.json (root of interview-box/)

```json
{
  "version": 2,
  "buildCommand": "cd pwa && npm install && npm run build",
  "outputDirectory": "pwa/dist",
  "routes": [
    {
      "src": "/v7",
      "dest": "/interview-box.html"
    },
    {
      "src": "/ibx-transliteration.js",
      "dest": "/ibx-transliteration.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" },
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

**Why the catch-all rewrites to `/index.html`:**
React Router uses client-side routing. Every URL (`/library`, `/mock`, etc.) must return
`index.html` on a hard refresh, or the user gets a 404. Vercel handles this automatically
if you add the catch-all rule.

### 5.2 Environment — no secrets needed for client mode

The PWA stores AI keys in `localStorage['ibx-keys']`. Nothing is in environment variables.
The user enters their own key in AI Connect → Settings on first use.

Optional Vercel environment variables (only if you add a server):

```
IBX_SERVER_URL = https://your-laravel-api.com
```

### 5.3 Custom domain

If you have a domain, add it in Vercel dashboard. Vercel auto-provisions HTTPS (Let's
Encrypt). HTTPS is **required** for the service worker to activate.

---

## 6. PWA Completion Gaps

The `pwa/` directory is complete for its core scope. Before deploying, verify these:

### 6.1 Question bank extraction

The bank JSON in `pwa/public/data/` is **generated** from v7 by the extractor. It may not
be current if v7 was updated after the PWA was last built.

```bash
cd pwa
npm install
npm run extract    # reads ../interview-box.html → public/data/bank.json
```

Expected output: `bank: 1950 questions, 41 parts, 212 chapters, 49 tech definitions`

If v7 has 2,474 questions and the extractor gives 1,950, the difference (524) is in v7's
format that the extractor does not yet handle. This is fine for launch. File a backlog item
to extract the remaining questions.

### 6.2 Icons

PWA icons must be real PNG files for Chrome's install prompt.

```bash
cd pwa
npm run icons      # generates public/icons/icon-192.png, icon-512.png, maskable-512.png
```

Verify:
```bash
file pwa/public/icons/icon-192.png  # should say "PNG image data"
```

### 6.3 Build verification

```bash
cd pwa
npm run build      # must complete with 0 errors
npm run preview    # test at http://localhost:4173
node e2e/smoke.mjs # 39 browser checks
node e2e/offline.mjs # proves offline works
node e2e/mobile.mjs  # phone profile checks
```

### 6.4 Phase 1 integrations — port status

These features exist in v7 (patched in by `patch-phase1-enhancements.js`) but are NOT
yet in the PWA. Add them after Vercel launch:

| Feature | v7 Status | PWA Status | Effort to port |
|---------|-----------|------------|----------------|
| MistakeClassifier (4-tier) | ✅ | ❌ | 2h — pure logic, port to `features.ts` |
| STAR Evaluator | ✅ | ❌ | 2h — port to `features.ts` |
| Prosody Analyzer (WPM/fillers) | ✅ | ⚠️ Partial (WPM exists) | 2h |
| Pakistani persona in mock | ✅ | ✅ (persona option in Mock.tsx) | ✅ Done |
| Reference answers | ✅ | ❌ | 3h — add to question card |
| Session MD export | ✅ | ❌ | 2h — add to Mock.tsx |
| Company style profiles | ✅ | ❌ | 2h — add to Progress settings |
| Agent memory (cross-session) | ❌ | ❌ | 4h — IndexedDB agent context |
| Adaptive QBL curriculum | ❌ | ❌ | 4h — smart question picker |

---

## 7. Integration Roadmap (Mobile + Web Compatible)

### Which integrations work on Vercel/mobile vs. localhost-only

| Integration | Works on Vercel/mobile? | Condition |
|-------------|------------------------|-----------|
| freellmpool (AI gateway) | ❌ Localhost only | Needs Python `pip install freellmpool` |
| Ollama (offline AI) | ❌ Localhost only | Needs local GPU/CPU model |
| Whisper STT (port 5051) | ❌ Localhost only | Needs Python Flask + model |
| scout-intel-mcp | ❌ Localhost only | Needs Python MCP server |
| PAKGOV RAG (port 8501) | ❌ Localhost only | Needs Python Streamlit + FAISS |
| UTRNet OCR | ❌ Localhost only | Needs PyTorch + model weights |
| Awaaz TTS (edge-tts) | ❌ Localhost only | Needs Python Flask |
| Piper TTS | ❌ Localhost only | Needs piper-tts binary |
| **Groq API (cloud AI)** | ✅ Works everywhere | User enters free API key |
| **Gemini API (cloud AI)** | ✅ Works everywhere | User enters free API key |
| **OpenRouter (cloud AI)** | ✅ Works everywhere | Free tier, Google sign-in |
| **ibx-transliteration.js** | ✅ Works everywhere | Static file deployed |
| **Roman→Urdu dictionary (30K)** | ✅ Works everywhere | Build-time merge |
| **urduhack normalization** | ✅ Works everywhere | Pure JS, build-time port |
| **SQL Lab (asm.js)** | ✅ Works everywhere | Inlined asm.js |
| **Puter AI** | ✅ Works (sign-in once) | No key, free allowance |
| **Browser speechSynthesis TTS** | ✅ Works on device | Uses installed voices |
| **Web Speech API (STT)** | ✅ Chrome/Android | Not available on iOS Safari |

**Rule:** Any integration that requires `localhost:PORT` is a **localhost-only** feature.
On Vercel and mobile, it is hidden with a tooltip: "Available on localhost only".

The PWA already implements this correctly — it does not try to connect to localhost at all.
It uses the cloud providers (Groq, Gemini, OpenRouter, Puter) and browser APIs (Web Speech,
speechSynthesis) for all AI and audio on mobile/Vercel.

---

## 8. Phase 0 — Deploy the PWA to Vercel (Today)

**Time: 30–60 minutes**
**Goal: Installable, offline, working on mobile and browser**

### Steps

```bash
# 1. Extract the question bank from v7
cd pwa
npm install
npm run extract

# 2. Generate PWA icons
npm run icons

# 3. Build and smoke test
npm run build
node e2e/smoke.mjs
node e2e/mobile.mjs

# 4. Create vercel.json at the project root
# (see §5.1 above)

# 5. Push to GitHub and connect to Vercel
# Vercel detects: build command = cd pwa && npm install && npm run build
# Output dir = pwa/dist

# 6. After deploy, open on phone → install the PWA
# Android: Chrome shows "Add to Home screen" or three-dot menu → Install app
# iOS: Safari share → Add to Home Screen
```

### First-run experience on phone

1. Open `https://your-app.vercel.app`
2. Install prompt appears (Android Chrome)
3. App opens full-screen (no browser chrome)
4. First load: downloads 1.37 MB bank, service worker precaches everything
5. Turn off Wi-Fi → reopen → **fully works offline** (questions, filters, SQL Lab, player)
6. To enable AI: Progress → AI Connect → enter free Groq key
   (alternative: sign in once with Puter for zero-config free AI)

---

## 9. Phase 1 — Fill PWA Gaps (This Week)

**Time: ~15 hours**
**Goal: Feature parity with v7's Phase 1 enhancements**

### 9.1 Port MistakeClassifier to PWA

Add to `pwa/src/lib/features.ts`:

```typescript
// 4-tier answer diagnosis (from Intervity MistakeClassifier.ts)
export type MistakeTier = 'CONCEPTUAL' | 'L4_CEILING' | 'VAGUE' | 'STRUCTURAL'

export function classifyMistake(answer: string, question: string): MistakeTier {
  const words = answer.trim().split(/\s+/).length
  if (words < 15) return 'VAGUE'

  const conceptualMarkers = ['i think', 'maybe', 'i guess', 'not sure', 'kind of']
  const structuralMarkers = ['and then', 'so basically', 'like i said']

  const lower = answer.toLowerCase()
  if (conceptualMarkers.some(m => lower.includes(m)) && words < 40) return 'CONCEPTUAL'
  if (structuralMarkers.filter(m => lower.includes(m)).length >= 2) return 'STRUCTURAL'
  if (words > 200) return 'L4_CEILING'
  return 'CONCEPTUAL'
}
```

### 9.2 Port STAR Evaluator to PWA

Add to `pwa/src/lib/features.ts`:

```typescript
// STAR behavioral answer scorer
export interface StarScore {
  situation: number  // 0–3
  task: number
  action: number
  result: number
  total: number      // /12
  isBehavioral: boolean
}

export function starEval(answer: string): StarScore {
  const lower = answer.toLowerCase()
  const isBehavioral = /\b(time when|example of|tell me about|describe a situation)\b/.test(lower)
  if (!isBehavioral) return { situation: 0, task: 0, action: 0, result: 0, total: 0, isBehavioral: false }

  const s = /\b(when i|at my (previous|last|current)|in my (last|previous|current))\b/.test(lower) ? 3
          : /\b(once|there was|a time)\b/.test(lower) ? 2 : 1

  const t = /\b(my (job|role|responsibility) was|i was (asked|assigned|responsible))\b/.test(lower) ? 3
          : /\b(needed to|had to|was supposed to)\b/.test(lower) ? 2 : 1

  const a = /\b(i (decided|implemented|created|built|fixed|solved|developed))\b/.test(lower) ? 3
          : /\b(i (tried|worked|managed|handled))\b/.test(lower) ? 2 : 1

  const r = /\b(result(ed)?|outcome|improved|reduced|increased|achieved|saved)\b/.test(lower) ? 3
          : /\b(which meant|so that|this (helped|allowed|enabled))\b/.test(lower) ? 2 : 1

  return { situation: s, task: t, action: a, result: r, total: s + t + a + r, isBehavioral: true }
}
```

### 9.3 Reference Answers

Add "💡 Model Answer" button to Library card and Mock feedback:

```typescript
// In db.ts: add to translations table or a new refAnswers table
// key: code, value: { short: string, long: string, bullets: string[] }

// In features.ts:
export async function getRefAnswer(code: string, q: string, a: string): Promise<string> {
  // Check cache first
  const cached = await db.explains.get(`ref:${code}`)
  if (cached) return cached.a || ''

  // Generate via AI
  const text = await aiText(
    `You are a senior ${q.includes('SQL') ? 'database' : 'software'} engineer.
Give a concise 3-bullet model answer for this interview question.
Question: ${q}
Answer context: ${a}
Format: 3 bullet points, each under 30 words. Plain text, no markdown.`,
    { task: 'quick' }
  )

  // Cache it
  await db.explains.put({ id: `ref:${code}`, code, lang: 'en', a: text, t: Date.now() })
  return text
}
```

### 9.4 Session Markdown Export

Add to `Mock.tsx` end-of-session view:

```typescript
function exportSessionMd(session: MockSession): void {
  const lines = [
    `# Mock Interview — ${new Date(session.at).toLocaleDateString()}`,
    `**Score:** ${session.overall}/10 | **Verdict:** ${session.verdict}`,
    '',
    '## Questions & Answers',
  ]
  for (const q of session.questions) {
    lines.push(`\n### ${q.question}`)
    lines.push(`**Your answer:** ${q.answer}`)
    lines.push(`**Score:** ${q.score}/10`)
    lines.push(`**Feedback:** ${q.feedback}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mock-${Date.now()}.md`
  a.click()
}
```

### 9.5 Company Style Profiles

Add to Progress → AI Connect settings:

```typescript
// In settings.ts
export const COMPANY_PROFILES = {
  pitb: {
    name: 'PITB / Pakistan Railways',
    style: 'Government interview. Questions on Laravel, ESTACODE, procurement rules. Formal Urdu expected. Dress formally.',
    focus: ['laravel', 'constitution', 'pitb', 'governance'],
  },
  google: {
    name: 'Google',
    style: 'Behavioral + system design. STAR method. Leetcode medium. 4–5 rounds.',
    focus: ['algorithms', 'system-design', 'behavioral'],
  },
  arbisoft: {
    name: 'Arbisoft (Pakistan)',
    style: 'Django/React focus. Technical depth. Culture fit. 2–3 rounds.',
    focus: ['django', 'react', 'postgresql'],
  },
  systems: {
    name: 'Systems Limited',
    style: 'Enterprise Java/.NET or Laravel. Process-heavy. Formal.',
    focus: ['laravel', 'java', 'enterprise'],
  },
}
```

---

## 10. Phase 2 — Mobile UX Polish

**Time: ~6 hours**
**Goal: Excellent experience on a phone, one-handed use**

### 10.1 Swipe gestures on question cards

Add touch swipe: swipe right = Solid, swipe left = Weak.
This is the most natural mobile interaction for flashcard-style review.

```typescript
// useSwipe hook — add to Library.tsx card:
function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef(0)
  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current
      if (dx < -60) onLeft()
      else if (dx > 60) onRight()
    },
  }
}
```

### 10.2 Haptic feedback on rating

```typescript
// When user taps Weak/Okay/Solid on mobile:
if ('vibrate' in navigator) navigator.vibrate(10)  // 10ms tap feedback
```

### 10.3 Bottom sheet for AI tools

On mobile, replace the inline AI tool buttons (which stack vertically and take space) with a
bottom sheet drawer triggered by one "✨ AI Tools" button per card. This recovers vertical
space without hiding functionality.

### 10.4 Keep-awake during listen mode

The service worker and player already request Wake Lock. Make sure it is requested
immediately on "Listen" start, not after a delay:

```typescript
// In player.ts — ensure Wake Lock is requested on play():
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try { wakeLock = await navigator.wakeLock.request('screen') } catch {}
  }
}
```

### 10.5 Offline indicator banner

When offline, show a subtle banner: "Offline — all your saved content is available".
This reassures users rather than alarming them.

### 10.6 Share button on cards

```typescript
// Web Share API — works on Android/iOS
async function shareQuestion(q: Question) {
  if (navigator.share) {
    await navigator.share({
      title: 'Interview Question',
      text: q.q,
      url: `${location.origin}/library?q=${q.code}`,
    })
  }
}
```

---

## 11. Phase 3 — AI Gateway (Reliability)

**Time: ~3 hours**
**Goal: AI works reliably on Vercel + mobile; never silently fails**

### 11.1 Auto-failover chain (cloud)

The PWA's `callProvider` in `providers.ts` currently uses one configured provider.
Add auto-failover for cloud mode:

```typescript
// In providers.ts — try configured provider, then fall back:
export async function callWithFallback(prompt: string, opts: AiOptions): Promise<string> {
  const primary = keyState().prov

  try {
    return await callProvider(prompt, opts)
  } catch (e) {
    // Primary failed — try any other configured provider
    const alternatives: ProviderId[] = ['groq', 'gemini', 'openrouter', 'puter']
    for (const p of alternatives) {
      if (p === primary) continue
      const hasKey = PROVIDERS[p].needsKey ? !!keyFor(p) : true
      const hasAccount = PROVIDERS[p].account ? !!keyState().puterOk : false
      if (!hasKey && !hasAccount) continue
      try {
        return await callProvider(prompt, { ...opts }, p)
      } catch {}
    }
    throw e  // all failed — propagate original error
  }
}
```

### 11.2 First-run AI setup flow

When the user opens the PWA for the first time and AI is not configured, show a one-time
setup card:

```
┌─────────────────────────────────────────────────────┐
│  🤖 Turn on AI (optional)                           │
│                                                     │
│  Without AI: questions, filters, SQL Lab, listening │
│  and progress tracking all work offline.            │
│                                                     │
│  With AI: explanations, mock interviews, JD prep,   │
│  speaking feedback and translation.                 │
│                                                     │
│  [🔑 Add a free Groq key]  [📧 Sign in with email] │
│  [Skip for now]                                     │
└─────────────────────────────────────────────────────┘
```

`Sign in with email` goes to OpenRouter's Google OAuth sign-in (one tap, no key to copy).

### 11.3 AI status in header (already in App.tsx)

The header already shows "AI ready" (green dot) / "AI off" (link to help).
Make sure this works correctly on first load — it does (`aiReady()` checks keys).

### 11.4 Free AI options summary for users

Document in Help screen:

| Provider | Free tier | Sign-up | Recommended for |
|----------|-----------|---------|----------------|
| Groq | ✅ No card needed | Email | Fast responses, mock interviews |
| Google Gemini | ✅ Free tier | Google account | Urdu/Hindi translation |
| OpenRouter | ✅ Free models | Email or Google | Variety of models |
| Puter | ✅ Free allowance | Email | Zero-config, sign in once |

---

## 12. Phase 4 — Language + Transliteration

**Time: ~4 hours**
**Goal: 2.4× more Roman↔Urdu coverage, fix Arabic-variant failures**

This phase works identically on Vercel, mobile, and localhost — it is pure JavaScript
merged at build time.

### 12.1 Merge 30,888-entry Roman Urdu dictionary

```bash
# Run once to rebuild ibx-transliteration.js with the bigger dictionary:
node scripts/merge-translit.mjs
# Input: ibx-transliteration.js (12,956 Urdu→Roman entries)
#        roman-urdu-translator/roman_urdu_map.json (30,888 entries)
# Output: ibx-transliteration-v2.js (~800 KB, ~32,000 entries)
```

Deploy `ibx-transliteration-v2.js` alongside the PWA on Vercel. The PWA's `lang.ts`
already loads the transliteration dictionary lazily — update the path.

### 12.2 Port urduhack character normalization (71 mappings)

Add to `pwa/src/lib/lang.ts`:

```typescript
// Arabic-variant Urdu characters → canonical Urdu (urduhack port)
const URDU_CHAR_NORM: Record<string, string> = {
  '\uFE8E': '\u06A9', '\uFE8F': '\u06A9', '\uFE90': '\u06A9',  // ک variants
  '\uFBFC': '\u06CC', '\u0649': '\u06CC', '\uFBFD': '\u06CC',  // ی variants
  // ... all 71 mappings from urduhack/_CORRECT_URDU_CHARACTERS_MAPPING
}

export function normalizeUrdu(text: string): string {
  return text
    .split('')
    .map(c => URDU_CHAR_NORM[c] ?? c)
    .join('')
    // Strip diacritics (تشکیل — harakat that break dictionary lookup)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // Strip zero-width characters (common in WhatsApp/SMS Urdu text)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
}
```

Call `normalizeUrdu()` before any dictionary lookup in `romanToUrdu()` and `urduToRoman()`.

### 12.3 Apply normalization to translation cache keys

When storing/fetching a translated card, normalize the Urdu text first so that the same
word in Arabic-variant and canonical Urdu form both hit the same cache entry.

---

## 13. Phase 5 — Audio Layer

**Time: varies by tier**
**Goal: Better Urdu TTS, especially on mobile**

### 13.1 Browser speechSynthesis (already works, improve reliability)

The PWA's `speech.ts` already implements the v7 reliability fixes. Add these:

- **Voice loading retry**: on mobile, voices may not be loaded on first `getVoices()` call.
  Wait for `speechSynthesis.onvoiceschanged` and retry.
- **Urdu fallback chain**: if no `ur-PK` voice, try `ur`, then `hi-IN` (keeps nukta letters),
  then `en-US`. Never silent.
- **Speed control**: already in Progress settings, ensure it persists.

### 13.2 Awaaz Urdu TTS (localhost + future cloud)

The `edge-tts` Python service runs on localhost. On Vercel/mobile, the fallback is
`speechSynthesis`. No action needed for the Vercel deploy — the fallback is already in place.

**Future:** If you add a Laravel backend, proxy `edge-tts` through a `/api/v1/tts` endpoint.
This would give high-quality Urdu TTS on mobile too:

```
Phone → PWA → POST /api/v1/tts?text=...&voice=ur-PK-AsadNeural
                    → Laravel → edge-tts → returns audio/mpeg
                    → Phone plays it
```

### 13.3 Audio caching strategy (already in vite.config.ts)

The Workbox config already caches `/audio/*` with `CacheFirst + range requests`.
When server audio is available, it is cached on first play and never re-downloaded.

---

## 14. Phase 6 — Knowledge Base (PAKGOV)

**Time: 30 minutes for Q&A import**
**Goal: Pakistan-specific questions in the bank**

### 14.1 Import 50 PAKGOV Q&A to the bank

This works on Vercel and mobile — the Q&A is baked into the JSON bank at build time.

```bash
node scripts/add-pakgov.mjs
# reads: ../PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl
# writes: pwa/public/data/bank-extra.json (merged at seed time)
# result: 1,950 + 50 = 2,000 questions including law/governance
```

Mark them with `s: 'import'` and `t: ['constitution', 'pakistan', 'law']` so they appear
under a "Pakistan Law & Governance" filter chip.

### 14.2 RAG service (localhost only, not mobile)

The Streamlit + FAISS RAG service requires Python and stays localhost-only. When running
on Vercel or mobile, the AI coach uses only the embedded Q&A (above) for law/governance
context. This is fine — 50 verified Q&A covers the PITB interview scope well.

---

## 15. What Does NOT Work on Mobile/Vercel (By Design)

Be honest about this in the Help screen:

| Feature | Why it can't work | Alternative |
|---------|------------------|-------------|
| Whisper STT (port 5051) | Python server, can't run in a browser | Browser Web Speech API (works on Chrome/Android) |
| Ollama offline AI | 4+ GB model, needs a local GPU/CPU | Groq free API (fast, cloud-based) |
| AnkiConnect export | Desktop Anki app, localhost only | Export as JSON/Markdown for manual import |
| freellmpool (178 routes) | Python package, needs local server | Groq/Gemini/OpenRouter (direct API keys) |
| PAKGOV RAG service | Streamlit + FAISS, localhost only | 50 embedded Q&A in the bank |
| Voice cloning (VoxCPM) | 2B-param model, needs GPU | Standard TTS voices |
| Urdu OCR (UTRNet) | PyTorch model, localhost only | Manual text entry |
| scout-intel MCP | Python MCP server, localhost only | Manual company research |

**The PWA's design rule:** features that need localhost are disabled gracefully.
They do not silently fail — they show a clear message explaining what's needed.

---

## 16. Final Architecture (After All Phases)

```
┌─────────────────────────────────────────────────────────────────┐
│              INTERVIEW BOX PWA                                  │
│         (https://your-app.vercel.app)                          │
│                                                                  │
│  React 19 + TypeScript + Vite + vite-plugin-pwa                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  12 screens:                                             │   │
│  │  Library · JD Prep · Mock · Speaking Coach · Progress   │   │
│  │  SQL Lab · Learn · Downloads · AI Studio · Topics · Help│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Data:                                                           │
│  ├── 2,000+ questions (bank.json, precached by SW)              │
│  ├── IndexedDB (Dexie): ratings, reviews, answers, mocks, JDs   │
│  └── localStorage: AI keys, settings                            │
│                                                                  │
│  AI (cloud, works on mobile):                                   │
│  ├── Groq / Gemini / OpenRouter / Puter / OpenAI                │
│  └── Auto-failover: if primary fails, try next configured key   │
│                                                                  │
│  Language:                                                       │
│  ├── 32,000-entry Roman↔Urdu dictionary (build-time merge)      │
│  ├── 71-char Arabic-variant normalization                        │
│  └── Diacritic stripping                                         │
│                                                                  │
│  Audio:                                                          │
│  ├── Browser speechSynthesis (all platforms)                    │
│  └── Web Speech API STT (Chrome/Android)                        │
│                                                                  │
│  Service Worker (Workbox):                                       │
│  ├── Precaches: app shell, bank JSON, icons                     │
│  ├── CacheFirst: audio files                                     │
│  └── NetworkFirst: API calls                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ optional, not required
                         ▼
              ┌──────────────────────┐
              │  Your Laptop         │
              │  (localhost features)│
              │                      │
              │  Whisper  port 5051  │
              │  Ollama   port 11434 │
              │  freellmpool 8000    │
              │  PAKGOV RAG  8501   │
              │  Awaaz TTS  5053    │
              └──────────────────────┘
                         │
                         │ optional, if you build it
                         ▼
              ┌──────────────────────┐
              │  Laravel Backend     │
              │  /api/v1/ai/text     │
              │  /api/v1/sync        │
              │  /api/v1/tts         │
              │  /api/v1/questions   │
              └──────────────────────┘
```

---

## 17. Vercel Config Checklist

Before deploying, verify each item:

- [ ] `pwa/public/data/bank.json` exists (run `npm run extract` first)
- [ ] `pwa/public/icons/icon-192.png` is a real PNG (run `npm run icons`)
- [ ] `pwa/public/icons/icon-512.png` is a real PNG
- [ ] `pwa/public/icons/maskable-512.png` is a real PNG
- [ ] `npm run build` completes with 0 TypeScript errors
- [ ] `node e2e/smoke.mjs` passes 39/39 checks
- [ ] `node e2e/offline.mjs` passes (proves offline works)
- [ ] `node e2e/mobile.mjs` passes (touch targets, no overflow)
- [ ] `vercel.json` has catch-all route to `/index.html`
- [ ] `vercel.json` has `Service-Worker-Allowed: /` header on `/sw.js`
- [ ] v7 HTML is accessible at `/v7` (for users who want the full 2,474-question bank)
- [ ] `ibx-transliteration.js` is deployed at root (for v7 at `/v7` to load it)
- [ ] HTTPS is active (required for service worker — Vercel gives this automatically)
- [ ] Opened on Android Chrome → "Add to Home Screen" prompt appears
- [ ] Opened on iOS Safari → Share → Add to Home Screen works
- [ ] Installed, turn off Wi-Fi → library loads, questions show (offline confirmed)

---

## 18. Decision Log — Why Each Choice Was Made

| Decision | Alternatives considered | Why this choice |
|----------|------------------------|-----------------|
| Ship the PWA as primary | Keep v7 HTML as primary | v7 can never be installable/offline — service workers don't work from a plain HTML file without HTTPS and a SW registration |
| Keep v7 at `/v7` as legacy | Replace v7 entirely | v7 has 2,474 questions vs PWA's 1,950. The extra 524 are value. Users may also prefer the single-file simplicity for localhost use |
| Direct API keys (Groq/Gemini/OpenRouter) | Puter popup as default | Puter popup is blocked by many mobile browsers. Direct keys have no UI friction after first setup |
| vite-plugin-pwa + Workbox | Manual service worker | The PWA already uses this. Workbox is the industry standard and handles edge cases (range requests for audio, precache size limits) |
| IndexedDB (Dexie) for all data | localStorage only | localStorage is capped at 5 MB. 1,950 questions + translations + mock sessions easily exceed this |
| React 19 + TypeScript | Vanilla JS like v7 | TypeScript caught all 15 bugs listed in INTERVIEW_GUIDE.md before they reached production. v7's bugs were found only in the browser |
| `vercel.json` catch-all → index.html | Vercel's default SPA routing | React Router needs the catch-all. Without it, `/library` returns 404 on hard refresh |
| Puter as optional (not default) | Puter as default provider | Puter is good but requires a sign-in popup. Making it optional with Groq/Gemini as recommended avoids blocking users on first launch |
| No localhost features on Vercel | Add proxy endpoints | Adding serverless proxies for Whisper/Ollama/PAKGOV is weeks of work and changes the architecture. The localhost features are clearly marked and the fallbacks work |

---

## Summary: What to do in order

**Now (deploy today):**
1. `cd pwa && npm run extract && npm run icons && npm run build`
2. Write `vercel.json` (§5.1)
3. Push to GitHub, connect to Vercel
4. Verify on Android Chrome and iOS Safari

**This week (Phase 1 — feature parity with v7):**
5. Port MistakeClassifier + STAR Evaluator to `features.ts`
6. Add reference answers to Library cards
7. Add session MD export to Mock screen
8. Add company style profiles to Progress settings

**Next week (Phase 2 — mobile polish):**
9. Swipe gestures on cards
10. Bottom sheet for AI tools
11. Share button on cards
12. First-run AI setup flow

**When time permits (language + audio):**
13. Merge 30K Roman Urdu dictionary
14. Port urduhack normalization
15. Add 50 PAKGOV questions to bank
16. (Optional) Laravel backend for server-mode TTS, sync, and keys
