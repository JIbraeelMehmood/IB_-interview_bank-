
  › /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/audio-integrations/details.md
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/OAUTH/details.md
    /home/lenovo/Downloads/modern
    --ai---interviweer/interview-box-laptop/interview-box/translkation-INTEGRATIONS/MASTER_INTEGRATION.md
    /home/lenovo/Downloads/modern
    --ai---interviweer/interview-box-laptop/interview-box/translkation-INTEGRATIONS/INTEGRATION_ANALYSIS.md
    /home/lenovo/Downloads/modern
    --ai---interviweer/interview-box-laptop/interview-box/translkation-INTEGRATIONS/INTEGRATION_GUIDE.md
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/INTERVIEW_BOX_ANALYSIS.md
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/OAUTH_ANALYSIS.md
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/README_WHISPER.md
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/README.txt
    /home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/SYSTEM_ENHANCEMENT_ANALYSIS.md
    
    read and analysis all these docs  deeply 
    i want to attach integration to my system to incress its features and functioality and incread exitsiting  functioality 
    integration work to gather to support each other 
    make new suitanle and related functioality according to the system 
     first read docs the analysis current system and 
    make a plan md file where current system stand and how after integration system enhance 
    currently i upload this system vercel but system not working right as expected
 

# Interview Box — Master Plan
## Current System State · Vercel Diagnosis · Integration Roadmap · Post-Integration Enhancements

**Prepared:** 2026-10-26
**System:** `interview-box.html` (3.55 MB · 2474 questions · localhost:8765)
**Whisper:** `whisper_server.py` (port 5051 · offline STT)
**Transliteration:** `ibx-transliteration.js` (636 KB · 13K Roman↔Urdu dictionary)
**Integration projects:** 23 open-source projects across 3 domains (audio/5, AI gateway/7, translation/11)

---

## Table of Contents

1. [Current System State](#1-current-system-state)
2. [Vercel Deployment Diagnosis](#2-vercel-deployment-diagnosis)
3. [Integration Architecture](#3-integration-architecture)
4. [Phase 0 — Vercel Fix (Make Deployment Work)](#4-phase-0--vercel-fix)
5. [Phase 1 — Foundation: AI Gateway (Fix Core Dependency)](#5-phase-1--ai-gateway)
6. [Phase 2 — Intelligence Layer (Intervity + interview-skills + dictionariez)](#6-phase-2--intelligence-layer)
7. [Phase 3 — Language Layer (Deep Urdu NLP)](#7-phase-3--language-layer)
8. [Phase 4 — Audio Layer (TTS + Voice Pipeline)](#8-phase-4--audio-layer)
9. [Phase 5 — Knowledge Base (PAKGOV RAG)](#9-phase-5--knowledge-base)
10. [Phase 6 — Optional Services (OCR, Scout Intel, Neural Translation)](#10-phase-6--optional-services)
11. [New Features Created by Integration Synergy](#11-new-features-from-integration-synergy)
12. [Post-Integration Architecture](#12-post-integration-architecture)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Current System State

### 1.1 What Interview Box Is

Interview Box is a **single-HTML-file interview preparation platform** — 3.55 MB containing all CSS, JavaScript, SVG icons, and 2474 interview questions embedded in a `<script id="bank">` JSON block. No build step, no bundler, no npm at runtime. It is served by a localhost HTTP server (Python `http.server` on Linux/Mac, PowerShell `System.Net.HttpListener` on Windows) on port 8765.

### 1.2 Current Feature Inventory

| Feature | Implementation | Status |
|---------|---------------|--------|
| Question bank | 2474 questions in `<script id="bank">` JSON | ✅ |
| AI abstraction | `SAMPLE()` wrapper — Puter, OpenRouter, Groq, Gemini, Mistral, Ollama, xAI, Fireworks | ✅ |
| State persistence | `localStorage` key `ibx` + IndexedDB translation cache | ✅ |
| TTS (text-to-speech) | `speechSynthesis` via `speakSeg()`, `pickVoice()`, `startPlayer()` | ✅ |
| STT (speech-to-text) | Browser `SpeechRecognition` (Chrome) + Whisper Flask server (port 5051) | ✅ |
| Language support | English, Urdu RTL (Nastaliq), Hindi, Roman Urdu, Punjabi | ✅ |
| Mock interviewer | Timer, scorecard, cross-questions, AI feedback | ✅ |
| Speaking coach | Voice practice, `spAnalyse()`, WPM, fillers | ✅ |
| Translation | `trGet()`/`trSave()` with fallback chain ru→ur→hi | ✅ |
| Transliteration | `ibx-transliteration.js` — 13K Roman↔Urdu dict (lazy-loaded) | ✅ |
| JD prep | JD parser, tech stack extraction, question prediction | ✅ |
| SQL Lab | Interactive SQLite practice (WASM inlined) | ✅ |
| Spaced repetition | `srsDue()` scheduling | ✅ |
| Export/backup | JSON backup/restore | ✅ |
| Anki export | `ankiAdd()` → `fetch('http://localhost:6006')` | ✅ (graceful failure) |
| Phase 1 enhancements | MistakeClassifier, STAR Evaluator, Prosody, Pakistani persona, auto-restart STT, reference answers, session MD export, company profiles, AI lookup cache | ✅ (patched in) |

### 1.3 Current Architecture

```
┌──────────────────────────────────────────────────────────┐
│              INTERVIEW BOX (localhost:8765)               │
│                                                            │
│  interview-box.html (3.55 MB)                             │
│  ├── 2474 questions in <script id="bank">                 │
│  ├── All CSS/JS inlined (no external files at runtime)     │
│  ├── SQL Lab (SQLite WASM inlined)                        │
│  ├── Phase 1 enhancements (patched in)                    │
│  └── AI abstraction SAMPLE()                              │
│                                                            │
│  ibx-transliteration.js (636 KB)                          │
│  └── Loaded lazily via s.src='/ibx-transliteration.js'   │
└──────────┬──────────────┬──────────────┬───────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Whisper  │   │ Puter AI │   │ Anki     │
    │ port 5051│   │ (cloud)  │   │ port 6006│
    │ Python   │   │ js.puter │   │ AnkiConn │
    │ Flask    │   │ .com/v2/ │   │          │
    └──────────┘   └──────────┘   └──────────┘
```

### 1.4 Hardcoded Localhost Dependencies (Critical for Vercel)

| Dependency | Code Location | URL | Breaks on Vercel? | Graceful Fallback? |
|-----------|---------------|-----|-------------------|-------------------|
| Whisper STT | `WS.url='http://127.0.0.1:5051'` (line ~767) | `http://127.0.0.1:5051` | ✅ Yes — no Python server | ✅ Yes — UI shows "unreachable", browser STT still works |
| Anki export | `fetch('http://localhost:6006')` (line ~4993) | `http://localhost:6006` | ✅ Yes — no Anki desktop | ✅ Yes — toast: "Anki not running" |
| Ollama (optional) | User-configured in AI Connect settings | `http://localhost:11434/v1` | ✅ Yes — no local Ollama | ✅ Yes — optional provider, user chooses |
| ibx-transliteration.js | `s.src='/ibx-transliteration.js'` (line ~4449) | Relative path `/ibx-transliteration.js` | ❌ No — works if file deployed alongside HTML | N/A |
| Puter AI | `s.src='https://js.puter.com/v2/'` (line ~3625) | External CDN | ⚠️ Maybe — may face CSP/popup issues | ⚠️ Shows "network_blocked" if blocked |
| Google Fonts | `<link href="https://fonts.googleapis.com/...">` | External CDN | ❌ No — Vercel allows external CDN | ✅ Falls back to system fonts |

### 1.5 AI Architecture — The SAMPLE() Layer

The AI system uses a provider-agnostic `SAMPLE()` function that routes to whichever provider is configured:

```
User action (Explain / Coach / Mock / JD / Translate)
    │
    ▼
SAMPLE(input, callback, opts)
    │
    ├── pick === 'auto' → checks: Claude app? → Puter (if web) → first configured key
    ├── pick === 'puter' → loadPuter() → puter.ai.chat()
    ├── pick === 'openrouter'/'gemini'/'groq'/etc → makeExt(p) → fetch(PROV[p].base, ...)
    └── pick === 'custom' → makeExt('custom') → fetch(user_base_url, ...)
```

**ENV detection** (line ~3952):
```js
var ENV = (window.claude && typeof window.claude.use === 'function') ? 'claude'
        : location.protocol === 'file:' ? 'file'
        : 'web';
```

On Vercel: `location.protocol` is `https:`, so `ENV = 'web'`. This means Puter AI is **enabled** — but it requires loading `https://js.puter.com/v2/` and a sign-in popup.

### 1.6 Current Limitations

| Limitation | Impact |
|-----------|--------|
| AI depends solely on puter.com (single point of failure) | When Puter is down/blocked, ALL AI features die |
| Whisper STT requires localhost Python server | Speech-to-text won't work on Vercel |
| Anki export requires localhost AnkiConnect | Flashcard export won't work on Vercel |
| Transliteration dictionary is 13K words | Misses 30K+ Urdu→Roman entries available in integration data |
| No Urdu character normalization | Arabic-variant Urdu text (WhatsApp, websites) fails silently |
| No reference answers | Users can't compare against model answers |
| No Pakistan-specific knowledge base | Can't answer government/law interview questions |
| No offline AI | If internet drops, all AI features go dark |
| No TTS besides browser speechSynthesis | Limited voice quality, unreliable Urdu TTS |
| No adaptive curriculum | Question selection is random, not mastery-based |

---

## 2. Vercel Deployment Diagnosis

### 2.1 Root Cause

**The app is architected as a localhost-only application.** It was never designed for cloud deployment. The core issue is not that Vercel can't serve the files — it can. The issue is that the app's runtime dependencies assume localhost services that don't exist on Vercel's serverless infrastructure.

### 2.2 What Works on Vercel

| Component | Works? | Why |
|-----------|--------|-----|
| `interview-box.html` loads | ✅ Yes | Static file, Vercel serves it |
| 2474 questions render | ✅ Yes | Embedded JSON, no server needed |
| CSS/design system | ✅ Yes | All inlined |
| SQL Lab | ✅ Yes | SQLite WASM inlined |
| localStorage/IndexedDB | ✅ Yes | Browser-side, no server |
| `ibx-transliteration.js` | ✅ Yes | Relative path, works if deployed alongside |
| Roman↔Urdu transliteration | ✅ Yes | Pure client-side JS |
| Translation cache | ✅ Yes | Client-side |
| Spaced repetition | ✅ Yes | Client-side |
| JSON backup/restore | ✅ Yes | Client-side |
| Google Fonts | ✅ Yes | External CDN, Vercel allows it |
| Puter AI (potentially) | ⚠️ Maybe | ENV='web' enables it, but popup/CSP may block |

### 2.3 What Breaks on Vercel

| Component | Breaks? | Root Cause | Graceful Fallback? |
|-----------|---------|------------|-------------------|
| Whisper STT (port 5051) | ✅ Breaks | `fetch('http://127.0.0.1:5051/transcribe')` — no Python server on Vercel | ✅ Yes — status dot turns red, browser `SpeechRecognition` still works in Chrome |
| Anki export (port 6006) | ✅ Breaks | `fetch('http://localhost:6006')` — no Anki desktop on Vercel | ✅ Yes — toast: "Anki not running" |
| Ollama (port 11434) | ✅ Breaks | `http://localhost:11434/v1` — no local Ollama | ✅ Yes — optional provider, not auto-selected |
| Puter AI sign-in popup | ⚠️ Maybe | Puter loads `https://js.puter.com/v2/` then opens a popup for sign-in. Vercel doesn't set restrictive CSP by default, but browser popup blockers may interfere | ⚠️ Shows "network_blocked" error if blocked |

### 2.4 The Real Problem

The user says "system not working right as expected" on Vercel. The most likely symptoms are:

1. **AI features don't work** — Puter sign-in popup may be blocked, or the script load fails. Since Puter is the default free AI provider (`pick='auto'` falls back to Puter when no keys are configured), this disables ALL AI features (Explain, Coach, Mock, JD analysis, translation).

2. **Whisper STT doesn't work** — The Whisper status dot shows red/"unreachable". Browser `SpeechRecognition` still works but users who rely on Whisper for Urdu/Hindi transcription lose that capability.

3. **No obvious error** — The app loads fine, questions render, UI works. But AI is silently broken (shows "Sign in" or "network_blocked"), and Whisper shows "unreachable". The app appears to work but core features are dead.

### 2.5 Vercel Fix Strategy

There are two paths to fix the Vercel deployment:

**Path A — Make it work as a static site (recommended, fast):**
- Add a `vercel.json` with static hosting config
- Ensure `ibx-transliteration.js` is deployed alongside the HTML
- Add a Vercel-compatible AI provider (API-key-based, no popup needed) — configure Groq (free, no credit card) as default
- Add environment-aware fallback: if `location.hostname` is not localhost, hide Whisper/Anki/Ollama options and show "cloud mode" messaging
- The Phase 1 integration changes (MistakeClassifier, STAR, etc.) are pure JS and work on Vercel already

**Path B — Add serverless API routes (more work, full features):**
- Add Vercel serverless functions for: AI proxy (to avoid CORS/popup issues), translation proxy
- Whisper STT would still not work (requires Python + model download — not feasible serverless)
- This is more complex and changes the "single HTML file" architecture

**Recommended: Path A** — the app should gracefully detect cloud deployment and switch to cloud-appropriate providers.

---

## 3. Integration Architecture

### 3.1 The 23 Projects Across 3 Domains

```
┌──────────────────────────────────────────────────────────────────────┐
│                    INTERVIEW BOX (localhost:8765)                    │
│                                                                      │
│  Library (2474 Qs) │ Speaking Coach │ Mock Interview │ AI Coach      │
│  JD Prep │ SQL Lab │ Spaced Repetition │ Translation │ Settings      │
└─────────┬──────────┴───────┬─────────┴──────┬─────────┴──────┬───────┘
          │                  │                │                │
          ▼                  ▼                ▼                ▼
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────────┐
│  AI GATEWAY     │ │  AUDIO PIPELINE  │ │  LANGUAGE & INTELLIGENCE    │
│  (7 projects)   │ │  (5 projects)    │ │  (11 projects)              │
│                 │ │                  │ │                             │
│ freellmpool     │ │ Awaaz (Urdu TTS) │ │ ibx-transliteration.js      │
│ free-ai-gateway │ │ Piper (offline)  │ │ roman-urdu-translator       │
│ Ollama-models   │ │ VoxCPM (studio)  │ │ urduhack (normalization)    │
│ scout-intel-mcp │ │ Voice-Pro (full) │ │ Intervity (analytics)       │
│ catalogs (2)    │ │ Vocal Craft (WASM)│ │ interview-skills (UX)      │
│ dev-workbench   │ │                  │ │ dictionariez (dictionary)  │
│                 │ │                  │ │ PAKGOV-RAG (law Q&A)        │
│ 178 routes      │ │ STT→TTS→Clone    │ │ UTRNet (OCR)               │
│ 23 providers    │ │ Dub→Demix        │ │ Word-Freq-Analyzer          │
│ +offline Ollama │ │                  │ │                             │
└────────┬────────┘ └────────┬─────────┘ └───────────┬─────────────────┘
         │                   │                       │
         └───────────────────┼───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     ENHANCED USER FLOW        │
              │  1. AI asks question (TTS)   │
              │  2. User answers (STT)        │
              │  3. Transliterate Roman↔Urdu  │
              │  4. Score: STAR + Mistakes    │
              │  5. AI feedback (free LLM)    │
              │  6. Export to MD/Anki         │
              └──────────────────────────────┘
```

### 3.2 How the Domains Compose (No Overlap)

| Concern | Audio Domain | AI Gateway Domain | Translation Domain |
|---------|-------------|-------------------|-------------------|
| Input | Whisper STT (voice→text) | — | UTRNet OCR (image→text) |
| Processing | Voice-Pro demix/cleanup | freellmpool routing | Intervity scoring + urduhack normalization |
| Intelligence | — | Ollama LLM + scout-intel | Intervity strategies + PAKGOV RAG |
| Output | Awaaz/Piper TTS (text→voice) | — | ibx-transliteration.js (Roman↔Urdu) |
| Persistence | — | — | interview-skills MD export + dictionariez Anki |

---

## 4. Phase 0 — Vercel Fix

**Goal:** Make the app work correctly when deployed on Vercel (or any static hosting).
**Effort:** 2–4 hours
**No new servers needed.**

### 4.1 Add vercel.json

```json
{
  "version": 2,
  "builds": [
    { "src": "interview-box.html", "use": "@vercel/static" },
    { "src": "ibx-transliteration.js", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/", "dest": "/interview-box.html" },
    { "src": "/ibx-transliteration.js", "dest": "/ibx-transliteration.js" }
  ]
}
```

### 4.2 Environment-Aware Mode Detection

Add code that detects whether the app is running on localhost (full mode) or cloud (limited mode):

```js
var IS_CLOUD = location.hostname !== 'localhost' 
            && location.hostname !== '127.0.0.1'
            && !location.hostname.startsWith('192.168.')
            && !location.hostname.startsWith('10.');

var CLOUD_MODE = IS_CLOUD; // disables localhost-dependent features
```

### 4.3 Cloud-Mode Behavior

When `CLOUD_MODE` is true:

| Feature | Localhost Mode | Cloud Mode |
|---------|---------------|------------|
| Whisper STT | Full (port 5051) | Hidden — browser `SpeechRecognition` only |
| Anki export | Full (port 6006) | Hidden — show "Available on localhost" tooltip |
| Ollama | User-configured | Hidden — show "Available on localhost" tooltip |
| Puter AI | Available (popup sign-in) | Available but may need popup permission |
| API-key AI (Groq/Gemini/OpenRouter) | Available | **Default — recommended for cloud** |
| All Phase 1 JS features | Full | Full (pure JS, no server needed) |
| Transliteration | Full | Full (client-side) |
| SQL Lab | Full | Full (WASM) |
| Translation cache | Full | Full (client-side) |

### 4.4 Default AI Provider for Cloud

On Vercel, set the default AI provider to Groq (free, no credit card, no popup needed):

```js
if (CLOUD_MODE && !kSt().keys.groq) {
  // Show a one-time setup banner:
  // "Cloud mode: connect a free AI (Groq recommended — free, no credit card)"
  // with a link to https://console.groq.com/keys
}
```

### 4.5 Whisper UI in Cloud Mode

```js
// In whisperStatus() callback:
if (CLOUD_MODE) {
  // Don't show red dot — show grey "Not available (cloud mode)"
  // Don't poll localhost:5051 — skip the fetch entirely
  wd.style.background = '#999';
  wt.textContent = 'Whisper (localhost only)';
  wsState.title = 'Whisper STT requires the local Python server. Use browser speech recognition in cloud mode.';
}
```

---

## 5. Phase 1 — AI Gateway

**Goal:** Eliminate the puter.com single point of failure. Add 178 free AI routes + offline capability.
**Effort:** 1 hour (freellmpool) + 1 hour (Ollama setup) + 2 hours (integration)
**Impact:** 🔴 Critical — fixes the most important reliability issue

### 5.1 freellmpool — The #1 Change

```bash
pip install freellmpool
freellmpool serve
# Now running at http://localhost:8000/v1/chat/completions
# 178 routes from 23 providers, auto-failover, keyless start possible
```

### 5.2 Integration into interview-box.html

Add a new AI provider option in the `PROV` object:

```js
// Add to PROV object:
freellmpool: {
  name: 'Free AI Pool (178 routes, no key needed)',
  cost: 'Free',
  model: 'auto',
  base: 'http://localhost:8000/v1',
  note: 'Run: pip install freellmpool && freellmpool serve. 178 free routes with auto-failover.'
}
```

Wire into `makeExt()` — freellmpool is OpenAI-compatible, so it uses the same `fetch` path as other providers.

### 5.3 Ollama for Offline AI

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
# Download a model (1-time, ~4 GB for 7B)
ollama pull llama3.2:3b
# Start server (runs on port 11434 automatically)
ollama serve
```

The existing `custom` provider in PROV already supports Ollama at `http://localhost:11434/v1`. Just add it as a preset:

```js
ollama: {
  name: 'Ollama (100% offline, local LLM)',
  cost: 'Free on your computer',
  model: 'llama3.2',
  base: 'http://localhost:11434/v1',
  note: 'Install Ollama + pull a model. AI works with zero internet.'
}
```

### 5.4 Auto-Failover Chain

```
AI request from IBX
    │
    ▼
freellmpool (178 cloud routes)
    │
    ├── Route 1: Groq (Llama 3.3 70B) ──✓──→ response
    ├── Route 2: Google AI Studio ──────✓
    ├── Route 3: SambaNova ─────────────✓
    ├── ... 175 more routes ...
    │
    └── ALL CLOUD ROUTES FAIL (no internet)
        │
        ▼
    Ollama (local, offline)
        └──→ response (slower but works)
```

### 5.5 Cloud Mode AI Gateway

For Vercel deployment, the AI gateway must be cloud-based:

| Mode | AI Provider | How |
|------|-----------|-----|
| Localhost | freellmpool (178 routes) + Ollama (offline) | `http://localhost:8000/v1` |
| Cloud (Vercel) | Groq free API key (no popup, no server) | Direct `fetch` to `https://api.groq.com/openai/v1/chat/completions` |
| Cloud (Vercel) | Google AI Studio free key | Direct `fetch` to Gemini API |

The existing `PROV.groq` and `PROV.gemini` already support this — the user just needs to enter a free API key in AI Connect settings.

### 5.6 scout-intel-mcp — Company Research for JD Prep

```bash
cd OAUTH/scout-intel-mcp
pip install scout-intel-mcp
python -m scout_mcp.mcp_server
# 6 intelligence tools: company_intel, market_research, news_intelligence, etc.
```

Integration: when user pastes a JD with a company name, auto-research the company:

```js
function enrichJdWithResearch(company) {
  if (CLOUD_MODE) return; // skip on Vercel (needs localhost MCP server)
  fetch('http://localhost:5053/mcp/company_intel', {
    method: 'POST',
    body: JSON.stringify({ company_name: company })
  }).then(r => r.json()).then(function(intel) {
    // Show: founding year, products, competitors, recent news
    // alongside the JD analysis
  }).catch(function(){}); // graceful fallback
}
```

---

## 6. Phase 2 — Intelligence Layer

**Goal:** Transform answer analysis from basic WPM/fillers into professional-grade scoring. Add reference answers, session export, company profiles.
**Effort:** ~10 hours total (all pure JS, no new servers)
**Impact:** 🟠 High — major new features

### 6.1 Intervity Analytics (Already Patched in Phase 1)

These are already integrated via `patch-phase1-enhancements.js`:

| Feature | Source | Status | What It Does |
|---------|--------|--------|-------------|
| MistakeClassifier | Intervity `MistakeClassifier.ts` | ✅ Patched | 4-tier answer diagnosis: CONCEPTUAL/L4_CEILING/VAGUE/STRUCTURAL |
| STAR Evaluator | Intervity `StarMethodEvaluator.ts` | ✅ Patched | Behavioral answer scoring: Situation/Task/Action/Result |
| Prosody Analyzer | Intervity `SoftSkillsProsodyAnalyzer.ts` | ✅ Patched | WPM, filler ratio, pause detection |
| Pakistani persona | Intervity `SystemPrompts.ts` | ✅ Patched | Pakistani tech context in mock interviewer prompt |
| 11 Coaching Strategies | Intervity `AgentCoachingHarness.ts` | ✅ Patched | Strategy selection by question category |
| Vocab Diversity | Word-Freq-Analyzer port | ✅ Patched | Word frequency + vocabulary richness metric |

### 6.2 interview-skills Features (Already Patched in Phase 1)

| Feature | Source | Status | What It Does |
|---------|--------|--------|-------------|
| Auto-restart SpeechRecognition | `mic-input.js` | ✅ Patched | Fixes 60-second cutoff bug |
| Reference answer + Good vs Bad | `reference-answer.js` | ✅ Patched | Model answers with localStorage cache |
| Session MD export | `export-md.js` | ✅ Patched | Export mock interview as Markdown |
| Company style profiles | `company-profiles.md` | ✅ Patched | PITB/Google/Amazon/Arbisoft/Systems interview styles |
| PDF resume parsing | `pdf.min.js` | ✅ Patched | Upload resume PDF → extract text |
| AI lookup cache | `ai-lookup.js` | ✅ Patched | Queue + dual cache for AI calls |

### 6.3 dictionariez Features (Already Patched in Phase 1)

| Feature | Source | Status | What It Does |
|---------|--------|--------|-------------|
| Anki flashcard export | `ankiwindow.js` | ✅ Patched | Q&A → Anki one-click (port 6006) |
| AI lookup cache factory | `localStorageCache.js` | ✅ Patched | Generic FIFO cache for any AI calls |
| Word hover dictionary | `plain-lookup.js` | ✅ Patched | Double-click word → definition tooltip |

### 6.4 Next Steps for Intelligence Layer

| # | Feature | Source | Effort | Wire Into |
|---|---------|--------|--------|-----------|
| 1 | Agent memory (cross-session) | Intervity `AgentMemoryRepository.ts` | 2h | AI Coach view — localStorage |
| 2 | Adaptive QBL curriculum | Intervity `QBLEngine.ts` | 4h | Library question picker — localStorage |
| 3 | IndexedDB session storage | interview-skills `storage.js` | 4h | Mock sessions (prevents 5MB overflow) |
| 4 | Voice biometrics | Intervity `VoiceBiometricsService.ts` | 8h | Speaker verification (experimental) |

### 6.5 How Intelligence Features Work Together

```
User answers a question
    │
    ▼
spAnalyse() runs ALL analyzers:
    ├── wordFrequency()          → vocabulary diversity score
    ├── prosodyAnalyze()         → WPM, filler ratio, pacing advice
    ├── classifyMistake()        → 4-tier diagnosis (CONCEPTUAL/VAGUE/etc.)
    ├── starEval()               → STAR score (if behavioral question)
    └── IBX_TR.romanToUrdu()     → Urdu script version of answer
    │
    ▼
AI feedback via SAMPLE() with:
    ├── Pakistani interviewer persona (Intervity SystemPrompts)
    ├── Company style profile (interview-skills company-profiles)
    ├── Coaching strategy selected by question type (11 strategies)
    ├── PAKGOV RAG context (if law/governance question)
    └── Agent memory context (previous weak topics)
    │
    ▼
Output:
    ├── Mistake classification (color-coded)
    ├── STAR score breakdown
    ├── WPM + filler analysis
    ├── Vocabulary diversity rating
    ├── Urdu script version of answer
    ├── AI feedback (Pakistani persona, company style)
    ├── 💡 Reference answer button (cached)
    ├── 📄 Export MD button
    ├── 🃏 Anki button (if localhost)
    └── Agent memory records weak topic for next session
```

---

## 7. Phase 3 — Language Layer

**Goal:** 2.4× more transliteration coverage + fix Arabic-variant Urdu failures + neural sentence translation.
**Effort:** ~4 hours (data merge + JS port)
**Impact:** 🟠 High — fixes silent transliteration failures

### 7.1 Merge roman_urdu_map.json (30,888 entries)

Current `ibx-transliteration.js` has 12,956 Urdu→Roman entries. The `roman-urdu-translator` project has `roman_urdu_map.json` with 30,888 entries — 2.4× more coverage.

```js
// In rebuild-translit.js (build script):
const newMap = JSON.parse(fs.readFileSync('roman-urdu-translator/roman_urdu_map.json'));
Object.keys(newMap).forEach(function(k) {
  if (!UR2RU[k]) UR2RU[k] = newMap[k]; // only add new entries
});
// Result: ~32,000+ unique Urdu→Roman entries
// File size: ~800KB (within budget)
```

### 7.2 Port urduhack Character Normalization (71 mappings)

Arabic-variant Urdu characters (from WhatsApp, websites, phones) fail silently in the current dictionary lookup. Port urduhack's `_CORRECT_URDU_CHARACTERS_MAPPING`:

```js
var URDU_CHAR_NORM = {
  // ک (U+06A9) — 6 Arabic variants → canonical Urdu
  '\uFE8E':'\u06A9','\uFE8F':'\u06A9','\uFE90':'\u06A9',
  '\uFE91':'\u06A9','\uFB4B':'\u06A9','\u0643':'\u06A9',
  // ی (U+06CC) — 9 variants
  '\uFBFC':'\u06CC','\u0649':'\u06CC','\uFBFD':'\u06CC',
  // ... all 71 mappings
};

function normalizeUrduChars(text) {
  return text.split('').map(function(c) {
    return URDU_CHAR_NORM[c] || c;
  }).join('');
}

// Add diacritic stripping:
function removeDiacritics(text) {
  return text.normalize('NFC')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u200C|\u200D|\u200B|\uFEFF/g, '');
}

// Upgrade urduToRoman():
function urduToRoman(text) {
  text = normalizeUrduChars(text);  // FIX: Arabic variants → canonical
  text = removeDiacritics(text);    // FIX: strip ً ٍ ٌ ُ ِ َ ّ
  // ... existing word lookup + char fallback
}
```

### 7.3 Neural Sentence Translation (Optional, 84MB ONNX)

The `roman-urdu-translator` project includes a full Transformer model (81M params, ONNX-exported) that runs in the browser via ONNX Runtime Web. BLEU scores: 23.2 (en→Roman Urdu), 30.7 (Roman Urdu→en).

```js
// Lazy-load when user wants full sentence translation:
function loadNeuralTranslator(cb) {
  if (window._ibxTranslator) { cb(window._ibxTranslator); return; }
  Promise.all([
    import('/roman-urdu-translator/web/tokenizer.js'),
    import('/roman-urdu-translator/web/translator.js'),
    import('/roman-urdu-translator/web/urdu.js')
  ]).then(function(mods) {
    mods[1].Translator.load({
      base: '/roman-urdu-translator/model',
      onProgress: function(p) {
        toast('Loading translator: ' + Math.round(p.received/p.total*100) + '%');
      }
    }).then(function(t) {
      window._ibxTranslator = t;
      cb(t);
    });
  });
}
```

### 7.4 Cumulative Language Enhancement

| Metric | Before | After |
|--------|--------|-------|
| Roman→Urdu dictionary | 13,084 entries | 13,084 (unchanged — already comprehensive) |
| Urdu→Roman dictionary | 12,956 entries | 32,000+ entries (2.4× more) |
| Arabic-variant handling | ❌ Fails silently | ✅ 71-char normalization map |
| Diacritic handling | ❌ Breaks lookup | ✅ Stripped before lookup |
| Sentence translation | ❌ Word lookup only | ✅ Neural model (BLEU 30.7) |
| File size | 636 KB | ~800 KB (within budget) |

---

## 8. Phase 4 — Audio Layer

**Goal:** Add Urdu TTS, offline TTS fallback, and optionally voice cloning + full audio pipeline.
**Effort:** 2h (Awaaz) + 4h (Piper) + 2-3 days (VoxCPM) + 1 week (Voice-Pro)
**Impact:** 🟡 Medium — accessibility, audio learning

### 8.1 TTS Quality/Complexity Ladder

```
Tier 1 (2 hours): Awaaz — Urdu TTS via Microsoft Edge API
  ├── Cloud API, free, no key, 2 voices (Asad/Uzma)
  └── Add "🔊 Read in Urdu" button to question cards

Tier 2 (4 hours): Piper — Fast offline TTS, ONNX models
  ├── 30+ languages including Urdu/Hindi, CPU-only
  └── Offline fallback when no internet

Tier 3 (1 day): Vocal Craft Studio — Browser WASM TTS
  ├── Hindi+English, zero-shot cloning, no server
  └── 1.8 GB download once, cached in browser

Tier 4 (2-3 days): VoxCPM — Studio-quality TTS + voice cloning
  ├── 2B-param model, 48kHz, emotion control
  ├── Clone a real interviewer's voice for AI coach
  └── Needs GPU for reasonable speed

Tier 5 (1 week): Voice-Pro — Full audio pipeline
  ├── Whisper STT + translation + TTS + cloning + demix + YouTube dubbing
  ├── Replaces all other audio tools
  └── Most powerful single project
```

### 8.2 Integration: Awaaz Urdu TTS (Fastest Win)

```python
# tts_server.py — minimal Flask service for Urdu TTS
from flask import Flask, request, jsonify, send_file
import edge_tts, asyncio, tempfile, os

app = Flask(__name__)

@app.route('/tts', methods=['POST'])
def tts():
    text = request.json.get('text', '')
    voice = request.json.get('voice', 'ur-PK-AsadNeural')  # or ur-PK-UzmaNeural
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        asyncio.run(edge_tts.Communicate(text, voice).save(f.name))
        return send_file(f.name, mimetype='audio/mpeg')
```

```js
// In interview-box.html — add to question cards:
function speakUrdu(text) {
  if (CLOUD_MODE) {
    // Use browser speechSynthesis as fallback
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ur-PK';
    speechSynthesis.speak(u);
    return;
  }
  var audio = new Audio('http://127.0.0.1:5053/tts');
  // POST text to TTS server, play returned audio
  fetch('http://127.0.0.1:5053/tts', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text: text, voice: 'ur-PK-AsadNeural'})
  }).then(r => r.blob()).then(function(blob) {
    audio.src = URL.createObjectURL(blob);
    audio.play();
  });
}
```

### 8.3 Integration: Piper Offline TTS

```bash
# Install Piper
pip install piper-tts
# Download Urdu voice model
piper --download-voice ur-PK
# Start TTS server (port 5000)
piper --model ur-PK --server
```

```js
// Fallback chain: Awaaz (cloud) → Piper (local) → browser speechSynthesis
function speakUrduText(text) {
  if (!CLOUD_MODE && WS.ready) {
    // Try Piper first (offline, high quality)
    fetch('http://127.0.0.1:5000/tts', { /* ... */ })
      .catch(function() { browserTTS(text); });
  } else {
    browserTTS(text); // speechSynthesis fallback
  }
}
```

### 8.4 Voice Cloning (Long-term, VoxCPM/Voice-Pro)

Clone a real interviewer's voice for the AI coach persona:

```
1. Record 30 seconds of a Pakistani interviewer's voice
2. VoxCPM/Voice-Pro clones the voice from the reference clip
3. AI coach speaks in that cloned voice during mock interviews
4. Creates a more realistic interview experience
```

This is the highest-effort, highest-impact audio feature — it transforms the mock interview from "text on screen" to "realistic voice conversation."

---

## 9. Phase 5 — Knowledge Base

**Goal:** Add Pakistan government/law knowledge to the AI coach. Import 50 verified Q&A to the question bank.
**Effort:** 30 min (Q&A import) + 30 min (RAG setup) + 2h (integration)
**Impact:** 🟠 High — unique knowledge base

### 9.1 Quick Win: Import 50 Verified Q&A

The PAKGOV-RAG project has `data/eval/verified_qa_50.jsonl` — 50 human-verified Q&A pairs (15 English, 15 Urdu, 20 mixed) about Pakistan Constitution, PPC, CrPC, ESTACODE.

```js
// add-pakgov-bank.js
const qa = fs.readFileSync('PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl', 'utf-8')
  .split('\n').filter(Boolean).map(JSON.parse);

const newQuestions = qa.map(function(item, i) {
  return {
    id: 'PAKGOV-' + (i + 1),
    q: item.question,
    a: '<p>' + item.answer + '</p>',
    t: ['constitution', 'pakistan', 'law', 'governance', 'pitb'],
    lvl: 's',
    s: 'n',
    src: 'PAKGOV',
    priority: 3
  };
});
// Merge into bank → 2474 + 50 = 2524 questions
```

### 9.2 PAKGOV RAG Service

```bash
cd PAKGOV-RAG-project
pip install streamlit sentence-transformers faiss-cpu rank_bm25
streamlit run app/demo/app.py --server.port 8501
```

### 9.3 Integration into AI Coach

```js
function coachWithPAKGOV(question, cb) {
  if (CLOUD_MODE) { cb(null); return; } // needs localhost RAG service
  
  fetch('http://localhost:8501/api/query', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: question, top_k: 3, lang: detectLang(question)})
  }).then(r => r.json()).then(function(rag) {
    var context = (rag.passages || []).map(function(p) {
      return '[Source: ' + p.source + ' p.' + p.page + ']\n' + p.text;
    }).join('\n\n');
    
    if (!context) { cb(null); return; }
    
    SAMPLE([
      {role: 'system', content: 'Answer using ONLY the provided context. If context is insufficient, say so. Cite sources.'},
      {role: 'user', content: 'Context:\n' + context + '\n\nQuestion: ' + question}
    ], cb);
  }).catch(function() { cb(null); }); // graceful fallback
}
```

### 9.4 PAKGOV RAG Stats

| Metric | Value |
|--------|-------|
| Document chunks | 6,711 |
| Sources | Constitution, PPC, CrPC, CPC, Rules of Business, ESTACODE, Senate Rules |
| Retrieval method | Hybrid BM25 + Dense RRF (k=60) |
| R@5 (recall at 5) | 0.740 (74%) |
| MRR | 0.605 |
| Cross-lingual similarity | 0.837 (Urdu↔English) |
| Verified Q&A | 50 (15 en, 15 ur, 20 mixed) |
| Grounded answers | 37/50 with citations |

---

## 10. Phase 6 — Optional Services

### 10.1 UTRNet Urdu OCR (Port 5052)

```python
# ocr_server.py — run alongside Whisper
@app.route('/ocr', methods=['POST'])
def ocr_urdu():
    image = request.files['image']
    # UTRNet inference (requires PyTorch + model weights from HuggingFace)
    return jsonify({'text': extracted_text})
```

Use cases:
- Scan Urdu resume images → extract text for JD↔CV match
- Process PAKGOV's 2 scanned PDFs (0 chars extractable currently)
- Read Urdu text from photos of whiteboards/notes

### 10.2 Neural Sentence Translation (Browser ONNX)

The `roman-urdu-translator` ONNX model (84MB) runs entirely in the browser:

```js
// Lazy-load for full sentence translation (not just word lookup)
function translateSentence(text, direction, cb) {
  loadNeuralTranslator(function(t) {
    var result = direction === 'en2ru' 
      ? t.translateEnToRomanUrdu(text)
      : t.translateRomanUrduToEn(text);
    cb(result);
  });
}
```

### 10.3 Free AI Provider Catalogs

| Project | Use | Effort |
|---------|-----|--------|
| awesome-freellm-apis | Reference: 516+ free LLM APIs with configs | 0 (read only) |
| awesome-free-ai-coding | Live-checked: 86 free AI offers + litellm.yaml | 0 (read only) |

These are reference tools — use them to pick which providers to configure in freellmpool/free-ai-gateway.

---

## 11. New Features from Integration Synergy

These are features that **don't exist in any single project** but emerge from combining integrations:

### 11.1 Adaptive Interview Curriculum

**Combines:** Intervity QBL Engine + Word-Freq-Analyzer + Agent Memory + Spaced Repetition

```
1. User practices questions → SRS tracks due dates
2. spAnalyse() scores each answer (MistakeClassifier + STAR)
3. Agent memory records: "weak at Redis eviction policies"
4. QBL picks next question from weakest tag
5. Spaced repetition schedules review of previously-wrong topics
6. Over time, the curriculum adapts to the user's specific gaps
```

### 11.2 Company-Aware Mock Interview

**Combines:** interview-skills company profiles + Intervity Pakistani persona + scout-intel-mcp + JD prep

```
1. User pastes a JD for "Senior SWE at PITB"
2. scout-intel-mcp researches PITB (funding, products, news)
3. Company style profile: PITB → Laravel/PHP + govt systems + 30min format
4. Pakistani persona: understands BS-CS degrees, CGPA, PITB/PASHA ecosystem
5. Mock interview asks PITB-specific questions in PITB style
6. Questions drawn from PITB-specific bank (already 531 PITB questions)
```

### 11.3 Multilingual Voice Interview Loop

**Combines:** Awaaz/Piper TTS + Whisper STT + ibx-transliteration.js + urduhack normalization + AI gateway

```
1. AI asks question → Awaaz reads it aloud in Urdu (Asad voice)
2. User speaks answer in Roman Urdu
3. Whisper STT transcribes → Roman Urdu text
4. urduhack normalizes any Arabic-variant characters
5. ibx-transliteration.js converts to Urdu script for display
6. spAnalyse() scores: MistakeClassifier + STAR + prosody + vocab
7. AI feedback via freellmpool (or Ollama if offline)
8. Piper reads feedback aloud in Urdu
9. Full loop: voice in → analysis → voice out, all in Urdu
```

### 11.4 Pakistan Law Interview Mode

**Combines:** PAKGOV-RAG + PAKGOV Q&A bank import + AI Coach + Pakistani persona

```
1. User selects "Pakistan Governance & Law" category
2. 50 verified Q&A from PAKGOV appear as practice questions
3. When user asks a law question in AI Coach:
   a. PAKGOV RAG retrieves top-3 relevant chunks (R@5=74%)
   b. AI generates answer using ONLY retrieved context
   c. Answer includes citation: [ESTACODE p.XX]
4. If user asks in Urdu → cross-lingual retrieval works (similarity 0.837)
5. Answer can be read aloud in Urdu via Awaaz/Piper
```

### 11.5 Cloud-Aware Graceful Degradation

**Combines:** CLOUD_MODE detection + AI gateway fallback chain + feature hiding

```
Localhost mode (full power):
  AI → freellmpool (178 routes) → Ollama (offline backup)
  STT → Whisper (port 5051, Urdu/Hindi)
  TTS → Awaaz (port 5053, Urdu) → Piper (port 5000, offline)
  Anki → AnkiConnect (port 6006)
  RAG → PAKGOV (port 8501)
  OCR → UTRNet (port 5052)
  Research → scout-intel-mcp (port 5053)

Cloud mode (Vercel, graceful):
  AI → Groq free API key (no popup, no server)
  STT → Browser SpeechRecognition (Chrome only, English)
  TTS → Browser speechSynthesis (limited Urdu voice)
  Anki → Hidden ("Available on localhost")
  RAG → Hidden ("Available on localhost")
  OCR → Hidden ("Available on localhost")
  Research → Hidden ("Available on localhost")
  
  All pure-JS features still work:
  ├── 2474 questions + 50 PAKGOV Q&A
  ├── Transliteration (32K dict, client-side)
  ├── MistakeClassifier + STAR + Prosody
  ├── Coaching strategies + Pakistani persona
  ├── Company style profiles
  ├── Reference answers (via Groq)
  ├── Session MD export
  ├── SQL Lab (WASM)
  ├── Spaced repetition
  └── Translation cache
```

### 11.6 Interview Debrief Mode

**Combines:** Session MD export + Agent memory + MistakeClassifier history + QBL curriculum

```
After a mock interview session:
1. Export session as Markdown (interview-skills)
2. Agent memory records: "struggled with system design, strong on behavioral"
3. MistakeClassifier history shows: 3x VAGUE, 1x L4_CEILING
4. QBL generates next-session curriculum: focus on system design + quantification
5. User can review their worst answers with AI-suggested improvements
6. Spaced repetition schedules review of questions answered poorly
```

### 11.7 Resume-Aware Question Generation

**Combines:** PDF resume parsing + JD prep + tech stack extraction + AI question generation

```
1. User uploads resume.pdf → pdf.min.js extracts text
2. User pastes JD → tech stack extraction identifies: Laravel, React, Redis, Docker
3. AI cross-references resume skills with JD requirements
4. Generates 10 targeted questions: "You mentioned Redis in your resume — 
   how would you handle cache stampede in a Laravel queue worker?"
5. Company style profile adjusts question style (PITB: practical, Google: system design)
```

---

## 12. Post-Integration Architecture

### 12.1 Localhost Mode (Full Power)

```
                    ┌─────────────────────────────────────────┐
                    │        INTERVIEW BOX (localhost:8765)     │
                    │                                           │
                    │  2524 Qs · Mock Interview · Speaking Coach│
                    │  JD Prep · SQL Lab · Spaced Repetition    │
                    │  + Phase 1 enhancements (all JS)          │
                    │  + Adaptive curriculum (QBL)              │
                    │  + Agent memory (cross-session)           │
                    │  + Company style profiles                │
                    │  + Reference answers + MD export          │
                    └──────────────┬──────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────────┐
          │                        │                            │
          ▼                        ▼                            ▼
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────────┐
│  AI GATEWAY     │    │   AUDIO PIPELINE      │    │  LANGUAGE & INTELLIGENCE │
│  (localhost)    │    │   (localhost)         │    │  (client-side)           │
│                 │    │                      │    │                          │
│ freellmpool     │    │ Awaaz (port 5053)    │    │ ibx-transliteration.js   │
│ port 8000       │    │ Urdu TTS              │    │ 32K dict + 71-char norm  │
│ 178 routes      │    │                      │    │                          │
│                 │    │ Piper (port 5000)    │    │ roman-urdu-translator    │
│ Ollama          │    │ Offline TTS            │    │ ONNX neural translation  │
│ port 11434      │    │                      │    │                          │
│ 100% offline    │    │ Whisper (port 5051)  │    │ Intervity analytics      │
│                 │    │ STT (Urdu/Hindi)      │    │ STAR + Mistakes + Prosody│
│ scout-intel-mcp │    │                      │    │                          │
│ port 5053       │    │ PAKGOV RAG (8501)    │    │ interview-skills         │
│ Company research│    │ Pakistan law Q&A     │    │ Ref answers + MD export  │
│                 │    │                      │    │                          │
│                 │    │ UTRNet OCR (5052)    │    │ dictionariez             │
│                 │    │ Urdu OCR              │    │ Anki + dictionary cache  │
│                 │    │                      │    │                          │
│                 │    │ AnkiConnect (6006)    │    │ Agent memory (localStorage)│
│                 │    │ Flashcard export      │    │                          │
│                 │    │                      │    │ Adaptive QBL (localStorage)│
└─────────────────┘    └──────────────────────┘    └─────────────────────────┘
```

### 12.2 Cloud Mode (Vercel, Graceful)

```
                    ┌─────────────────────────────────────────┐
                    │     INTERVIEW BOX (Vercel HTTPS)         │
                    │                                           │
                    │  2524 Qs · Mock Interview · Speaking Coach│
                    │  JD Prep · SQL Lab · Spaced Repetition    │
                    │  + All Phase 1 enhancements (pure JS)    │
                    │  + Adaptive curriculum (localStorage)    │
                    │  + Agent memory (localStorage)            │
                    │  + Company style profiles                │
                    │  + Reference answers (via Groq)          │
                    │  + Session MD export                      │
                    └──────────────┬──────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐         ┌─────────────────────┐
          │  AI (cloud)      │         │  LANGUAGE (client)   │
          │                  │         │                      │
          │ Groq free API    │         │ ibx-transliteration.js│
          │ (no popup,       │         │ 32K dict + norm      │
          │  no server)      │         │                      │
          │                  │         │ Intervity analytics   │
          │ Google AI Studio │         │ (all pure JS)        │
          │ (free, 1500/day) │         │                      │
          │                  │         │ interview-skills     │
          │ OpenRouter       │         │ (all pure JS)        │
          │ (free models)    │         │                      │
          └─────────────────┘         │ dictionariez         │
                                      │ (cache, lookup)      │
          ┌─────────────────┐         │                      │
          │  STT (browser)   │         │ NO: PAKGOV RAG       │
          │                  │         │ NO: UTRNet OCR       │
          │ SpeechRecognition│         │ NO: scout-intel-mcp  │
          │ (Chrome only,   │         │ NO: Anki export      │
          │  English only)  │         │ NO: Whisper STT      │
          └─────────────────┘         │ NO: Awaaz/Piper TTS   │
                                      │ NO: Ollama            │
          ┌─────────────────┐         └─────────────────────┘
          │  TTS (browser)   │
          │                  │
          │ speechSynthesis  │
          │ (limited Urdu)   │
          └─────────────────┘
```

### 12.3 Feature Availability Matrix

| Feature | Localhost | Vercel (Cloud) | Source |
|---------|-----------|----------------|--------|
| 2524 questions | ✅ | ✅ | Bank + PAKGOV import |
| Transliteration (32K dict) | ✅ | ✅ | Client-side JS |
| Urdu normalization (71 mappings) | ✅ | ✅ | Client-side JS |
| MistakeClassifier | ✅ | ✅ | Client-side JS |
| STAR Evaluator | ✅ | ✅ | Client-side JS |
| Prosody Analyzer | ✅ | ✅ | Client-side JS |
| Vocabulary diversity | ✅ | ✅ | Client-side JS |
| Pakistani persona | ✅ | ✅ | Prompt template |
| Company style profiles | ✅ | ✅ | Static data |
| 11 coaching strategies | ✅ | ✅ | Client-side JS |
| Reference answers | ✅ (freellmpool/Ollama) | ✅ (Groq API key) | AI call |
| Session MD export | ✅ | ✅ | Client-side JS |
| Adaptive QBL curriculum | ✅ | ✅ | Client-side JS |
| Agent memory | ✅ | ✅ | localStorage |
| SQL Lab | ✅ | ✅ | WASM |
| Spaced repetition | ✅ | ✅ | localStorage |
| Translation cache | ✅ | ✅ | localStorage + IDB |
| Word hover dictionary | ✅ | ✅ | Client-side JS |
| AI Coach | ✅ (178 routes + Ollama) | ✅ (Groq/Gemini key) | AI gateway |
| JD analysis | ✅ | ✅ | AI call |
| Translation (neural) | ✅ (ONNX 84MB) | ✅ (ONNX 84MB) | Browser |
| PDF resume parsing | ✅ | ✅ | pdf.min.js (WASM) |
| Whisper STT (Urdu/Hindi) | ✅ (port 5051) | ❌ (browser STT only) | Python server |
| Urdu TTS (Awaaz/Piper) | ✅ (port 5053/5000) | ⚠️ (browser TTS only) | Python server |
| Anki export | ✅ (port 6006) | ❌ | AnkiConnect |
| PAKGOV RAG | ✅ (port 8501) | ❌ | Streamlit + FAISS |
| UTRNet OCR | ✅ (port 5052) | ❌ | PyTorch service |
| scout-intel-mcp | ✅ (port 5053) | ❌ | MCP server |
| Ollama (offline AI) | ✅ (port 11434) | ❌ | Local model |
| Voice cloning | ✅ (VoxCPM/Voice-Pro) | ❌ | GPU model |

---

## 13. Implementation Checklist

### Phase 0 — Vercel Fix (2-4 hours)
- [ ] Add `vercel.json` with static hosting config
- [ ] Add `IS_CLOUD` / `CLOUD_MODE` detection
- [ ] Hide Whisper/Anki/Ollama UI in cloud mode
- [ ] Add cloud-mode setup banner (recommend Groq free key)
- [ ] Deploy `ibx-transliteration.js` alongside HTML
- [ ] Test: deploy to Vercel, verify questions render, transliteration works

### Phase 1 — AI Gateway (2-4 hours)
- [ ] Install freellmpool: `pip install freellmpool`
- [ ] Start: `freellmpool serve` (port 8000)
- [ ] Add `freellmpool` provider to `PROV` object in interview-box.html
- [ ] Install Ollama + pull `llama3.2:3b`
- [ ] Add `ollama` preset to `PROV` object
- [ ] Configure freellmpool to use Ollama as backend when cloud routes fail
- [ ] Test: disconnect internet → verify AI still works via Ollama

### Phase 2 — Intelligence Layer (already mostly done)
- [x] MistakeClassifier (patched)
- [x] STAR Evaluator (patched)
- [x] Prosody Analyzer (patched)
- [x] Pakistani persona (patched)
- [x] 11 coaching strategies (patched)
- [x] Auto-restart SpeechRecognition (patched)
- [x] Reference answers (patched)
- [x] Session MD export (patched)
- [x] Company style profiles (patched)
- [x] AI lookup cache (patched)
- [x] Anki export (patched)
- [x] Word hover dictionary (patched)
- [x] PDF resume parsing (patched)
- [ ] Agent memory (cross-session) — 2h
- [ ] Adaptive QBL curriculum — 4h
- [ ] IndexedDB session storage — 4h

### Phase 3 — Language Layer (4 hours)
- [ ] Merge `roman_urdu_map.json` (30,888 entries) into ibx-transliteration.js
- [ ] Port urduhack 71 character normalization mappings to JS
- [ ] Add diacritic stripping before Urdu→Roman lookup
- [ ] Rebuild ibx-transliteration.js (~800KB)
- [ ] Test: Arabic-variant Urdu text from WhatsApp/websites now transliterates correctly
- [ ] (Optional) Load ONNX neural translator for sentence translation (84MB)

### Phase 4 — Audio Layer (2h - 1 week)
- [ ] Phase 4a: Add Awaaz Urdu TTS (2h) — `tts_server.py` + "🔊 Read in Urdu" button
- [ ] Phase 4b: Add Piper offline TTS (4h) — ONNX models, CPU-only fallback
- [ ] Phase 4c: (Optional) Vocal Craft Studio browser WASM TTS (1 day)
- [ ] Phase 4d: (Optional) VoxCPM studio TTS + voice cloning (2-3 days, needs GPU)
- [ ] Phase 4e: (Optional) Voice-Pro full audio pipeline (1 week)

### Phase 5 — Knowledge Base (3 hours)
- [ ] Import 50 PAKGOV verified Q&A to question bank (30 min)
- [ ] Set up PAKGOV RAG Streamlit service (30 min)
- [ ] Wire `coachWithPAKGOV()` into AI Coach (2h)
- [ ] Test: ask "PITB ke liye kya compliance requirements hain?" → get cited answer

### Phase 6 — Optional Services
- [ ] UTRNet Urdu OCR service (port 5052) — needs PyTorch + model weights
- [ ] scout-intel-mcp company research (port 5053) — needs Python MCP server
- [ ] Neural sentence translation (ONNX in browser, 84MB) — lazy load
- [ ] Voice biometrics (experimental) — Intervity VoiceBiometricsService

### Ongoing
- [ ] Verify question count = 2524 (2474 + 50 PAKGOV) after bank import
- [ ] Verify file size < 6MB after all patches
- [ ] Create backup before every patch: `interview-box.html.bak-{date}`
- [ ] Test both localhost mode and cloud mode after each phase

---

## Summary

**Current state:** Interview Box is a 3.55MB single-HTML-file interview prep platform with 2474 questions, offline Whisper STT, 13K Roman↔Urdu transliteration, and AI via puter.com (single point of failure). Phase 1 enhancements (MistakeClassifier, STAR, prosody, Pakistani persona, reference answers, session export, company profiles, Anki export) are already patched in.

**Vercel issue:** The app is localhost-architected. On Vercel, the HTML loads fine but Whisper STT (port 5051), Anki (port 6006), Ollama (port 11434) all fail because there are no localhost servers. Puter AI may work but requires a popup sign-in that could be blocked. Fix: add `vercel.json`, detect cloud mode, hide localhost features, default to Groq free API key for AI.

**After all integrations:** The system transforms from a question-bank app into a fully offline-capable, multilingual AI interview coaching platform with:
- 178-route AI failover + offline Ollama (no more puter.com dependency)
- 32K transliteration dictionary + Arabic-variant normalization
- Professional answer scoring (MistakeClassifier + STAR + prosody + vocab)
- Pakistan law knowledge base (6,711 chunks, R@5=74%)
- Urdu TTS (Awaaz/Piper) + voice cloning (VoxCPM, long-term)
- Adaptive curriculum that targets weak areas
- Cross-session agent memory
- Company-specific interview style profiles
- Graceful cloud/localhost mode switching

**The 3 most impactful changes (in order):**
1. **freellmpool + Ollama** (1h) — eliminates puter.com single point of failure, enables offline AI
2. **Vercel fix** (2-4h) — makes cloud deployment work with graceful degradation
3. **Language layer merge** (4h) — 2.4× more transliteration coverage + fixes silent Arabic-variant failures








 ◐ Tasks (4)
 ├── ● 1. Phase 0: Add vercel.json + cloud mode detection to interview-box.html [done]
 ├── ● 2. Phase 1: Add freellmpool + Ollama providers to interview-box.html AI config [done]
 ├── ◐ 3. Phase 3: Merge roman_urdu_map.json + port urduhack normalization into ibx-transliteration.js
 └── ○ 4. Verify all changes work together and test cloud vs localhost behavior