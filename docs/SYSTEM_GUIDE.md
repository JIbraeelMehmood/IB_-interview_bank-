# Interview Box — Complete System Guide
**Version 2.0 | November 2026**

> This document covers everything: what the system is, every integration, how they
> connect, how to run it locally, how to deploy it, what keys you need, what to
> install, and how the PWA works.

---

## Table of Contents

1. [What Is Interview Box?](#1-what-is-interview-box)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Authentication System](#4-authentication-system)
5. [AI Providers Integration](#5-ai-providers-integration)
6. [Free AI Gateway Integration](#6-free-ai-gateway-integration)
7. [Audio / TTS Integration](#7-audio--tts-integration)
8. [Database Architecture](#8-database-architecture)
9. [PWA — How It Works](#9-pwa--how-it-works)
10. [All Features Explained](#10-all-features-explained)
11. [Running Locally — Step by Step](#11-running-locally--step-by-step)
12. [Deploying to Vercel](#12-deploying-to-vercel)
13. [Environment Variables & Keys](#13-environment-variables--keys)
14. [All Dependencies Reference](#14-all-dependencies-reference)
15. [Integrations Summary Table](#15-integrations-summary-table)
16. [What Works Where](#16-what-works-where)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. What Is Interview Box?

Interview Box is an **offline-first Progressive Web App (PWA)** for interview preparation.
It contains 2,140+ Q&A questions across four languages (English, Urdu, Roman Urdu, Hindi),
an AI mock interviewer, a speaking coach, job-description analysis, SQL practice, spaced
repetition, and community voting.

It works **without internet** after the first load. It installs on Android and iOS like a
native app. When online, it syncs progress to MongoDB and uses AI providers for explanations,
mock interviews, and translations.

```
What it does:
  📚  2,140+ interview questions in 4 languages
  🤖  AI mock interviews (graded by AI)
  🎙️  Speaking coach with WPM, filler detection, STAR analysis
  📋  Job description analysis and prep plan
  🔢  SQL Lab (40+ exercises, runs fully offline)
  🔁  Spaced repetition (FSRS algorithm)
  🌐  Community voting: "Was this asked in your interview?"
  📥  Offline-first: works on train, airplane, no signal
  📱  Installable on Android and iOS (Add to Home Screen)
```

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                                        │
│                                                                             │
│   Browser / Android PWA / iOS PWA                                           │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  React 19 SPA  (src/)                                                │  │
│   │                                                                      │  │
│   │  Features: Library · Mock · Speak · JD Prep · Lab · AI Studio       │  │
│   │  State:    Zustand (settings) + TanStack Query (server state)        │  │
│   │  Local DB: Dexie / IndexedDB (questions, progress, cache)            │  │
│   │  Offline:  Workbox Service Worker (precaches everything)             │  │
│   │                                                                      │  │
│   │  src/lib/ai.ts ──────────────────► cloud AI providers (direct)      │  │
│   │  src/lib/ttsClient.ts ───────────► TTS server (port 5052, local)    │  │
│   │  src/lib/freeGateway.ts ─────────► free AI gateway (port 8000)      │  │
│   │  src/lib/account.ts ─────────────► /api/* (Vercel serverless)       │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ HTTPS
                ┌────────────▼────────────┐
                │    VERCEL (cloud)       │
                │                         │
                │  /api/auth/login        │
                │  /api/auth/signup       │
                │  /api/auth/google       │  ◄── Google OAuth
                │  /api/auth/google-callback
                │  /api/auth/me           │
                │  /api/auth/logout       │
                │  /api/v1/sync           │  ◄── offline sync
                │  /api/v1/vote           │  ◄── community votes
                │  /api/v1/stats          │  ◄── community stats
                │  /api/v1/ai-keys        │  ◄── AI key storage
                │  /api/health            │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │  MongoDB Atlas          │
                │  (cloud database)       │
                │                         │
                │  users                  │
                │  sessions               │
                │  user_records (sync)    │
                │  community_votes        │
                │  user_ai_keys           │
                └─────────────────────────┘

LOCAL ONLY (runs on your machine, not on Vercel):
┌─────────────────────────────────────────────────────────────┐
│  server/tts_server.py     port 5052  — TTS (all engines)    │
│  freellmpool serve        port 8000  — Free AI gateway      │
│  free-ai-gateway          port 3000  — Enterprise AI router │
│  whisper_server.py        port 5051  — Speech-to-Text       │
│  LocalVoice XTTS backend  port 8001  — Voice cloning        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.7 | Type safety |
| Vite | 6 | Build tool + dev server |
| React Router | 7 | Client-side routing (12 screens) |
| Zustand | 5 | Settings state management |
| TanStack Query | 5 | Server state / caching |
| Dexie | 4 | IndexedDB ORM (offline database) |
| vite-plugin-pwa | 0.21 | Service worker + PWA manifest |
| Workbox | (via vite-plugin-pwa) | Offline caching strategy |
| sql.js | 1.13 | SQLite in browser (asm.js, no WASM) |
| ts-fsrs | 5 | Spaced repetition algorithm |

### Backend (Vercel Serverless Functions)
| Technology | Version | Role |
|---|---|---|
| Node.js | 18+ | Runtime (Vercel) |
| TypeScript | 5.7 | All API handlers |
| MongoDB Driver | 6 | Database client |
| Node crypto | built-in | scrypt password hashing, session tokens |

### Local Services (optional, localhost only)
| Service | Language | Role |
|---|---|---|
| tts_server.py | Python 3.10+ / Flask | TTS for all engines |
| whisper_server.py | Python / Flask | Speech-to-text |
| freellmpool | Python | Free AI gateway (178 routes) |
| free-ai-gateway | TypeScript / Fastify | Enterprise AI router |

---

## 4. Authentication System

### How it works

Interview Box uses a **custom session-cookie auth system** stored in MongoDB.
No third-party auth service (no Firebase, no Supabase, no Auth0).

#### Sign-in methods

```
Method 1: Email + Password (original)
  User enters email/password
  → POST /api/auth/login
  → scrypt hash comparison (timing-safe)
  → MongoDB session created (30-day TTL)
  → HttpOnly cookie set (ibx_session)
  → User lands in app

Method 2: Google Sign-In (new)
  User clicks "Continue with Google"
  → GET /api/auth/google
  → Redirects to Google OAuth (CSRF state cookie set)
  → Google sends user back to /api/auth/google-callback
  → Code exchanged for Google profile (sub, email, name, picture)
  → User upserted in MongoDB (new account OR linked to existing email account)
  → MongoDB session created
  → ibx_session cookie set
  → Redirected to app root
  → React app calls /api/auth/me → user is in

Method 3: Sign up (creates new account)
  POST /api/auth/signup
  → validates email format, password ≥ 8 chars, name ≥ 2 chars
  → creates user in MongoDB with scrypt-hashed password
  → creates session
  → sets cookie
```

#### Session storage

```
MongoDB: sessions collection
  {
    _id:        SHA-256(token),   // hash stored, plaintext never saved
    userId:     "abc123",
    expiresAt:  Date(+30 days),   // TTL index auto-deletes expired sessions
    createdAt:  timestamp
  }

Browser: HttpOnly cookie "ibx_session"
  - HttpOnly: JS cannot read it (XSS protection)
  - Secure: only sent over HTTPS (in production)
  - SameSite=Lax: CSRF protection
  - Max-Age: 30 days
```

#### Offline fallback

```
If /api/auth/me fails with a network error (offline):
  → Read localStorage['ibx-user-cache']
  → If valid cached user → enter app in offline mode
  → Progress stored in IndexedDB, syncs when back online
```

#### MongoDB user document

```json
{
  "_id": "random-16-byte-hex",
  "email": "user@example.com",
  "name": "Ahmed Khan",
  "passwordHash": "scrypt-64-byte-hex",
  "salt": "random-16-byte-hex",
  "googleId": "google-sub-id",        ← present if signed in via Google
  "picture": "https://lh3.google...", ← Google profile photo URL
  "createdAt": 1730800000000
}
```

---

## 5. AI Providers Integration

### The two modes

```
Mode 1: CLIENT (default when no server set)
  Browser calls AI provider directly
  API key lives in localStorage['ibx-keys']
  Works with no backend, no server
  Key never leaves your device

Mode 2: SERVER (when serverUrl is set in settings)
  Browser calls your Laravel server
  Laravel holds the keys server-side
  More secure — key never in browser
```

### Supported providers (all configured in src/lib/ai.ts)

| Provider | Free tier | Key required | Best for |
|---|---|---|---|
| **OpenRouter** | ✅ Free models (Llama, Mistral, Qwen, Gemini) | From openrouter.ai/keys | General use, free models |
| **Google Gemini** | ✅ Free tier, no card | From aistudio.google.com/apikey | Urdu/Hindi translation |
| **Groq** | ✅ Free tier (30 RPM) | From console.groq.com/keys | Fast mock interviews |
| **Puter** | ✅ Free allowance | Email signup at puter.com | Zero-config free AI |
| **Mistral AI** | ✅ Free tier | From console.mistral.ai | Code + multilingual |
| **xAI (Grok)** | ✅ Free trial credits | From console.x.ai | Fast responses |
| **Fireworks AI** | ✅ Free trial | From fireworks.ai/api-keys | Llama fallback |
| **OpenAI** | ❌ Paid | From platform.openai.com | Best quality (paid) |
| **Anthropic** | ❌ Paid | From console.anthropic.com | Claude (paid) |
| **Ollama / local** | ✅ Free | None needed | 100% offline |
| **Claude in-app** | ✅ With Claude app | None (uses claude.ai session) | Inside Claude app only |

### How AI key storage works (NEW — syncs across devices)

```
When user adds a key in /ai-providers:
  1. Key saved to localStorage['ibx-keys'] immediately (works offline)
  2. User clicks "Save to my account"
  3. POST /api/v1/ai-keys with all keys
  4. Keys stored in MongoDB collection user_ai_keys:
       { _id: userId, keys: {...}, models: {...}, prov: "groq", mt: "auto" }

When user signs in on a new device:
  1. /ai-providers page loads
  2. GET /api/v1/ai-keys fetches from MongoDB
  3. Merged with any local keys
  4. Saved to localStorage
  → Keys available immediately on new device
```

### AI failover chain (automatic)

```
User asks a question
  → primary provider (e.g. Groq) fails
    → try local free gateway (freellmpool port 8000, if running)
      → try Gemini (if key set)
        → try OpenRouter (if key set)
          → try Puter (if signed in)
            → throw error with clear message
```

### OpenRouter "Continue with Google" (AI keys only)

This is a **separate** Google sign-in from the app login.
It gets you an OpenRouter API key via PKCE OAuth — stored in `ibx-keys`, not your account session.
It lets you use free models (Llama, Mistral, Qwen) without copying an API key.

```
User taps "Connect with Google (free models)" on /ai-providers
  → beginGoogleSignIn() (src/lib/auth.ts)
  → PKCE verifier stored in localStorage
  → Redirects to openrouter.ai/auth
  → OpenRouter redirects back with ?code=
  → finishSignIn() exchanges code for OpenRouter API key
  → Key saved to ibx-keys.openrouter
  → Free AI models now available
```

---

## 6. Free AI Gateway Integration

These run **locally on your machine** and give the app access to many free AI providers at once.

### Option A: freellmpool (recommended, easiest)

```bash
pip install freellmpool
freellmpool serve
# Starts at http://localhost:8000/v1
# 178 routes, 23 providers, auto-failover
# Works with ZERO API keys (uses keyless providers: Pollinations, OVHcloud, LLM7)
```

```
How it connects to Interview Box:
  App starts → initGateway() in freeGateway.ts
    → probes http://localhost:8000/v1/models
      → detected! saves to localStorage['ibx-free-gateway']
  
  When primary AI provider fails:
    callProvider() in providers.ts
      → imports freeGateway.ts
        → gatewayUrl() returns "http://localhost:8000/v1"
          → tries the gateway with model:"auto"
            → freellmpool picks the best working free provider
```

### Option B: free-ai-gateway (enterprise, more features)

```bash
cd docs/audio-integrations/OAUTH/free-ai-gateway  # or wherever you cloned it
npm install
cp .env.example .env
echo "GROQ_API_KEY=gsk_yourkey" >> .env
npm run dev
# Starts at http://localhost:3000
# 20 providers, circuit breaker, MCP server
```

### What the gateway adds

Without gateway: if your Groq key hits rate limit → AI fails → user sees error
With gateway: Groq rate limited → auto-tries Gemini → auto-tries Llama → seamless

---

## 7. Audio / TTS Integration

### How audio flows in the app

```
1. User opens a question card
2. Presses "🔊 Read aloud"
3. src/lib/ttsClient.ts: speak(text, { voice: 'ur-PK-UzmaNeural' })
4. Is TTS server running on localhost:5052?
     YES → POST /tts to tts_server.py
     NO  → window.speechSynthesis.speak() (browser built-in)
5. Audio plays
```

### TTS Server — server/tts_server.py

One Python Flask server that manages 8 different TTS engines.
The app sends one request, the server picks the best available engine automatically.

#### Engine priority chain

```
POST /tts  { text: "...", voice: "ur-PK-UzmaNeural" }
     │
     ├── 1. edge-tts (Awaaz / Microsoft Neural)
     │        🌐 Needs internet
     │        ✅ Best Urdu/Hindi quality  
     │        Install: pip install edge-tts
     │        Voices: ur-PK-UzmaNeural, ur-PK-AsadNeural,
     │                hi-IN-SwaraNeural, en-US-JennyNeural, etc.
     │
     ├── 2. gTTS (Google Translate TTS)
     │        🌐 Needs internet
     │        ✅ 60+ languages, no key needed
     │        Install: pip install gTTS
     │        Uses: Google Translate's free (undocumented) TTS API
     │
     ├── 3. Kokoro-82M
     │        📴 Offline, CPU only
     │        ✅ Ultra-fast English, near real-time on any CPU
     │        Install: pip install kokoro soundfile
     │        English only (en-us)
     │
     ├── 4. MOSS-TTS-Nano
     │        📴 Offline, CPU (4 cores)
     │        ✅ 100M multilingual model, best free offline multilingual
     │        Install: from MOSS-TTS GitHub repo
     │        Languages: multilingual
     │
     ├── 5. Piper (ONNX)
     │        📴 Offline, CPU
     │        ✅ 30+ languages including Urdu (ur_PK-usman-medium) and Hindi
     │        Install: pip install piper-tts
     │        Downloads voice models on first use (~50-150 MB each)
     │
     ├── 6. F5-TTS (zero-shot voice cloning)
     │        📴 Offline, needs GPU (4+ GB VRAM)
     │        ✅ Clone any voice from a 10-15 second recording
     │        Install: pip install f5-tts
     │        Use case: consistent AI interviewer voice
     │
     ├── 7. XTTS v2 (via LocalVoice proxy)
     │        📴 Offline, GPU recommended
     │        ✅ Zero-shot cloning, 13 languages
     │        Start: cd docs/audio-integrations/local-voice-chrome-extension/backend
     │               pip install -r requirements.txt
     │               uvicorn server:app --port 8001
     │
     └── 8. Bark (Suno)
              📴 Offline, GPU recommended
              ✅ Expressive: [laughs] [sighs] [clears throat], music, emotions
              Install: pip install git+https://github.com/suno-ai/bark.git
              Use case: pre-generating expressive question audio
```

#### Starting the TTS server

```bash
# Minimal (online TTS only, best quality):
pip install flask flask-cors edge-tts gTTS
python server/tts_server.py

# Add offline English:
pip install kokoro soundfile

# Add offline Urdu/Hindi:
pip install piper-tts

# Add voice cloning (GPU needed):
pip install f5-tts
pip install git+https://github.com/suno-ai/bark.git

# Runs on http://localhost:5052
```

#### TTS API endpoints

```
POST   /tts             — generate speech (main endpoint)
GET    /health          — server status + which engines are available
GET    /voices          — list all supported voices per engine
GET    /engines         — detailed list of engines + install instructions
GET    /tts/languages   — Urdu/Hindi/English voice map
POST   /tts/pregenerate — batch-generate audio for question codes
```

#### TTS on Vercel/mobile (no local server)

The browser's `speechSynthesis` API is used automatically.
Quality depends on the device's installed voices.
On Android with Google TTS installed: good quality, includes Urdu and Hindi.
On iOS: decent English, limited Urdu/Hindi.

### Speech-to-Text (Whisper)

The Speaking Coach uses your microphone. Two paths:

```
Path 1: Browser Web Speech API (default)
  navigator.mediaDevices.getUserMedia → Web Speech API
  Works on Chrome, Edge, Android Chrome
  Does NOT work on iOS Safari (Apple blocks it)

Path 2: Whisper (localhost, high accuracy)
  Browser records audio → POST to whisper_server.py (port 5051)
  Whisper transcribes with much higher accuracy
  Handles Urdu/Hindi/English mixed speech
  Requires: pip install whisper flask flask-cors
            python whisper_server.py
```

---

## 8. Database Architecture

### Two databases run in parallel

```
┌────────────────────────────────────────┐  ┌─────────────────────────────────┐
│  IndexedDB (browser) — Dexie           │  │  MongoDB Atlas (cloud)           │
│  "interview-box" database              │  │  "interview_box" database        │
│                                        │  │                                  │
│  questions    — the full question bank │  │  users         — accounts        │
│  translations — cached AI translations │  │  sessions      — login sessions  │
│  ratings      — Weak/Okay/Solid        │  │  user_records  — sync target     │
│  reviews      — FSRS scheduling        │  │  community_votes — crowd data    │
│  answers      — user's written answers │  │  user_ai_keys  — AI keys        │
│  audio        — cached audio assets    │  │                                  │
│  explains     — cached AI explanations │  │  TTL indexes auto-delete:        │
│  mocks        — mock interview history │  │  - sessions after 30 days        │
│  jds          — job description plans  │  │                                  │
│  stories      — STAR stories           │  └─────────────────────────────────┘
│  imports      — imported questions     │
│  outbox       — pending sync queue     │
│  settings     — user preferences       │
│  kv           — key/value misc store   │
│  communityVotes — local vote cache     │
│  questionStats  — community stats cache│
└────────────────────────────────────────┘
```

### How sync works (offline-first)

```
User rates a question (Weak/Okay/Solid):
  1. Saved to IndexedDB immediately (instant, works offline)
  2. Row added to IndexedDB outbox table: { type: 'rating', payload: {...} }
  3. When online: sync.ts reads outbox, POSTs to /api/v1/sync
  4. MongoDB updates user_records collection
  5. Outbox row deleted

User signs in on second device:
  1. /api/v1/sync called immediately on login
  2. All user_records downloaded from MongoDB
  3. Written to IndexedDB
  4. App picks up progress seamlessly
```

---

## 9. PWA — How It Works

### What makes it a PWA

```
1. Service Worker (sw.js, generated by Workbox)
   - Intercepts all network requests
   - Serves cached content when offline
   - Runs in the background even when browser is closed
   - Handles "Add to Home Screen" install prompt

2. Web App Manifest (manifest.webmanifest)
   - App name, icons, theme color
   - display: "standalone" → no browser chrome on mobile
   - start_url: "/"
   - orientation: "portrait"
   - Makes Chrome show "Install App" prompt on Android

3. HTTPS required
   - Service workers only register on HTTPS (or localhost)
   - Vercel provides HTTPS automatically
```

### Caching strategy

```
Workbox strategies:
  App shell (JS, CSS, HTML, icons) → CacheFirst
    Precached on install, served from cache even offline
    Size: ~3.3 MB (138 modules)

  Question bank JSON (/data/*) → CacheFirst
    Downloaded once, always available offline
    Size: ~1.4 MB (2,140 questions in 4 languages)

  Audio files (/audio/*) → CacheFirst with range request support
    Cached on first listen, no re-download
    Supports MediaSource for audio seeking

  API calls (/api/v1/*) → NetworkFirst
    Always tries network first
    Falls back to cached response if offline
    Community stats, sync — use stale data when offline
```

### Install experience

```
Android (Chrome):
  Open https://yourapp.vercel.app
  Chrome shows "Add to Home Screen" banner (or three-dot → Install app)
  App installed, opens full-screen (no browser chrome)
  Works offline from that point

iOS (Safari):
  Open https://yourapp.vercel.app in Safari
  Tap Share button → "Add to Home Screen"
  App installed, opens full-screen
  Note: iOS 16.4+ supports service workers properly

Desktop (Chrome/Edge):
  Address bar shows install icon (⊕)
  Click to install as desktop app
  Opens in its own window
```

### PWA lifecycle

```
First visit:
  → Service worker registers
  → App shell downloaded and precached (3.3 MB)
  → Question bank downloaded and precached (1.4 MB)
  → Sign-in screen shown
  → User signs in
  → App initialises (seeds IndexedDB from JSON files)
  Total first-load time: ~3-8 seconds on 3G

Subsequent visits (offline):
  → Service worker serves everything from cache instantly
  → <100ms to first meaningful paint
  → Full app available with no network
```

---

## 10. All Features Explained

| Feature | Screen | Works Offline? | Needs AI? | How it works |
|---|---|---|---|---|
| Question Bank | Library | ✅ | ❌ | 2,140+ Q&A stored in IndexedDB, seeded from JSON on first load |
| Filters | Library | ✅ | ❌ | Dexie indexes on tech tags, level, part, expYears |
| Listen Mode | Library | ✅* | ❌ | speechSynthesis API; cached audio if TTS server was used |
| Spaced Repetition | Library | ✅ | ❌ | ts-fsrs FSRS algorithm; due counts from IndexedDB reviews table |
| AI Explanation | Library | ❌ | ✅ | `explain()` in features.ts → AI call → cached in IndexedDB |
| Community Vote | Library | ✅ (queued) | ❌ | Saved locally, syncs to MongoDB when online |
| Mock Interview | Mock | ✅ (flash mode) | ✅ (AI mode) | Flash=self-rate; AI=gradeAnswer() via AI, scorecard generated |
| STAR Evaluator | Mock/Speak | ✅ | ❌ | Pure TypeScript in features.ts, no AI needed |
| MistakeClassifier | Mock/Speak | ✅ | ❌ | Pattern matching in features.ts |
| Prosody Analysis | Speak | ✅ | ❌ | WPM + filler detection in features.ts |
| Speaking Coach | Speak | ✅* | ✅ | Mic → Web Speech / Whisper → analysis → AI feedback |
| JD Analysis | JdPrep | ✅ (offline) | ✅ (AI pack) | analyseJdOffline() needs no AI; jdPrepPack() uses AI |
| SQL Lab | Lab | ✅ | ❌ | sql.js (SQLite asm.js) — runs entirely in browser |
| Translation | Library | ❌ (new) | ✅ | AI translation; cached in IndexedDB (3,000 entry cap) |
| Progress / Stats | Progress | ✅ | ❌ | Computed from IndexedDB ratings/reviews |
| Community Insights | Progress | ✅ (cached) | ❌ | Loaded from MongoDB via /api/v1/stats; cached locally |
| AI Studio | AiStudio | ❌ | ✅ | Agent turns, CV match, STAR stories — all via AI |
| Downloads | Downloads | ✅ | ❌ | Export from IndexedDB as JSON/Markdown |
| Learn | Learn | ✅ | ❌ | Pre-built content from question bank |
| Topics | Topics | ✅ | ❌ | Tech groupings from question metadata |
| Help | Help | ✅ | ❌ | Static content |

*offline with device-installed voices

---

## 11. Running Locally — Step by Step

### Prerequisites

```bash
node --version   # needs v18+
npm --version    # needs v8+
python3 --version # optional, for TTS/Whisper servers
```

### Step 1: Clone and install

```bash
git clone <your-repo-url>
cd IB_-interview_bank-
npm install
```

### Step 2: Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for the backend API to work:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# Optional, uses "interview_box" by default:
MONGODB_DATABASE=interview_box

# Required ONLY if you want Google Sign-In:
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
APP_URL=http://localhost:5173
```

### Step 3: Start the frontend

```bash
npm run dev
# Open http://localhost:5173
```

### Step 4: (Optional) Start the TTS server

```bash
# Minimum install (online TTS):
pip install flask flask-cors edge-tts gTTS

# Run it:
python server/tts_server.py
# Runs at http://localhost:5052
```

### Step 5: (Optional) Start the free AI gateway

```bash
pip install freellmpool
freellmpool serve
# Runs at http://localhost:8000
# App auto-detects it — no config needed
```

### Step 6: (Optional) Start Whisper STT

```bash
pip install openai-whisper flask flask-cors
python server/whisper_server.py  # if you have this file
# Or use the existing one from the repo
# Runs at http://localhost:5051
```

### Step 7: Build for production

```bash
npm run build
npm run preview   # test the production build locally
```

### Step 8: Run tests

```bash
npm test              # 37 unit tests
node e2e/smoke.mjs    # 39 browser end-to-end checks
node e2e/offline.mjs  # proves offline mode works
node e2e/mobile.mjs   # tests mobile viewports
```

---

## 12. Deploying to Vercel

### One-click deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Vercel auto-detects the config from `vercel.json`
4. Add environment variables in Vercel dashboard (Settings → Environment Variables)
5. Deploy

### vercel.json explained

```json
{
  "buildCommand": "npm install --prefer-offline && npm run build",
  "outputDirectory": "dist",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },     ← API routes to serverless functions
    { "src": "/sw.js", ... },                       ← Service worker with correct headers
    { "src": "/(assets|data|icons|audio)/(.*)" },   ← Static assets
    { "src": "/(.*)", "dest": "/index.html" }       ← SPA catch-all (React Router)
  ]
}
```

### Environment variables needed on Vercel

```
MONGODB_URI           = mongodb+srv://...   (required)
MONGODB_DATABASE      = interview_box       (optional)
GOOGLE_CLIENT_ID      = 123...              (required for Google Sign-In)
GOOGLE_CLIENT_SECRET  = GOCSPX-...         (required for Google Sign-In)
APP_URL               = https://yourapp.vercel.app  (required for Google Sign-In)
```

### What does NOT work on Vercel (by design)

```
❌ TTS server (Python Flask — can't run on Vercel)
   → Falls back to browser speechSynthesis automatically

❌ Free AI gateway (freellmpool / free-ai-gateway)
   → Falls back to cloud AI providers directly

❌ Whisper STT (Python Flask)
   → Falls back to browser Web Speech API

❌ LocalVoice XTTS (FastAPI)
   → Falls back to browser speechSynthesis

All these are localhost-only features.
The app handles their absence gracefully — no errors, no crashes.
```

---

## 13. Environment Variables & Keys

### Required (app won't work without these)

| Variable | Where to get it | What it does |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers | Database connection string |

### Required for Google Sign-In

| Variable | Where to get it | What it does |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials → Create OAuth 2.0 Client ID | Identifies your app to Google |
| `GOOGLE_CLIENT_SECRET` | Same as above | Verifies the OAuth exchange |
| `APP_URL` | Your deployed URL | Builds the redirect_uri for Google OAuth |

#### Google Cloud Console setup steps

```
1. Go to https://console.cloud.google.com
2. Create a project (or use existing)
3. APIs & Services → Enable "Google+ API" and "Google OAuth2 API"
4. Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Name: "Interview Box"
7. Authorised redirect URIs:
     https://yourapp.vercel.app/api/auth/google-callback
     http://localhost:5173/api/auth/google-callback
8. Copy Client ID and Client Secret into .env
```

### AI Provider Keys (all optional, all free tiers available)

| Provider | Get key from | Free tier |
|---|---|---|
| Groq | console.groq.com/keys | 30 RPM, Llama 3.3 70B free |
| Google Gemini | aistudio.google.com/apikey | 1,500 requests/day free |
| OpenRouter | openrouter.ai/keys | Many free models |
| Mistral | console.mistral.ai/api-keys | Free tier available |
| xAI / Grok | console.x.ai | Free trial credits |
| Fireworks | fireworks.ai/api-keys | Free trial |

Keys are stored in the browser (`localStorage['ibx-keys']`) and optionally synced to your MongoDB account via `/api/v1/ai-keys`.

### Keys that are NOT needed

```
✅ No key needed for:
   - freellmpool  (keyless providers included: Pollinations, OVHcloud, LLM7)
   - gTTS         (uses Google Translate's public endpoint)
   - edge-tts     (uses Microsoft Edge's public endpoint)
   - Piper        (local ONNX model, no internet)
   - Kokoro-82M   (local model, no internet)
   - Bark         (local model, no internet)
   - Puter AI     (free account signup at puter.com)
   - Browser speechSynthesis (built into browser)
```

---

## 14. All Dependencies Reference

### npm packages (frontend + Vercel functions)

```json
Production:
  react, react-dom (v19)         — UI framework
  react-router-dom (v7)          — client-side routing
  @tanstack/react-query (v5)     — server state management
  dexie, dexie-react-hooks (v4)  — IndexedDB ORM
  zustand (v5)                   — settings state
  ts-fsrs (v5)                   — spaced repetition algorithm
  sql.js (v1.13)                 — SQLite in browser (asm.js)
  mongodb (v6)                   — MongoDB driver (Vercel functions only)
  @neondatabase/serverless       — (dependency, not actively used)

Development:
  vite (v6)                      — build tool
  @vitejs/plugin-react           — React fast refresh
  vite-plugin-pwa                — service worker + PWA manifest
  typescript (v5.7)              — type checking
  vitest (v2)                    — unit test runner
  @testing-library/react         — React component testing
  playwright (v1.63)             — browser end-to-end tests
  fake-indexeddb                 — Dexie tests without a real browser
  jsdom                          — DOM simulation for tests
```

### Python packages (local servers — install what you need)

```bash
# Core server infrastructure:
pip install flask flask-cors

# TTS engines — install any combination:
pip install edge-tts          # Microsoft Neural voices (best Urdu/Hindi)
pip install gTTS              # Google Translate TTS (60+ languages)
pip install kokoro soundfile  # Kokoro-82M (fast offline English)
pip install piper-tts         # Offline 30+ languages (Urdu/Hindi included)
pip install f5-tts            # Zero-shot voice cloning (GPU)
pip install git+https://github.com/suno-ai/bark.git  # Expressive TTS (GPU)

# STT:
pip install openai-whisper    # Speech-to-text (more accurate than browser)

# Free AI gateway:
pip install freellmpool       # 178 AI routes, keyless start
```

### GPU requirements (only for advanced TTS)

```
F5-TTS, XTTS v2, Bark:
  NVIDIA GPU with 4+ GB VRAM
  CUDA 12.1+
  NVIDIA driver 555+

Without GPU:
  F5-TTS works but is very slow (~5-15 minutes per sentence)
  Bark works with use_small=True but still slow on CPU
  Kokoro and Piper work great on CPU — use these for CPU-only setups
```

---

## 15. Integrations Summary Table

| Integration | Type | Where it runs | Needs install | Needs key | What breaks without it |
|---|---|---|---|---|---|
| **MongoDB Atlas** | Cloud DB | Vercel (cloud) | No | Connection string | Auth, sync, community votes |
| **Google OAuth** | Auth | Vercel (cloud) | No | Google client ID/secret | Google Sign-In (email login still works) |
| **Groq** | AI | Cloud direct | No (just key) | ✅ Free | AI features (other providers still work) |
| **Gemini** | AI | Cloud direct | No | ✅ Free | Urdu/Hindi translation quality |
| **OpenRouter** | AI | Cloud direct | No | ✅ Free | AI (others still work) |
| **Puter** | AI | Cloud (SDK) | No (auto-loads) | No | Nothing (it's a fallback) |
| **freellmpool** | AI gateway | localhost:8000 | pip install | No | Nothing (just loses redundancy) |
| **free-ai-gateway** | AI gateway | localhost:3000 | npm install | Free keys help | Nothing (just loses redundancy) |
| **edge-tts (Awaaz)** | TTS | localhost:5052 | pip install | No | Urdu/Hindi TTS (browser fallback) |
| **gTTS** | TTS | localhost:5052 | pip install | No | 2nd TTS option (others still work) |
| **Kokoro-82M** | TTS | localhost:5052 | pip install | No | Fast offline English TTS |
| **Piper** | TTS | localhost:5052 | pip install | No | Offline Urdu/Hindi TTS |
| **F5-TTS** | TTS + cloning | localhost:5052 | pip install | No | Voice cloning (other TTS still works) |
| **Bark** | TTS | localhost:5052 | pip install | No | Expressive TTS (others still work) |
| **XTTS (LocalVoice)** | TTS | localhost:8001 | pip install | No | Nothing (7th fallback) |
| **Whisper** | STT | localhost:5051 | pip install | No | Uses browser Web Speech API instead |
| **Browser speechSynthesis** | TTS | Browser built-in | Nothing | No | Last TTS fallback — always available |
| **IndexedDB / Dexie** | Local DB | Browser built-in | Nothing | No | Nothing works offline |
| **Workbox SW** | Offline cache | Browser built-in | Nothing | No | No offline mode |

---

## 16. What Works Where

| Feature | localhost (dev) | Vercel (deployed) | Mobile (PWA) | Offline |
|---|---|---|---|---|
| Question bank | ✅ | ✅ | ✅ | ✅ |
| All filters | ✅ | ✅ | ✅ | ✅ |
| Spaced repetition | ✅ | ✅ | ✅ | ✅ |
| SQL Lab | ✅ | ✅ | ✅ | ✅ |
| Progress tracking | ✅ | ✅ | ✅ | ✅ |
| Offline sync queue | ✅ | ✅ | ✅ | ✅ |
| Google Sign-In | ✅ | ✅ | ✅ | ❌ |
| Email/password login | ✅ | ✅ | ✅ | ❌ |
| AI mock interview | ✅ | ✅ | ✅ | ❌ |
| AI explanation | ✅ | ✅ | ✅ | ❌ |
| AI translation | ✅ | ✅ | ✅ | ❌ |
| Flashcard mock (no AI) | ✅ | ✅ | ✅ | ✅ |
| Urdu/Hindi TTS (edge-tts) | ✅ | ❌* | ❌* | ❌ |
| English TTS (browser) | ✅ | ✅ | ✅ | ✅** |
| Speaking coach (browser STT) | ✅ | ✅ | ✅(Android) | ❌ |
| Speaking coach (Whisper) | ✅ | ❌ | ❌ | ❌ |
| Whisper STT | ✅ | ❌ | ❌ | ❌ |
| Free AI gateway | ✅ | ❌ | ❌ | ❌ |
| Community votes | ✅ | ✅ | ✅ | ✅(queued) |
| Cloud sync | ✅ | ✅ | ✅ | ❌(queued) |
| Install as app | ✅ | ✅ | ✅ | — |

\* Browser speechSynthesis used instead (quality depends on device)
\*\* Using OS-installed voices, works without internet

---

## 17. Troubleshooting

### "AI is not connected" in the header

```
Cause: No AI provider is set up
Fix options:
  a) Go to /ai-providers → paste a free Groq or Gemini key → Save
  b) Sign in with OpenRouter (free models via Google account)
  c) Start freellmpool: pip install freellmpool && freellmpool serve
  d) Enable Puter (free, no key): Settings → AI Connect → Free AI (email)
```

### Google Sign-In says "state_mismatch"

```
Cause: CSRF state cookie expired or sign-in started in a different tab
Fix: Close extra tabs, try sign-in again from a fresh tab
```

### Google Sign-In "not configured on server"

```
Cause: GOOGLE_CLIENT_ID not set in environment
Fix: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env (local)
     or Vercel dashboard (deployed)
```

### TTS not working (no audio on question cards)

```
The app will use browser speechSynthesis automatically if the TTS server
isn't running. To get Urdu/Hindi neural voices:
  1. pip install flask flask-cors edge-tts gTTS
  2. python server/tts_server.py
  3. Refresh the app — it auto-detects the server
```

### App doesn't work offline

```
Cause: Service worker may not have installed correctly
Fix:
  1. Make sure you're on HTTPS (or localhost)
  2. Open Chrome DevTools → Application → Service Workers
  3. Check that "sw.js" is registered and "Activated and is running"
  4. Clear site data and reload if needed
```

### Sync not working (progress not appearing on second device)

```
Cause: MONGODB_URI not set, or wrong database name
Fix:
  1. Check MONGODB_URI is set in Vercel environment variables
  2. Check MongoDB Atlas IP whitelist includes 0.0.0.0/0 (allow all)
  3. Check network tab for /api/v1/sync errors
```

### Build fails with TypeScript errors

```bash
npm run typecheck    # see all type errors
npm run build        # uses --noCheck (skips TS, faster)
```

### piper-tts voice not found

```bash
# Download the voice first:
python -c "
from piper import PiperVoice
PiperVoice.load('ur_PK-usman-medium', download=True)
PiperVoice.load('hi_IN-dhruva-medium', download=True)
PiperVoice.load('en_US-lessac-medium', download=True)
"
```

---

## Quick Reference

### Start everything for local development

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: TTS server (optional)
pip install flask flask-cors edge-tts gTTS && python server/tts_server.py

# Terminal 3: Free AI gateway (optional)
pip install freellmpool && freellmpool serve

# Open: http://localhost:5173
```

### Minimum to deploy

```
1. MongoDB Atlas account + connection string
2. Vercel account (free)
3. Deploy from GitHub
4. Add MONGODB_URI to Vercel environment variables
Done — app works for email/password login and all offline features
```

### To enable Google Sign-In

```
1. Google Cloud Console → create OAuth 2.0 Client ID
2. Add redirect URIs (localhost + vercel URL)
3. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL to Vercel
Done
```

### To enable free AI (no key needed)

```
Option A (fastest):
  pip install freellmpool && freellmpool serve   ← localhost only

Option B (mobile/Vercel):
  Go to /ai-providers in the app
  Click "Connect with Google (free models)" → OpenRouter PKCE OAuth
  Free Llama, Mistral, Qwen models available

Option C (also free):
  Get a Groq key (free, no card): console.groq.com/keys
  Add it in /ai-providers
```
Everything that works on Vercel for all users
  
  ✅ FULLY WORKS — No setup beyond MongoDB URI
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🔐 Authentication
  
  ┌──────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
  │ What                     │ How                                                                                       │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Email + Password Sign Up │ POST /api/auth/signup → scrypt hash → MongoDB users collection                            │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Email + Password Login   │ POST /api/auth/login → verify hash → 30-day session cookie                                │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Google Sign-In           │ GET /api/auth/google → OAuth redirect → /api/auth/google-callback → upsert user → session │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Stay logged in           │ GET /api/auth/me → reads ibx_session cookie → returns user                                │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Logout                   │ POST /api/auth/logout → deletes session from MongoDB                                      │
  ├──────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Offline re-entry         │ Cached user in localStorage → enters app without hitting server                           │
  └──────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘
  
  Google Sign-In requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + APP_URL in Vercel env vars.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  📚 Question Bank (2,140+ questions)
  
  ┌─────────────────────────────────────────┬──────────────────────────────────────────────────────────┐
  │ What                                    │ How                                                      │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Browse all questions                    │ Seeded from /data/bank.json into IndexedDB on first load │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Filter by tech, level, part, experience │ Dexie indexes — all local, instant                       │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Search                                  │ Full-text search on pre-built search field in IndexedDB  │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Sort (including Community Most Asked)   │ Local sort on IndexedDB data                             │
  ├─────────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ 4 languages                             │ English, Urdu, Roman Urdu, Hindi — all in the JSON bank  │
  └─────────────────────────────────────────┴──────────────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🤖 AI Features (works with any configured provider key)
  
  All AI calls go directly from the browser to the AI provider — no proxy through Vercel needed.
  
  ┌────────────────────────────────────────┬─────────────────┬─────────────────────────────────────────┐
  │ What                                   │ Provider needed │ Free option                             │
  ├────────────────────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ Explain a question                     │ Any provider    │ Groq (free) or OpenRouter (free models) │
  ├────────────────────────────────────────┼─────────────────┼─────────────────────────────────────────┤
  │ AI Mock Interview (graded)             │ Any provider    │ Groq, OpenRouter                        │
  ├────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ JD Analysis + Prep Pack                │ Any provider        │ Gemini free tier                        │
  ├────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ AI Translation (Urdu/Hindi/Roman Urdu) │ Any provider        │ Gemini (best for Urdu/Hindi)            │
  ├────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ Speaking Coach AI feedback             │ Any provider        │ Groq                                    │
  ├────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ AI Studio (stories, CV match, agent)   │ Any provider        │ Any free provider                       │
  ├────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────┤
  │ AI auto-failover                       │ Multiple configured │ Groq → Gemini → OpenRouter → Puter      │
  └────────────────────────────────────────┴─────────────────────┴─────────────────────────────────────────┘
  
  The /ai-providers page lets users link their own API keys. Keys sync to MongoDB via /api/v1/ai-keys so they roam across devices.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🔁 Spaced Repetition & Progress
  
  ┌──────────────────────────────────────┬────────────────────────────────────────┐
  │ What                                 │ How                                    │
  ├──────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Rate questions (Weak / Okay / Solid) │ Saved to IndexedDB immediately                           │
  ├──────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Due today count                      │ FSRS algorithm runs locally in browser                   │
  ├──────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Study streak                         │ Computed from IndexedDB ratings                          │
  ├──────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Progress dashboard                   │ All local computation                                    │
  ├──────────────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Cross-device sync                    │ Ratings → outbox → /api/v1/sync → MongoDB → other device │
  └──────────────────────────────────────┴──────────────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🗳️ Community Voting
  
  ┌───────────────────────────────────────────┬────────────────────────────────────────────────┐
  │ What                                      │ How                                            │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ "Was this asked in your interview?"       │ POST /api/v1/vote → MongoDB community_votes    │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ See how many people were asked a question │ GET /api/v1/stats → aggregated from MongoDB    │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ Sort by most asked                        │ Community stats merged with library sort       │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ Offline votes                             │ Queued in IndexedDB outbox → syncs when online │
  ├───────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ Community insights panel                  │ Top questions by experience band, charts       │
  └───────────────────────────────────────────┴────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  ☁️ Cloud Sync (all devices stay in sync)
  
  Synced data via POST /api/v1/sync:
  
  ┌───────────┬──────────────────────────────────────┐
  │ Data type │ What it contains                     │
  ├──────────────┼──────────────────────────────────────┤
  │ ratings      │ Weak/Okay/Solid ratings per question │
  ├──────────────┼──────────────────────────────────────┤
  │ reviews      │ FSRS spaced repetition schedule      │
  ├───────────────┼───────────────────────────────────────┤
  │ answers       │ User's written practice answers       │
  ├───────────────┼───────────────────────────────────────┤
  │ stories       │ STAR method stories                   │
  ├───────────────┼───────────────────────────────────────┤
  │ questions     │ User-added custom questions           │
  ├───────────────┼───────────────────────────────────────┤
  │ translations  │ Cached AI translations                │
  ├───────────────┼───────────────────────────────────────┤
  │ settings      │ Language, theme, AI settings, profile │
  ├───────────────┼───────────────────────────────────────┤
  │ communityVote │ "Was this asked" votes                │
  └───────────────┴───────────────────────────────────────┘
  
  All of this flows offline first → outbox queue → syncs automatically when online.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🗣️ Listen / Audio (Browser speechSynthesis)
  
  ┌──────────────────────┬───────────────────────────────────────────────────────────────────────────┐
  │ What                 │ How                                                                       │
  ├────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Read questions aloud       │ window.speechSynthesis — built into every browser                         │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ English voice                  │ Available on all devices                                                  │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Urdu voice                     │ Available if device has Urdu voices installed (Android + Google TTS: yes) │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Hindi voice                    │ Available if device has Hindi voices installed                            │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Speed control                  │ speechSynthesis rate property                                             │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Auto-play / loop / sleep timer │ Player bar — pure JavaScript                                              │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ Lock screen controls           │ Media Session API                                                         │
  └────────────────────────────────┴───────────────────────────────────────────────────────────────────────────┘
  
  High-quality neural voices (edge-tts, gTTS) only work when tts_server.py is running locally — NOT on Vercel.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🎙️ Speaking Coach (partial)
  
  ┌───────────────────────┬────────────────────────────┬──────────────────────────────────────────────────────┐
  │ What                  │ Works on Vercel?           │ How                                                  │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Record your answer    │ ✅ Chrome / Android Chrome │ navigator.mediaDevices.getUserMedia + Web Speech API │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ WPM measurement       │ ✅                         │ Pure JS calculation                                  │
  ├───────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Filler word detection │ ✅                         │ Pure JS regex (um, uh, like, basically, na, means…)  │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ STAR evaluation             │ ✅                         │ Pure TS in features.ts                               │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ MistakeClassifier           │ ✅                         │ Pure TS in features.ts                               │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Vocabulary diversity        │ ✅                         │ Pure TS in features.ts                               │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ AI feedback on answer       │ ✅ (needs AI key)          │ Direct browser → AI provider call                    │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Whisper (high accuracy STT) │ ❌                         │ Localhost only                                       │
  ├─────────────────────────────┼────────────────────────────┼──────────────────────────────────────────────────────┤
  │ iOS Safari recording        │ ❌                         │ Apple blocks Web Speech API on iOS                   │
  └─────────────────────────────┴────────────────────────────┴──────────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🧮 SQL Lab
  
  ┌─────────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │ What                            │ How                                                           │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 40+ SQL exercises               │ sql.js (SQLite compiled to asm.js) — runs 100% in the browser │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ Run SQL queries                 │ Executes locally, zero network                                │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ All exercises available offline │ Bundled in the app                                            │
  └─────────────────────────────────┴───────────────────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  📋 Job Description (JD) Prep
  
  ┌────────────────────────┬───────────────────┬───────────────────────────────────────────────┐
  │ What                   │ Works on Vercel?  │ How                                           │
  ├────────────────────────┼───────────────────┼───────────────────────────────────────────────┤
  │ Offline tech detection │ ✅                │ analyseJdOffline() — pure JS keyword matching │
  ├────────────────────────┼───────────────────┼───────────────────────────────────────────────┤
  │ AI deep prep pack      │ ✅ (needs AI key) │ Direct to AI provider                         │
  ├────────────────────────┼───────────────────┼───────────────────────────────────────────────┤
  │ Save JD plans          │ ✅                │ IndexedDB + sync                              │
  └────────────────────────┴───────────────────┴───────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  📱 PWA Features
  
  ┌────────────────────┬────────────────────────────────────────────────────────┐
  │ What               │ How                                                    │
  ├──────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Install on Android           │ Chrome "Add to Home Screen" / install prompt                    │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Install on iOS             │ Safari Share → Add to Home Screen                               │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Install on Desktop         │ Chrome/Edge install button                                      │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Full offline mode          │ Workbox service worker — precaches entire app (3.3 MB)          │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Works with no signal       │ Questions, filters, SQL Lab, flashcards, progress — all offline │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Lock screen audio controls │ Media Session API                                               │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Wake lock during listen    │ Screen stays on during audio playback                           │
  ├────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Background sync            │ Outbox flushes when app returns to foreground                   │
  └────────────────────────────┴─────────────────────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  🤖 AI Key Management (NEW — cross-device)
  
  ┌─────────────────────────┬────────────────────────────────────────────────┐
  │ What                    │ How                                            │
  ├─────────────────────────┼────────────────────────────────────────────────┤
  │ Save AI keys to account │ POST /api/v1/ai-keys → MongoDB                 │
  ├─────────────────────────┼────────────────────────────────────────────────┤
  │ Load keys on new device │ GET /api/v1/ai-keys on /ai-providers page load │
  ├─────────────────────────┼────────────────────────────────────────────────┤
  │ Keys work on any device │ Merged from MongoDB + localStorage             │
  └─────────────────────────┴────────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  ❌ Does NOT work on Vercel (localhost only)
  
  ┌─────────────────────────────────────────────────────┬────────────────────────────────────┬────────────────────────────────────────────┐
  │ Feature                                             │ Why                                │ Alternative on Vercel                      │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ High-quality Urdu/Hindi TTS (edge-tts, gTTS, Piper) │ Python server, can't run on Vercel │ Browser speechSynthesis with device voices │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ Kokoro, MOSS-Nano, Bark, F5-TTS                     │ Python + large models              │ Not available (offline use only)           │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ Voice cloning                                       │ GPU model, Python                  │ Not available                              │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ Whisper STT                                         │ Python Flask server                │ Browser Web Speech API (Chrome/Android)    │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ freellmpool / free-ai-gateway                       │ Python/Node.js local server        │ Use direct API keys (Groq free tier)       │
  ├─────────────────────────────────────────────────────┼────────────────────────────────────┼────────────────────────────────────────────┤
  │ iOS Safari microphone                               │ Apple blocks Web Speech API        │ User must use Android/Chrome               │
  └─────────────────────────────────────────────────────┴────────────────────────────────────┴────────────────────────────────────────────┘
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  The one-line summary
  
  Everything in the table below works for every user, on every device, from Vercel, with just a MongoDB URI and optionally Google OAuth keys:
  
  ✅ Sign in (email or Google)
  ✅ 2,140+ questions in 4 languages  
  ✅ All filters and search
  ✅ AI (mock, explain, translate, JD) — when user adds a free API key
  ✅ Spaced repetition (FSRS)
  ✅ Progress sync across devices
  ✅ Community voting ("was this asked?")
  ✅ SQL Lab (40+ exercises, fully offline)
  ✅ Speaking Coach analysis (WPM, fillers, STAR) — no AI needed
  ✅ AI Speaking feedback — when user has AI key
  ✅ Listen mode (browser voices)
  ✅ Install as app (Android/iOS/Desktop)
  ✅ Full offline mode after first visit
  ✅ AI keys saved to account, roam across devices
 




 Now I have a complete, verified picture. Let me present the cleanup plan before acting, because these are irreversible deletions.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  Here is exactly what I will remove and why
  
  ✅ SAFE TO DELETE — Not part of the running app
  
  ┌──────────┬────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Path     │ Size   │ Reason                                                                                                              │
  ├─────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ _audit/     │ 5.1 MB │ Development-time analysis scripts and logs from building v7 → PWA migration. Not imported by any source file.    │
  │             │        │ Never deployed.                                                                                                  │
  ├────────────────────────────────┼────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ whisper/                       │ 23 MB  │ Full clone of OpenAI Whisper Python repo sitting in project root. The actual whisper          │
  │                                │        │ integration is just server/tts_server.py — this entire repo clone is unused.                  │
  ├────────────────────────────────────┼────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ dist/                              │ 3.9 MB │ Build output. Regenerated by npm run build. Should not be committed.                      │
  ├────────────────────────────────────┼────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ .vite/                                │ 16 KB  │ Vite dep cache. Regenerated automatically.                                             │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/OAUTH/                           │ 33 MB  │ Full cloned repos of 7 AI gateway projects (freellmpool, free-ai-gateway, etc.). The   │
  │                                       │        │ actual integration code was already ported into src/lib/freeGateway.ts. The clones are │
  │                                       │        │ just reference material.                                                               │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/piper/        │ 251 MB │ Full Piper TTS repo clone with prebuilt binaries. The integration is in                │
  │                                       │        │ server/tts_server.py — this huge clone is unnecessary.                                 │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/voice-pro/    │ 129 MB │ Full voice-pro repo clone (Demucs, CosyVoice, RVC). Not used in production.            │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/StreamSpeech/ │ 58 MB  │ Full StreamSpeech repo clone. Not referenced anywhere in the codebase.                 │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/MOSS-TTS/     │ 27 MB  │ Full MOSS-TTS model family repo. Integration is in tts_server.py only.                 │
  ├───────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  ├─────────────────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────┤
  │ TS/                            │        │                                                                                              │
  ├────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/bark/  │ 12 MB  │ Full Bark/Suno repo clone. Integration is in tts_server.py only.                             │
  ├────────────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/VoxCPM │ 11 MB  │ Full VoxCPM repo clone. Not integrated into tts_server.py (GPU-only, marked low priority).   │
  │ /                              │        │                                                                                              │
  │ docs/audio-integrations/VoxCPM/           │ 11 MB  │ Full VoxCPM repo clone. Not integrated into tts_server.py (GPU-only, marked low    │
  │                                           │        │ priority).                                                                         │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/whisper/          │ 23 MB  │ Second Whisper repo clone inside docs. Duplicate of the root whisper/.             │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/F5-TTS/           │ 5.1 MB │ F5-TTS repo clone. Integration is in tts_server.py. Clone not needed.              │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/audio-integrations/NeuralVoice-Studi │ 1.8 MB │ Confirmed Telegram spammer — not a TTS tool. Delete.                               │
  │ o-AI-Text-to-Speech-with-85-Dialects-Offl │        │                                                                                    │
  │ ine-Lightweight/                          │        │                                                                                    │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/dictionari │ 131 MB │ Full browser extension dictionary repo. Not imported anywhere in the codebase.     │
  │ ez/                                       │        │                                                                                    │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/PAKGOV-RAG │ 43 MB  │ Python RAG project. Localhost-only, not integrated into PWA.                       │
  │ -project/                                 │        │                                                                                    │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/Intervity/ │ 21 MB  │ Interview coaching platform source code. Logic was already ported to               │
  │                                           │        │ src/lib/features.ts.                                                               │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/interview- │ 12 MB  │ Another interview skills repo. Not imported anywhere.                              │
  │ skills/                                   │        │                                                                                    │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/urduhack/  │ 2.1 MB │ Python Urdu NLP library. Logic ported to src/lib/urduNorm.ts. Clone not needed.    │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/urduify/   │ 2.5 MB │ Another Urdu tool. Not imported.                                                   │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/interview-assistant-CLI/             │ 628 KB │ Full interview CLI tool repo clone. Not part of the PWA.                           │
  ├───────────────────────────────────────────┼────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ docs/OAUTH/awesome-free-ai-coding/        │ 16 MB  │ Reference directory. Not code, not imported.                                       │
  └───────────────────────────────────────────┴────────┴────────────────────────────────────────────────────────────────────────────────────┘
  
  ✅ KEEP — Actually used by the project
  
  ┌──────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
  │ Path                                                                         │ Why keep                                 │
  ├──────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/roman-urdu-translator/                        │ Dictionary data may be used by scripts/    │
  ├──────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/Transliteration-RomantoUrdu-And-ViceVersa/    │ Small (368 KB), possibly used by scripts   │
  ├──────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/Urdu-English-Word-Frequency-Analyzer/         │ Small (380 KB), possibly used by scripts      │
  ├──────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
  │ docs/translkation-INTEGRATIONS/UTRNet-High-Resolution-Urdu-Text-Recognition/ │ Small (1.2 MB), reference                     │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ docs/audio-integrations/awaaz/                                               │ 428 KB, reference for edge-tts integration       │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ docs/audio-integrations/gTTS/                                                │ 1.2 MB, reference                                │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ docs/audio-integrations/local-voice-chrome-extension/                        │ 2.6 MB, Kokoro/XTTS backend code we reference    │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ docs/audio-integrations/vocal-craft-studio/                                  │ 1.5 MB, small reference                          │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ docs/*.md                                                                    │ All analysis/guide docs — your own documentation │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ src/, api/, server/, public/, scripts/, tests/, e2e/                         │ All are the actual app                           │
  ├──────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ node_modules/                                                                │ Required by npm — never delete manually          │
  └──────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘
  
  Total savings: ~790 MB











  What was done
  
  1. Voice picker added to Library page
  
  src/features/Library.tsx — new VoiceBar component appears between the question count bar and the question list. It shows:
  - Language chips (English / Urdu / Roman Urdu / Hindi) — tap to switch
  - A voice dropdown that shows all available voices for that language (auto-detected from browser)
  - A "Urdu script" checkbox when Roman Urdu is active (enables transliteration)
  - A "⚙ More" link to the full audio settings in Progress for speed, pitch, etc.
  
  No need to go to Progress → Settings tile to pick a voice anymore.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  2. Roman Urdu default changed to Urdu script mode
  
  src/lib/settings.ts — ruToUrdu default changed from false → true.
  
  Was: Roman Urdu was read by an English voice (sounded terrible by default) Now: Roman Urdu is always transliterated to Urdu script first, then
  spoken by an Urdu/Hindi voice — which is how it should sound.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  3. Translation quality improved — modern Pakistani Urdu
  
  Two files updated:
  
  public/data/prompts.json — the trStyle system prompt that all AI translations use now:
  - Explicitly lists preferred modern colloquial Urdu words (masla, waqt, zaroori, istemal, seedha, achha…)
  - Explicitly bans heavy Sanskrit/Hindi words (samasya, samay, aavashyak, prayog, laabh…)
  - Requires short active-voice sentences, not textbook style
  - Requires a Pakistani everyday analogy for hard concepts (dukaan, bank line, courier app, cricket)
  
  src/lib/translate.ts — the per-question AI prompt now includes the full preferred/banned vocabulary list, adds more English dev words to keep
  in English (route, controller, migration, test, commit, hook, pipeline), requires active voice, and adds a 4-point self-check before the model
  finalises its output.
  
  Cached translations — existing translations are already cached in IndexedDB. They will be re-translated the next time you tap "Translate now"
  on a card, or you can clear the translation cache from Progress → Backup → Reset to get fresh translations for all questions.
  
  Read SYSTEM_GUIDE.md earlier — used it to confirm the voice/audio architecture, that urSpeech()/speechify() handles Urdu TTS preprocessing, and
  that prompts.json is the right place to improve translation quality rather than hardcoded strings. Guided the decision to add VoiceBar to
  Library rather than a separate page.
 
▸ Credits: turn 9.49 •











  What was fixed (10 issues)
  
  Critical — Roman Urdu TTS architecture
  
  src/lib/speech.ts — romanUrduToScript() The most important fix. Tech terms like API, Laravel, GitHub were being transliterated
  character-by-character into broken Urdu script. Now: any token containing an uppercase letter is passed through unchanged. Only all-lowercase
  tokens (actual Roman Urdu words) are transliterated.
  
  Voice blacklist never resets
  
  src/lib/speech.ts — loadVoices() The broken voice blacklist was module-level state that never cleared. One transient failure could permanently
  disable a voice for the entire page session. Fixed: broken resets every time voiceschanged fires.
  
  Dead translation pre-loading code
  
  src/lib/player.ts — load() The ternary opts.questions?.find(...) ? undefined : undefined always evaluated to undefined — a useless expression.
  Removed. tr is now consistently fetched lazily by buildSegments() at playback time, which is the correct pattern.
  
  MyMemory mislabelled as Google
  
  src/lib/translate.ts — machineOne() entry.mt = 'Google' was wrong — the API is MyMemory. Fixed to 'MyMemory'.
  
  ruNorm not applied during cache upgrades
  
  src/lib/translate.ts — getTranslation() Old cached Roman Urdu text was getting the modern() lexicon pass but not ruNorm() during stale-rules
  upgrades. Fixed: ruNorm() now applied in the upgrade path.
  
  Input length — named constant
  
  src/lib/translate.ts The magic 6000 slice was renamed to MAX_INPUT_CHARS = 6000 and applied consistently.
  
  System prompt — Urdu/Hindi separation
  
  public/data/prompts.json Added an explicit Pakistani Urdu section to trStyle with a word-for-word Hindi blacklist (samasya→masla,
  prayog→istemal, etc.) and a note about the Urdu vs Hindi distinction. Hindi output now gets an explicit note to sound like a developer in
  Mumbai/Delhi, not like Urdu in Devanagari.
  
  Roman Urdu spelling normalization gaps
  
  public/data/lexicons.json — ruNorm table Added 30+ missing common variants: acha→achha, thek→theek, agr→agar, toh→to, zarurat→zaroorat,
  jldi→jaldi, and many WhatsApp shorthand forms.
  
  Dead code documentation
  
  api/v1/sync.ts The communityVote branch inside the sync loop is unreachable (the ALLOWED guard skips it). Added a clear comment marking it as
  dead code and explaining that /api/v1/vote is the correct path.
  
  Missing env var documentation
  
  .env.example Added VITE_WHISPER_URL and TTS server port documentation — both were referenced in code but undocumented.
  
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  Test results: 46 tests pass (21 new + 25 existing). The only failing suite (bank.test.ts) was already broken before any changes — it's a
  pre-existing fake-indexeddb version mismatch with Dexie v4, unrelated to this work. TypeScript compiles clean.
  
  New files created:
  - docs/ARCHITECTURE_AUDIT.md — Phase 0 deliverable with full system map
  - tests/speech.test.ts — 21 tests covering all the speech fixes
 