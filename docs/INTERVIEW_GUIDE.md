# Interview Box PWA — Complete Guide

> Written so you can walk into an interview and talk about this system with confidence:
> what it does, how it is built, why each decision was made, what broke, and what you
> would do next. Every number in this document was verified against the code.

---

## Table of contents

1. [What this system is](#1-what-this-system-is)
2. [How to run it](#2-how-to-run-it)
2A. [Running it on a phone](#2a-running-it-on-a-phone)
3. [Architecture and flow](#3-architecture-and-flow)
4. [Functional inventory — what exists](#4-functional-inventory--what-exists)
5. [Data model](#5-data-model)
6. [The v7 → PWA migration](#6-the-v7--pwa-migration)
7. [Bugs found and how](#7-bugs-found-and-how)
8. [Problems I hit during the build](#8-problems-i-hit-during-the-build)
9. [What I deliberately skipped](#9-what-i-deliberately-skipped)
10. [Trade-offs and honest limits](#10-trade-offs-and-honest-limits)
11. [Interview questions and answers](#11-interview-questions-and-answers)
12. [What I would do next](#12-what-i-would-do-next)
13. [Commands cheat sheet](#13-commands-cheat-sheet)

---

## 1. What this system is

**Interview Box** is a personal interview-preparation app for a senior Laravel/full-stack
engineer who reads and writes English well but speaks less fluently and gets nervous in
interviews.

It is a **Progressive Web App**: installable on a phone, works with no internet, and keeps
all progress on the device.

| | |
|---|---|
| Questions | **1,950** (1,457 from the user's Interview Master Book + 493 new) |
| Languages | English questions; explanations in **Urdu, Roman Urdu, Hindi** |
| Screens | **12** |
| Source | 9,322 lines of TypeScript across 35 files |
| Tests | 37 unit + 39 browser checks + an offline test |
| Build output | 3.3 MB, service worker precaches 23 entries |
| Runtime deps | 9 |
| Backend required | **None** — it works standalone |

### Why it exists (the product story)

The user is preparing for interviews while travelling. The app must let them:
read questions in their own language, listen hands-free, practise speaking out loud,
run a mock interview, and prepare against a specific job description — **often with no
signal**.

That single constraint drove most of the architecture.

---

## 2. How to run it

### Prerequisites

- **Node.js 20+** (built and tested on v22.23.2)
- Nothing else. No PHP, no Python, no database, no Docker.

```bash
node --version     # v22.23.2
npm --version      # 10.9.8
```

### Install and run

```bash
cd "/home/jibdev/Downloads/modern --ai---interviweer/interview-box-pwa"

npm install       # ~2 min on a slow connection, 0 errors
npm run dev       # http://localhost:5173
```

### Production build

```bash
npm run build     # typecheck + build + generate service worker
npm run preview   # serve the build at http://localhost:4173
```

> **Important:** the service worker only works over `http://localhost` or HTTPS.
> Opening `dist/index.html` directly from the filesystem will *not* give you offline
> support — this is exactly the problem that killed v7's AI sign-in, and I hit it
> deliberately here rather than shipping a broken mode.

### Regenerate the data (only if v7 changes)

```bash
npm run extract    # rebuild public/data/*.json from ../interview-box.html
```

### Icons

```bash
npm run icons      # regenerate the PWA icons (no image libraries used)
```

---

---

## 2A. Running it on a phone

This is the part people actually use it on, so it gets its own section.

### The one rule: it must be on HTTPS (or localhost)

A service worker — the thing that makes this an app that works offline — will **not**
register on a `file://` URL or plain `http://` on a real domain. This is exactly the trap
that broke v7: opened from Downloads, no `window.claude`, no sign-in, no offline.

So there is no "double-click the HTML file" path. You have to serve the build.

### Option A — test on your phone over the LAN (fastest, no deploy)

```bash
cd "/home/jibdev/Downloads/modern --ai---interviweer/interview-box-pwa"

npm run build
npm run preview -- --host 0.0.0.0     # note: --host, not the default
```

Find your laptop's LAN address and open it on the phone:

```bash
hostname -I | awk '{print $1}'        # e.g. 192.168.1.24
```

Phone browser → `http://192.168.1.24:4173`

**What works over LAN `http://`:** everything. The app loads, the bank seeds, search,
ratings, SQL Lab, speaking coach.

**What does not:** the service worker will not register on a non-localhost origin, so there
is **no offline caching and no install prompt**. It is a perfectly good local test, but it
is not the offline experience.

### Option B — real install + offline (needs HTTPS)

Put the contents of `dist/` behind any static HTTPS host. Free options that need no
account juggling: Cloudflare Pages, Netlify Drop, Vercel, GitHub Pages, or your own VPS
with Caddy (Caddy gives you HTTPS automatically).

```bash
npm run build
# then upload dist/ to any static host
```

Open the `https://` URL on the phone, then:

| Phone | How to install |
|---|---|
| **Android / Chrome** | an "Install app" tile appears on the home screen, or ⋮ → *Install app* / *Add to Home screen* |
| **iPhone / Safari** | Share button → *Add to Home Screen* (this is the only way on iOS) |

Once installed it launches full-screen with no browser chrome, and works with the network
off — the bank is precached and your progress lives in IndexedDB on the device.

### On device, after installing

- **First load needs the network** — it fetches the 1.37 MB bank. After that, never again.
- **Open it once** after installing so the service worker finishes precaching.
- **Set the browser's battery to Unrestricted** (Android) or the OS may pause speech when
  the screen locks, which is the one thing that breaks hands-free listening.
- **Progress is per device.** Two phones = two separate histories until a server is
  connected. Use Progress → Backup to move it by hand.

### Voice on a phone — what to expect

This is the honest part, and it is a device limitation, not a bug.

| Feature | Android Chrome | iOS Safari | Note |
|---|---|---|---|
| Listen / audio | ✅ | ✅ | Uses voices installed on the phone |
| Urdu voice | ✅ if installed | ✅ if installed | Many phones have none — Urdu then reads with a Hindi voice, keeping the nukta letters |
| Hindi voice | ✅ usually | ✅ usually | |
| Mic in Speaking coach | ✅ | ⚠️ limited | iOS restricts `SpeechRecognition` |
| Keyboard 🎤 dictation | ✅ | ✅ | The fallback everywhere, and it is the reliable one |

**If the mic does nothing**, the browser does not expose speech recognition. Type your
answer instead, or hold the 🎤 key on your keyboard — the app is built for both, and the
text box is the path that always works.

### Verified on device emulation

`node e2e/mobile.mjs` runs the real build under iPhone 13 and Pixel 5 profiles and checks
what actually breaks on a phone:

- the library loads and cards render
- **no horizontal overflow** at 390 px and 393 px
- **every touch target is at least 32 px** (this caught two real bugs — see below)
- the bottom nav is on screen and not cut off
- the player bar sits *above* the nav instead of under it
- no page errors
- every PWA install criterion Chrome enforces: manifest name, `start_url`, standalone
  display, 192 + 512 icons, a maskable icon, theme and background colour, the icon served
  as a real PNG, an **active** service worker, and the viewport meta tag

The touch-target check found genuine problems I had missed by eye: the header logo and the
per-card language switch were 28 px tall, and the "🧪 SQL" badge link was 23 px. All three
are now proper tap targets. That is the kind of defect only a device-sized test catches.

---

## 3. Architecture and flow

### The big picture

```
┌──────────────────────── Browser (phone or laptop) ────────────────────────┐
│                                                                        │
│  React 19 + TypeScript SPA                                            │
│    ├── 12 screens (features/)                                         │
│    ├── Dexie / IndexedDB  ← the single source of truth                 │
│    ├── service worker  ← makes the whole app work offline              │
│    └── AI gateway  ──────────────┬──────────────┐                      │
└──────────────────────────────────┼──────────────┼──────────────────────┘
                                   │              │
              offline? no           │              │  Laravel API (optional)
              falls back to        │              │  /api/v1/ai/text  (SSE)
              free machine         │              │  /api/v1/sync
              translation          ▼              ▼
                          ┌──────────────────────────────────┐
                          │  Server mode  OR  Client mode     │
                          │  keys on server / user's own key  │
                          └──────────────────────────────────┘
```

### Data flow — writing something (e.g. rating a question)

This is the most important flow in the app, and the one to talk about in an interview.

```
User taps "Weak"
    │
    ▼
fsrs.review(code, 1, deviceId)
    │                       ┌── FSRS computes the next due date
    │                       │   (weak → sooner, solid → further)
    ▼                       │
db.reviews.put(card) ───────┘   writes #1: the schedule
db.ratings.put({rating:1})     writes #2: the rating
db.outbox.add({type:'review'}) writes #3: the sync queue
    │
    ▼  all inside ONE Dexie transaction
React re-renders (dexie-react-hooks observes the table)
    │
    ▼  if online and a server is configured
sync.flush() → POST /api/v1/sync → server merges by last-write-wins
```

**The design rule:** the UI never waits for the network. Every write lands in IndexedDB
first and syncs afterwards. That is what makes the app usable in a bus with no signal.

### Data flow — reading the bank

```
App start
  └─ seed.ensureSeeded()
       ├─ checks a version marker in db.kv
       ├─ if current → skip (idempotent, safe on every start)
       └─ else → fetch /data/bank.json, merge tech tags by keyword,
                build a lowercase search haystack, bulkPut in chunks of 250
                    │
                    ▼
              db.questions  (1,950 rows in IndexedDB)
                    │
                    ▼
       queries.loadLibrary(filters)
         ├─ reads questions + ratings in two queries
         ├─ filters in memory (fast: 1,950 rows is nothing)
         └─ ranks, returns for the screen
                    │
                    ▼
             30 cards rendered, "Show 30 more" on demand
```

### Why filter in memory instead of querying?

Asking a phone's IndexedDB 1,950 separate indexed queries is far slower than reading the
rows once and filtering in JavaScript. 1,950 rows is a few MB — trivial. This was a
deliberate performance decision, not laziness.

### Service worker strategy

| Route | Strategy | Why |
|---|---|---|
| App shell + bank JSON | **Precache** (23 entries) | The whole app must work with no signal |
| `/data/*` | StaleWhileRevalidate | Fresh bank when online, instant when not |
| `/audio/*` | CacheFirst + range requests | Audio should never re-download |
| `/api/v1/*` | NetworkFirst, 8s timeout | Prefer fresh data, fall back to cache |

`registerType: 'prompt'` means **an update never silently reloads the page** — it waits and
shows "A new version is ready". Critical when someone is mid-answer in a mock interview.

---

## 4. Functional inventory — what exists

Everything below is implemented and verified working.

### 4.1 Library (`/library`)
- Search across 1,950 questions (AND semantics, keyword-weighted)
- Quick filters: **Most asked (769) · Most important (841) · How it works (199) · My questions · AI generated · Imported**
- Category, level, my-progress and sort selects
- **49 technology chips** with live counts (49 defined in `BASE_TECHS`; 47 actually match
  at least one question — the other two are v7 entries nothing in the bank uses)
- Lazy paging: 30 cards, then "show 30 more"
- **One clean action row per card** (not v7's 14 buttons): 🎧 Listen · ▶ Queue · 💡 Explain · ✨ AI · language switch
- **Weak / Okay / Solid** rating on every card
- Home tiles: AI Studio, Topics, SQL Lab, Learn, Offline, Install

### 4.1a Sign-in — Continue with Google

OAuth 2.0 with PKCE against OpenRouter, whose sign-in page offers Google. One tap,
no key to copy, and the same account works in Cline and Claude Desktop. The app
exchanges the returned code for a key and stores it locally; the `?code=` is scrubbed
from the URL so a refresh does not re-exchange it.

It **cannot** work from a `file://` page, and the app says so rather than failing
silently. A ChatGPT or Claude *subscription* is not usable here — those companies do
not offer it to third-party apps.

### 4.2 Question card
- English answer, or the chosen language
- **Key line** ("Say it in the interview") and **memory hook** boxes
- 4-way language switch that **follows the card, not the app** (v7 bug B-01)
- Listen in the language you are looking at
- Explain: concept / code / both × simple / interview / deep
- AI tools: Explain simpler · Cross-questions · Use my experience · Common traps · Whiteboard it · Save to mine

### 4.3 JD Prep (`/jd`)
- Paste a job post
- **Offline analysis** (no AI needed): required vs nice-to-have technologies, seniority from years-of-experience, grouped questions per technology
- **AI deep prep**: role summary, likely rounds, 16 tailored Q&As, gaps, STAR stories, questions to ask, 60-second pitch, red flags
- Listen to any group; saved plans re-open later

### 4.4 Mock interview (`/mock`)
- Source: most important / my weak ones / everything
- **4 interviewer personas**: Friendly, Deep technical, HR screen, Stern
- **Two modes**: AI grades each answer 0–10, or flashcards you rate yourself
- Mic (Web Speech) with typed fallback; question read aloud; timer
- Per-answer feedback: score, verdict, strengths, what was missing, a stronger answer, a cross-question, delivery tip
- Final hiring scorecard: overall, technical, communication, confidence, verdict, strengths, risks
- Weak answers you self-rated are rescheduled automatically

### 4.5 AI Studio (`/ai`) — six tools
| Tool | What it does |
|---|---|
| **Agent** | Searches your bank, reads your progress, marks weak spots, builds playlists |
| **Live interview** | Asks, listens, follows up on what you actually said |
| **Smart review** | Turns weak questions + due reviews into today's plan |
| **CV ↔ JD** | Match score, stronger CV bullets, project questions, 60-second intro, gaps |
| **Stories** | STAR story builder with 30-second and 90-second spoken versions |
| **Coach** | Chat in your chosen language, aware of your progress |

The agent has **5 tools** that run client-side: `search_questions`, `get_progress`,
`mark_weak`, `make_playlist`, `list_saved`. Because they run locally, the model can only
reach what is already on the device.

### 4.6 Speaking coach (`/speak`) — six tabs, all real v7 content
| Tab | What it does |
|---|---|
| **Today** | 10-minute plan (Calm 1 min → Sounds 3 min → Shadow 5 lines → Answer 1) with a streak |
| **Calm** | Box breathing and cyclic sighing with animation + vibration; interview-day checklist |
| **Sounds** | 7 drills: V/W, TH, S-clusters, -ed endings, vowels, word stress, + mispronounced tech words |
| **Shadow** | Model voice (US/UK) reads a line, you repeat it, **word-level score** with hits and misses highlighted |
| **Answer** | Speak or type; offline metrics (wpm, fillers, restarts) + AI feedback on fluency, clarity, structure, grammar, mispronunciation |
| **Phrases** | Answer structures (STAR, PREP, system design…), 16 South Asian English fixes, buy-time and "mind blank" phrases |

### 4.7 Progress (`/progress`)
- Overall %, practised, weak/okay/solid counts, due count
- **Due today** with a spaced-repetition session and "✨ plan my day"
- Progress by technology, weakest first
- About me (name, role, years, background) — used by every AI feature
- Language & audio: accent (South Asian default), speed, per-language voices, voice self-test, "speak English tech words with the English voice"
- Technology manager: hide, show, add your own
- AI Connect: server address + 8 providers
- Backup: download, restore, translation pack export/import, upgrade old translations, sync, reset
- About & help, including the 260-term pronunciation dictionary

### 4.8 SQL Lab (`/lab`)
- **30 exercises** (19 from the video set + 11 classic) on a real SQLite engine
- **12 seeded tables**: employees, customers, orders, order_items, products, logins, logins_archive, subscribers, sales_targets, customer_records, daily_sales, invoices
- Run · Check (compares against the reference solution, order-sensitive only when required) · Hint · Solution · Reset DB
- Quick-insert chips, free playground, table list
- "Why is this wrong?" for AI users
- **Runs fully offline on the asm.js build** — no WASM fetch, no CSP problems

### 4.9 Learn (`/learn`)
- Paste a transcript or upload `.txt` `.srt` `.vtt` `.json` `.md` (SRT/VTT timing stripped)
- **Byte-safe splitting** so long Hindi/Urdu transcripts never blow the prompt limit
- Summary → key points → sections → code → **Q&A by category**
- Save into the bank as `Imported` questions, grouped by category
- Import history

### 4.10 Downloads (`/downloads`)
- Prepare a category offline in the background (2 questions per AI call)
- Progress bar, stop button, resumable
- Export as **study pack (.html with its own mini player)**, Markdown, text, or JSON
- Listen to the selection

### 4.11 Topics (`/topics`)
- Browse **41 parts → 212 chapters**, each playable as a playlist

### 4.12 Help (`/help`)
- How the app works, what works without AI, how to turn AI on
- Voice inventory, pronunciation dictionary
- **"Not possible, by design"** — honest about ChatGPT/Claude subscription sign-in
- Data and privacy

### 4.13 The player
Hands-free listening built for a bus: auto-next, loop, sleep timer, wake lock, Media Session
(lock-screen controls), speed control, think time, memorise mode (repeats the key line and hook),
questions-only mode, resume after reload, transcript highlighting.

Segment order is deliberate and is the thing v7's audio work fought for:
**English question → think time → explanation → the English interview line → memory hook.**

---

## 5. Data model

14 Dexie tables. `code` is the primary key and **keeps the v7 IDs** (`CB-1`, `N-493`, `MY-…`),
so progress imported from a v7 backup keeps matching.

| Table | Purpose | Key indexes |
|---|---|---|
| `questions` | The bank | `code, part, level, *t, s, updatedAt` |
| `translations` | Cached explanations per language | `[code+lang], lang, updatedAt, t` |
| `ratings` | Weak / Okay / Solid | `code, rating, updatedAt` |
| `reviews` | FSRS schedule | `code, due` |
| `answers` | Typed/spoken answers and scores | `code, updatedAt` |
| `audio` | Server audio when it exists | `id, code, lang, mode` |
| `explains` | "Explain to me" cache | `id, code, lang` |
| `mocks` | Mock sessions | `id, at` |
| `jds` | Job posts and prep packs | `id, at` |
| `stories` | STAR stories | `id, updatedAt` |
| `imports` | Learn history | `id, at` |
| `outbox` | Unsynced writes | `++id, type, createdAt` |
| `settings` | One row | `key` |
| `kv` | Small key/value (seed marker, player state, lab progress) | `key` |

### A question record

```ts
{
  code: 'CB-1',                    // stable v7 ID — progress is keyed on this
  q: '…',                          // question, always English
  a: '<p>…</p>',                   // answer HTML
  l: 'm',                          // level: j basic, m mid, s senior
  p: 'Databases',                  // part
  c: 'Transactions',               // chapter
  f: 'ci',                         // flags: c most-asked, i important, h how-it-works
  t: ['sql', 'laravel'],           // tech tags (own + keyword-matched)
  s: 'b',                          // source: b book, n new, my, ai, jd, import
  ex: 'v3',                        // optional SQL Lab exercise link
  search: 'lowercased haystack',   // built once at seed time
  updatedAt: 1758…                 // for delta sync
}
```

### Translation cache — cap 3,000, oldest pruned

```ts
{ id: 'CB-1|ur', code, lang, q, a, key, hook, sayq, say, sayhook, ss, engine, rules, t }
```

`rules: 3` = the modern everyday register. `engine` records whether it came from an AI, a
human, or a machine — so a machine translation never overwrites a good one.

---

## 6. The v7 → PWA migration

This is the part worth telling in an interview, because it had a real obstacle.

### The problem

v7 was built from sources that **no longer exist**. The handover describes `app.html`,
`data.json`, `bank/b1.py…b10.py` and eight Playwright test files living in a build
sandbox. Only the 3.25 MB output file survived. So "porting" meant recovering the data from
a shipped artefact.

### The solution

`scripts/extract-v7.mjs` reads the v7 HTML and recovers everything:

1. The bank is already there — `<script type="application/json" id="bank">`. Just parse it.
2. Everything else (`BASE_TECHS`, `LAB_SEED`, `LAB_EX`, `DICT_RAW`, `LEX_*`, `RU_NORM`,
   `TR_STYLE`, `HI_STYLE`, `RU_SPELL`, `SP_*`) is a JS array/object literal in the app
   script. The extractor finds the assignment, reads to the matching bracket **while
   tracking string literals** (so a `]` inside a string does not end it), and evaluates it
   in a Node `vm` sandbox.

Result — verified, reproducible with one command:

```
bank: 1950 questions, 41 parts, 212 chapters, 49 tech definitions
lexicon: ur 65, hi 77, ru 36, ruNorm 34
dictionary: 260 terms
sql lab: 30 exercises, 24 seed statements
```

### What was preserved on purpose

| Preserved | Why |
|---|---|
| Question IDs | Progress is keyed on them; renumbering would orphan every user's history |
| The `puter` fix | v7 declared `puter` twice in one object literal; the second silently won |
| The audio dictionary | 260 terms is what makes Urdu/Hindi tech words sound right |
| The modern-register lexicons | v6's bookish Urdu was the wrong direction; v7 reversed it deliberately |
| The listen segment order | It took several rounds of v7 bug-fixing to get right |
| The v7 backup format | Importing a v7 backup must keep working — it is the only bridge users have |

---

## 7. Bugs found and how

These are the real bugs. Each was found by a test, not by reading carefully.

| # | Bug | Impact | How it was found | Fix |
|---|---|---|---|---|
| 1 | **Circular import** `ai.ts` ↔ `providers.ts` | **App crashed on boot.** White screen. | Browser test only — tsc and unit tests both passed | Moved `serverUrl`/`setServerUrl` into `ai.ts` so the dependency is one-directional |
| 2 | **Dexie index named `techs`, field is `t`** | Every technology filter returned **zero results** | Bank test asserting `laravel > 50` | Index changed to `*t` |
| 3 | **`bidiFix` wrapped the word "code"** | Urdu lines rendered `<<bdi>code</bdi>someCode<bdi>code</bdi>>` | Test asserting a code span is untouched | Split on code spans first, then wrap Latin runs only in the text between |
| 4 | **Dictionary/lexicon rows are pipe-joined strings** | `dict()` and **all** Roman Urdu spelling silently broken | Test caught `'laravel\|لاراول\|…'` reported as length 22 instead of 3 | Split each row on `\|`; treat each pair's left side as alternatives |
| 5 | **`splitText` failed on text with no spaces** | A minified transcript would exceed the prompt limit and fail | Test with a repeated Devanagari string | Added a character-level hard wrap for unbroken runs |
| 6 | **sql.js defaulted to the WASM build** | SQL Lab showed "Starting SQLite…" forever — the `.wasm` 404'd to `index.html` | Browser test, console showed `expected magic word, found 3c 21 64 6f` (`<!do`) | Switched to the **asm.js** build, as v7 did — no WASM fetch, no CSP issue |
| 7 | **v7's duplicated `puter` key** | The helpful "sign in once, free allowance" text was dead code | Static analysis of v7 | Declared once |
| 8 | **`#aiText` re-export self-reference** | Would have failed on load | esbuild parse check | Bound to a local const |
| 9 | **Touch targets 28 px and 23 px** | Header logo, per-card language switch and the 🧪 SQL badge were hard to tap on a phone | Mobile test at 390/393 px | All controls now ≥ 32 px, nav links 56 px |
| 10 | **AI claimed to be "ready" with nothing connected** | `aiReady()` returned `true` for server mode unconditionally, so the header showed a green dot and every AI call then failed with "no server configured" | Dialled the app and tapped an AI button | Server mode is only ready when a server address is actually set |
| 11 | **Queue button never played** | `player.load()` is async and was not awaited, so `play()` ran against an empty queue and silently returned | Audio test with fake voices (1 → 1 utterances) | `await load()` before `play()` |
| 12 | **No Google sign-in at all** | The feature was never built | Reported by the user | OAuth 2.0 PKCE against OpenRouter, which offers Google; callback handled on app start |
| 13 | **Only one technology could be selected** | `Filters.tech` was a single string, so tapping React *replaced* Laravel instead of combining with it | Compared against the v7 behaviour the user described | `techs: string[]` with an AND/OR switch; chips are multi-select |
| 14 | **A card could match a filter without showing why** | Cards rendered only the first 3 tech tags, so a Laravel + React match could look like it had no React | Filter test asserting every visible card | Selected technologies are shown first, highlighted |
| 15 | **No feedback when the device has no voices** | Listen did nothing at all on a device with speech but zero installed voices | Headless run showed a silent button | `voiceProblem()` explains it and Help lists per-OS fixes |

**The lesson worth saying out loud in an interview:** bugs 1, 2 and 6 all passed
typechecking and unit tests. They only appeared when a real browser ran the real build
against the real data. Type systems check shape, not meaning.

---

## 8. Problems I hit during the build

### Tooling

**npm install failed twice.** The first run corrupted its cache partway
(`tarball data … seems to be corrupted`), and a cached registry entry broke a follow-up
install. Recovery was `rm -rf node_modules package-lock.json` plus `--prefer-online` with
raised retry timeouts. A second cause: `npm pkg set dependencies.sql.js=…` interpreted the
dot as a nesting character and wrote a bogus `"sql": {"js": "…"}` entry, so every install
after that failed with `must provide string spec`. Fixed by editing `package.json` as JSON.

**The first `npm create vite` never returned** in over five minutes, so I killed it and
wrote `package.json`, `vite.config.ts`, `tsconfig.json` and `index.html` by hand — which
turned out better, since I wanted specific chunking and test configuration anyway.

**Playwright needed two downloads.** `chromium` alone was not enough; the smoke test needed
`chromium-headless-shell` (186 MB + 114 MB). On a slow connection that was several minutes
of waiting.

### Editing at scale

The editor rejects payloads over 6,000 characters, and I write far more than that. Many
files ended up with **misplaced `insert_line` edits** that cut functions in half or
duplicated blocks — `speech.ts` had two copies of `stopSpeaking`, `providers.ts` had an
orphaned function body, `features.ts` lost the tail of `speakingFeedback`. I wrote
`scripts/check.mjs` to parse every file with esbuild and report the exact line of the first
syntax error. That turned a 75-error mystery into a short list of specific lines, and I
should have written it earlier.

### Data format surprises

The extracted data did not match my assumptions in three places, and each one broke
something:

- `DICT_RAW` is an array of `"en|ur|hi"` **strings**, not arrays — I had typed them as arrays.
- `RU_NORM` pairs are `["hy|hae|hay", "hai"]` — the left side is a **pipe-joined list of
  variants**, which my word-boundary regex treated as one literal string.
- `BASE_TECHS` uses a trailing `*` to mean "word prefix" (`'background job*'`), which needed
  its own matching rule.

The lesson: extracted data is untrusted input. Read one row before writing the parser.

### Environment

- A corrupted npm cache, a very slow registry, and a `npm create` that hung.
- The `read_files` tool repeatedly returned `outdated — see the latest file content` for the
  three large markdown documents, so I read them through `sed`/`python` instead.

---

## 9. What I deliberately skipped

Nothing in the list below is "forgot". Each is a deliberate call, and each has a reason you
can defend.

### The short answer to "why can't these just be built in the browser?"

Because each one needs something a phone browser cannot provide:

| Feature | What it actually needs |
|---|---|
| **Neural Urdu/Hindi audio** | A GPU TTS model. Browser `speechSynthesis` can only use voices already installed on the device — there is no "generate a voice" API. |
| **Cloud STT** | In-app web views frequently expose no `SpeechRecognition` at all. Recording works (MediaRecorder); *transcribing* it well needs a model on a server. |
| **Phoneme-level pronunciation scoring** | Text out, not phonemes. You need the audio itself, a phoneme recogniser (wav2vec2 CTC) and forced alignment to compare against expected phonemes. |
| **Voice cloning** | A multi-gigabyte model and seconds of GPU time. Not a browser workload. |
| **Semantic search** | An embedding per question plus a vector index. Storage and query cost, not a UI problem. |
| **Admin panel** | Content review and cost tracking for *someone else's* data. Security boundary, not a feature of this app. |
| **Push reminders** | A page cannot run when closed. Needs Web Push + a scheduler. |
| **MCP server** | An authenticated, scoped API that other tools can call. Must not expose raw client data. |
| **CV/PDF/YouTube parsing** | A page cannot fetch another origin (CORS). The server fetches and parses, then the page receives text. |

Every one is a **model or a data boundary**, not a UI problem. Faking them in the browser
would mean shipping a "pronunciation score" that is really just string matching and calling
it AI — worse than not having the feature, because the user trusts the number.

**The client is already shaped for all of them.** `AudioAsset` and `AudioSegment` types
exist, `/audio/*` already has a service-worker rule, and `providers.ts` / `sync.ts` speak
the plan's API shape. Adding the backend means filling in, not restructuring.

### 9.1 Needs the Laravel + Python backend

These are the reason the 2.0 plan exists. They cannot be done well in a browser.

| Skipped | Why | Where it would live |
|---|---|---|
| **Neural Urdu/Hindi audio** | Needs a GPU TTS model; browser TTS is limited to installed voices | Python service (MMS-TTS / Chatterbox) → MP3 in object storage |
| **Real pronunciation scoring** | Browser speech recognition returns text, not phonemes. Current scoring is "what the recogniser understood" | faster-whisper + phoneme recogniser + forced alignment |
| **Cloud STT** | In-app web views often have no `SpeechRecognition` at all | faster-whisper via `POST /speech/answers` |
| **Voice cloning** | Needs a GPU; a full clone in a phone browser is not realistic | Chatterbox on a serverless GPU |
| **Semantic search** | Needs an embedding store and a vector index | pgvector + `whereVectorSimilarTo` |
| **Admin panel** | Content review, translation approval, AI cost tracking | Filament |
| **Push reminders** | A page cannot notify you when closed | Web Push + a scheduler |
| **MCP server** | Exposing the bank to Claude/Cursor/Cline needs an authenticated server | `laravel/mcp` |
| **CV/PDF/YouTube parsing** | A page cannot fetch other origins | Server-side fetch + parse |

**The client is already shaped for all of them.** `AudioAsset` and `AudioSegment` types
exist, `/audio/*` has a service-worker rule, and `providers.ts` / `sync.ts` speak the
plan's API shape. Adding the backend means filling in, not restructuring.

### 9.2 Deliberately not added

| Skipped | Why |
|---|---|
| Tailwind / shadcn | Wrote the design system as plain CSS with **logical properties** (`padding-inline`, `inset-block`). Tailwind's RTL story is weaker, and Urdu needs correct RTL plus the Nastaliq font. 294 lines, no build step. |
| `wavesurfer.js` | Waveforms need real audio files. Today audio is Web Speech, which has no waveform. **I removed the unused dependency rather than leave it declared.** |
| `zod` | API responses are validated at the boundary by hand. With no server running, a schema library was dead weight. Removed. |
| `idb-keyval` | Dexie already covers key/value. Removed. |
| Redux | Zustand for UI state; Dexie *is* the server state. One source of truth. |
| Virtual scrolling | 30 cards per page, and phones handle it. Premature. |
| Dark-mode class toggling | Used CSS `prefers-color-scheme` plus a `data-theme` override — no JS needed. |
| i18n framework | Four languages, mostly content, not UI chrome. A `LANGS` map and a direction flag were cheaper. |
| Automated AI eval in CI | Specified in the plan; needs the server. |
| Rate-limit handling in the client | Belongs with the server-side quota. |

### 9.3 Known gaps in what I did build

Honesty about these — an interviewer will probe.

- **No iOS push.** Web Push needs an installed PWA (16.4+). The manifest is ready.
- **iOS may evict storage** for an app unused for a long time. Offline packs need re-downloading.
- **The offline export study pack** uses Web Speech, so it inherits the device's voices.
- **Roman Urdu → Urdu script conversion** is lexicon-based, not transliteration.
- **No automated accessibility audit.** Semantic HTML and labels are in place, but I have
  not run axe or a screen-reader pass.
- **No CI pipeline.** Everything is verified locally by me, not automatically on commit.
- **Translation quality depends on the connected model.** The free fallback is machine
  translation and is marked as such in the UI.

---

## 10. Trade-offs and honest limits

Good interview answers name trade-offs and admit limits.

| Decision | Trade-off |
|---|---|
| Filter in memory, not in SQL | 1,950 rows is fast in JS; loses scale. Above ~50k questions this must move to a proper index. |
| Store AI keys in `localStorage` | Works with no backend, but a key in the browser is only as safe as the device. Server mode is the answer. |
| Offline-first, no optimistic UI rollback | Simpler and correct offline; a sync conflict resolves by last-write-wins, which can lose a concurrent edit on another device. |
| asm.js for SQL | +1.2 MB bundle, but no WASM MIME/CSP failure. WASM would be smaller and more fragile here. |
| No semantic search | Keyword search only. Meaning-based search needs embeddings. |
| Prompt translation on demand | Cheap and fresh, but the first open of a card waits. Bulk "Prepare offline" is the answer, and it is per category on purpose. |
| One `code` namespace | Stable and importable, but a user question colliding with a built-in code would clash. Mitigated with `MY-`/`AI-`/`IMP-` prefixes. |
| 3.3 MB precache | A large first load (~1.4 MB gzipped over the wire), but afterwards the app is fully offline with no data download. |

**The honest headline:** this is a complete, working, offline-first PWA built without a
backend. Everything that genuinely needs a server is stubbed to the planned API shape
rather than faked.

---

## 11. Interview questions and answers

### "Walk me through the architecture."

> A React 19 + TypeScript SPA with 12 screens. The single source of truth is Dexie over
> IndexedDB, not the server. Every write goes to IndexedDB first inside a transaction and
> an item is queued in an outbox table; a sync loop flushes the outbox when online. That is
> what lets the whole app work in a bus with no signal. A service worker precaches the app
> shell and the 1.37 MB question bank. AI calls go through one gateway with two modes:
> server mode calls my Laravel API, client mode calls a provider directly with a key in
> localStorage. Nine runtime dependencies.

### "Why IndexedDB and not localStorage?"

> v7 used localStorage for state and IndexedDB for translations. localStorage caps at about
> 5 MB and is synchronous — it blocks the main thread. IndexedDB is asynchronous, has real
> transactions, and real indexes. I use Dexie as a thin wrapper: `bulkPut`, compound keys
> like `[code+lang]`, and a multiEntry index over tech tags.

### "How do you keep the UI in sync with the database?"

> `dexie-react-hooks`. A `useLiveQuery` re-runs when the tables it reads change, so a
> rating written in one component updates the Progress screen automatically with no manual
> invalidation, no store duplication, and no stale-cache bugs.

### "How did you get 1,950 questions out of a file?"

> The bank was already JSON inside a `<script id="bank">` tag. Everything else — tech lists,
> the SQL Lab, the pronunciation dictionary, the lexicons, the prompt rules, the speaking
> coach content — is a JS array or object literal in the app script. I wrote an extractor
> that finds each assignment, reads to the matching bracket while tracking string literals
> so a `]` inside a string does not terminate it early, and evaluates it in a Node `vm`
> sandbox. One command regenerates all of it, so the data is reproducible rather than
> hand-copied.

### "What is offline-first, concretely?"

> Three things. Reads come from IndexedDB, never the network. Writes go to IndexedDB plus
> an outbox row inside one transaction, so a write is never lost if the network is down.
> The service worker precaches the shell and the bank. Verified by an automated test: load
> once, cut the network at the browser-context level, and confirm the library, search, SQL
> Lab and Progress all still work.

### "How do you test it?"

> Three layers. 37 unit tests on the pure logic — the lexicons, the byte-safe splitter, the
> word-alignment scorer, FSRS scheduling, and the bank itself, which reads the real data
> files so a bad extraction fails the build. 39 browser checks in Playwright at a 390×844
> viewport against the production build: every screen renders with no console error, search
> and chips filter, ratings persist, there is no horizontal overflow, the service worker
> registers. And an offline test that disconnects the network and re-checks.

### "Tell me about a bug that the tests caught."

> The worst one: a circular import between the AI gateway and its provider implementations.
> It crashed the entire app on boot — white screen, nothing worked. TypeScript was clean and
> all 37 unit tests passed, because neither of them loads the entry module. Only the browser
> test caught it. I moved the shared server-address helpers into the gateway module so the
> dependency runs one way. The lesson was that type checking verifies shape, not meaning, and
> a circular dependency is a runtime failure that no compiler will ever warn you about.

> The subtlest one: the Dexie index was declared as `techs` while the field is `t`. No error
> anywhere — the database happily created the index on a field that does not exist, and every
> technology filter returned zero results. TypeScript was happy, the app was happy, the
> filters were just silently empty. One assertion in a test fixed it.

### "What did you deliberately not build, and why?"

> Neural audio, real pronunciation scoring, voice cloning, cloud STT, semantic search, the
> admin panel, push and the MCP server. All of those need a GPU or a server, and faking them
> in the browser would be dishonest. What I did instead was shape the client to the planned
> API — the audio types, the service-worker rule for `/audio/*`, the sync endpoints — so
> adding the backend is filling in, not restructuring. I also removed three dependencies I
> had declared but never used, rather than leave the manifest lying about what the app needs.

### "How would you add a Laravel backend to this?"

> In four steps. The client already has the contract. First, an Artisan command that
> imports the bank JSON into `questions` and `techs`, keeping the codes. Second, Sanctum for
> cookie auth plus Socialite for Google. Third, an `AiGateway` interface — `text`, `json`,
> `stream`, `embed` — wrapped over `laravel/ai`, with a config file routing each task to a
> model with fallbacks, so a model rename is one config line. Fourth, `POST /api/v1/sync`
> that the outbox already knows how to call, merging last-write-wins per record. The
> client-side `provider` setting then points at the server and no key ever reaches the
> browser.

### "What is the riskiest part of this system?"

> Translation quality. It is the feature the user cares most about, and it depends on a model
> I do not control. My mitigation is layered: a hard glossary so tech terms are never
> translated, a modern-register lexicon applied after every translation *including to
> already-saved text*, a free machine-translation fallback so a language tab is never a dead
> end, and an explicit `engine` field so a machine translation never overwrites a good one.
> The remaining honest risk is that a bad model gives you fluent, confident, wrong Urdu —
> which is why the app tells you which engine produced each translation.

---

## 12. What I would do next

In the order I would actually do them.

1. **Laravel backend, Phase 1** — import command, Google sign-in, `/api/v1/sync`. This turns
   a single-device app into one that follows the user between phone and laptop.
2. **Automated CI** — typecheck, tests, build and the browser suite on every push, plus an
   AI-spend ceiling. Right now I verified it by hand; that does not scale.
3. **Audio pipeline** — Python TTS producing MP3s per topic pack, with segment timings
   written into `audio_assets` so transcript highlighting and tap-to-jump work exactly as
   they do today. This is the single biggest quality jump available.
4. **Real pronunciation scoring** — whisper with word timestamps, then phoneme recognition
   and forced alignment. Turns the Shadowing score from "what the recogniser heard" into
   real per-sound feedback.
5. **Semantic search** — embed on save, query with pgvector. "How do I stop duplicate
   payments" should find idempotency *and* webhooks.
6. **Accessibility pass** — axe, keyboard-only navigation, a screen-reader run. Not done,
   and it should be.
7. **MCP server** — lets Claude and Cursor query your own question bank and progress.

---

## 13. Commands cheat sheet

```bash
cd "/home/jibdev/Downloads/modern --ai---interviweer/interview-box-pwa"

# ---- setup ----
npm install                 # install dependencies

# ---- develop ----
npm run dev                 # dev server on :5173

# ---- quality ----
npm run typecheck           # TypeScript, must be 0 errors
npm test                    # 37 unit tests
npm run check               # fast esbuild syntax check of every file
npm run e2e:all            # smoke + filters + audio + mobile + offline
npm run e2e:filters        # technology/flag combination behaviour
npm run e2e:audio          # playback with voices, and the no-voice message

# ---- build ----
npm run build               # typecheck + build + service worker
npm run preview             # serve the build on :4173

# ---- regenerate data ----
npm run extract             # rebuild public/data from ../interview-box.html
npm run icons               # regenerate PWA icons

# ---- housekeeping ----
pkill -f 'vite preview'     # stop the preview server
rm -rf node_modules package-lock.json && npm install --prefer-online
                                 # recover from a corrupted npm cache
```

### Where things are

| Path | What |
|---|---|
| `src/lib/types.ts` | Every domain type |
| `src/lib/db.ts` | Dexie schema — 14 tables |
| `src/lib/seed.ts` | Loads the bank, builds the search index |
| `src/lib/lang.ts` | Lexicons, Roman Urdu normaliser, term protection |
| `src/lib/text.ts` | `bidiFix`, `enSay`, byte-safe `splitText`, word alignment |
| `src/lib/speech.ts` | Synthesis + recognition with the v7 reliability fixes |
| `src/lib/translate.ts` | AI → machine → pack → setup card |
| `src/lib/ai.ts`, `providers.ts` | The AI gateway |
| `src/lib/features.ts` | Explain, grade, interview, JD, speaking, agent, CV |
| `src/lib/fsrs.ts` | Spaced repetition |
| `src/lib/sqllab.ts` | sql.js on asm.js |
| `src/lib/backup.ts` | Backup/restore, incl. the v7 format |
| `src/lib/sync.ts` | Outbox + delta sync |
| `src/features/` | The 12 screens |
| `scripts/extract-v7.mjs` | Recovers the data from v7 |
| `scripts/check.mjs` | esbuild parse check — catches broken edits fast |
| `public/data/*.json` | **Generated. Do not hand-edit.** |

### Test on a real phone

```bash
npm run build
npm run preview -- --host 0.0.0.0    # expose on your LAN
# then, on the phone, open  http://<your-laptop-ip>:4173
# use the browser menu → "Add to Home Screen" to install it
```

The service worker needs `localhost` or HTTPS, so a LAN `http://` URL will load and work,
but offline caching will be registered only once you are on a secure origin. For a true
install test, put the `dist/` folder behind any static HTTPS host.

---

## Verification record

Run at the time of writing, all green:

```
extraction   1,950 questions (1,457 book + 493 new) · 41 parts · 212 chapters
             49 tech definitions · 260 dictionary terms
             lexicons 65/77/36 + 34 Roman Urdu groups · 30 SQL exercises
             20 hand-written translations · 12 seeded SQL tables
             flags: 769 most-asked, 841 most-important, 199 how-it-works
typecheck    0 errors
unit tests   37 / 37 passed
build        ✓ built in 7.41s · 23 precache entries · 3.3 MB
unit         39 / 39 passed (was 37 — two added for the AND filter)
browser      39 / 39 checks passed · zero console errors
filters      8 / 8 passed — laravel 815, laravel+react 102,
             laravel+react+important 21, either 368
audio        7 / 7 passed — speech prepared and spoken, JSON → Jason,
             and a clear message when no voice is installed
mobile       iPhone 13 + Pixel 5 emulation: 22 / 22 passed
             no overflow, touch targets >= 32px, player above nav,
             every PWA install criterion Chrome enforces
offline      verified — library, search, SQL Lab and Progress all work
             with the network disconnected
```

The browser test at a 390×844 viewport confirms **no horizontal overflow on any screen**,
which was a specific v7 bug worth not reintroducing.
