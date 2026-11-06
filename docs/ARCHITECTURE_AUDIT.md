# Architecture Audit — Interview Box PWA

> Phase 0 deliverable per project brief. Completed: November 6, 2026.

---

## Framework

**NOT Next.js.** This is a **Vite 6 + React 19 SPA/PWA**.

- Build: `vite` ^6.0.3
- Router: `react-router-dom` ^7.1.1 (client-side `<Routes>/<Route>`)
- PWA: `vite-plugin-pwa` ^0.21.1
- The `/api/` directory contains **Vercel Serverless Functions**, not Next.js API routes
- No App Router, no Pages Router, no `next.config.*`

---

## Translation System

**Provider cascade in `src/lib/translate.ts`:**

| Priority | Provider | Trigger | Notes |
|---|---|---|---|
| 1 | Dexie IndexedDB cache | Always first | LRU-pruned at 3000 entries |
| 2 | Configured AI provider | Cache miss | OpenAI, Gemini, Groq, Anthropic, Mistral, OpenRouter, Puter, Claude, custom Ollama/LM Studio, or server-side Laravel endpoint |
| 3 | MyMemory free MT | AI failure | Mislabelled as `'Google'` in `mt` field — **fixed** |
| 4 | Setup card | All fail | User sees first-run guidance |

**Post-processing pipeline (all AI output):**
1. `normalizeUrduText()` — 71 Arabic-variant → canonical Urdu Unicode mappings
2. `ruNorm()` — Roman Urdu spelling normalization (lexicons.json `ruNorm` table)
3. `modern()` — lexicon modernization (bookish/archaic → everyday register)

**Languages:** `en`, `ur` (Urdu script), `ru` (Roman Urdu), `hi` (Hindi/Devanagari)

---

## TTS System

**Two-path architecture in `src/lib/ttsClient.ts`:**

### Path A: Local Python TTS Server (`server/tts_server.py`, port 5052)
Engine priority chain (first success wins):
1. **edge-tts** (Microsoft Neural) — best Urdu/Hindi, `ur-PK-UzmaNeural`, `ur-PK-AsadNeural`
2. **gTTS** (Google Translate TTS) — fallback online
3. **Kokoro-82M** — English-only, offline CPU
4. **MOSS-TTS-Nano** — multilingual, offline CPU
5. **Piper** — offline ONNX, 30+ languages
6. **F5-TTS** — zero-shot voice cloning (GPU)
7. **XTTS v2 proxy** — LocalVoice backend (port 8001)
8. **Bark** — expressive TTS (GPU)

### Path B: Browser `speechSynthesis` (fallback)
Works on Vercel, mobile, offline. Quality depends on device-installed voices.

**Default voices:**

| Language code | Voice | Notes |
|---|---|---|
| `ur` | `ur-PK-UzmaNeural` | Pakistani Urdu female |
| `ru` | `ur-PK-AsadNeural` | Roman Urdu → same Urdu voice (male) — **correct architecture** |
| `hi` | `hi-IN-SwaraNeural` | Hindi female |
| `en` | `en-US-JennyNeural` | English US neutral |

**Roman Urdu TTS routing:**
- `ruToUrdu = true` (default) → `romanUrduToScript(text)` → Urdu script → `ur-PK` voice
- `ruToUrdu = false` → Roman Urdu text sent to browser TTS with en-IN fallback
- The default `true` is the **correct behavior** per the project brief

---

## Full Text→Audio Flow

```
User taps "Listen" on a QCard
  ↓
getOrTranslate(question, lang) — cache → AI → MyMemory
  ↓
speakSegments([{lang:'en', text:q.q}, {lang, text:tr.say||tr.a}, ...])
  ↓
Per-segment preprocessing:
  en  → enSay()          — acronym expansion (PHP→P H P, JSON→Jason)
  ur  → urSpeech()       — English tech terms → Urdu script via dict()
  hi  → hiSpeech()       — English tech terms → Devanagari via dict()
  ru  → romanUrduToScript() → urSpeech()   (when ruToUrdu=true)
  ↓
chunkText() — split to ≤220 chars (Chrome utterance limit)
  ↓
sayOne() → ttsServerAvailable() ?
  speakViaServer(POST :5052/tts) → Audio blob → HTMLAudioElement.play()
  : speakViaBrowser(SpeechSynthesisUtterance)
```

---

## Database / Storage

| Layer | Technology | Purpose |
|---|---|---|
| Client (offline-first) | Dexie + IndexedDB | Questions, translations (3000 cap), ratings, reviews, answers, audio, mocks, settings, sync outbox |
| Server | MongoDB Atlas | Users, sessions, synced user records, community votes, AI keys |
| In-browser SQL | sql.js (WASM SQLite) | SQL Lab feature only |

---

## Authentication

| Method | Implementation |
|---|---|
| Email/password | `scrypt` hash, MongoDB, 30-day `ibx_session` HttpOnly cookie |
| Google OAuth 2.0 | Server-side PKCE+CSRF, MongoDB `upsertGoogleUser` |
| OpenRouter OAuth | Client-side PKCE, key stored in `localStorage['ibx-keys']` |
| Puter | Dynamic SDK load, free account |

---

## API Routes (Vercel Serverless Functions)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/signup` | POST | Email/password registration |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/me` | GET | Current user from session |
| `/api/auth/google` | GET | Start Google OAuth flow |
| `/api/auth/google-callback` | GET | Complete Google OAuth flow |
| `/api/v1/sync` | POST | Offline-first bidirectional sync |
| `/api/v1/vote` | POST | Community interview-asked vote |
| `/api/v1/stats` | GET | Aggregate ask counts per question |
| `/api/v1/ai-keys` | GET/POST | Per-user AI provider key storage |
| `/api/health` | GET | MongoDB ping |

---

## Bugs Fixed (this session)

| # | Location | Bug | Fix |
|---|---|---|---|
| 1 | `src/lib/speech.ts` | `broken` voice blacklist never resets — a single transient failure permanently disables a voice for the full page lifetime | Reset `broken = new Set()` inside `loadVoices()`, which fires on `voiceschanged` |
| 2 | `src/lib/speech.ts` `romanUrduToScript()` | ALL-CAPS and MixedCase tech terms (API, Laravel, GitHub) were being transliterated character-by-character to broken Urdu script | Tokens containing any uppercase letter are passed through unchanged; only all-lowercase tokens are transliterated |
| 3 | `src/lib/player.ts` `load()` | `item.tr` was always `undefined` — the ternary `? undefined : undefined` was dead code that never supplied a cached translation | Removed the dead ternary; `tr` is now consistently omitted and fetched lazily by `buildSegments()` at playback time |
| 4 | `src/lib/translate.ts` `machineOne()` | Machine translation engine was labelled `mt: 'Google'` but the actual API is MyMemory | Changed to `mt: 'MyMemory'` |
| 5 | `src/lib/translate.ts` `getTranslation()` cache upgrade | `ruNorm()` was not applied during the stale-rules upgrade path, so old Roman Urdu cache entries were not normalized | `ruNorm()` now applied in the upgrade path alongside `modern()` |
| 6 | `src/lib/translate.ts` `buildPrompt()` | Input was sliced to 6000 chars without a named constant; no max-char guard in the calling code | Extracted `MAX_INPUT_CHARS = 6000` constant; used in `buildPrompt()` for clarity and future easy tuning |
| 7 | `api/v1/sync.ts` | The `communityVote` branch inside the loop was dead code — `ALLOWED` guard skips it before it could be reached | Added explanatory comment documenting the dead code; the correct path is `/api/v1/vote` |
| 8 | `public/data/prompts.json` | `trStyle` system prompt did not explicitly distinguish Pakistani Urdu from Hindi vocabulary | Added explicit Hindi-word blacklist with Pakistani Urdu alternatives; added note about Urdu vs Hindi distinction |
| 9 | `public/data/lexicons.json` `ruNorm` | Missing common Roman Urdu spelling variants: `acha`, `thek`, `agr`, `toh`, `zaroorat`, `jldi`, and 20+ others | Added 30+ new normalization pairs covering common WhatsApp/SMS shorthand |
| 10 | `.env.example` | `VITE_WHISPER_URL` and TTS server env vars referenced in code but not documented | Added both with usage notes |

---

## Pre-existing Issues (not introduced by this session, not fixed)

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `tests/bank.test.ts` | `fake-indexeddb DataError` — Dexie + fake-indexeddb version mismatch causes all 14 bank tests to be skipped | Upgrade `fake-indexeddb` to match Dexie v4's requirements, or replace with `dexie-export-import` testing pattern |
| 2 | `package.json` | `@neondatabase/serverless` is a dead dependency — MongoDB is used for all server data | Remove from dependencies |
| 3 | `src/App.tsx` | `@vercel/analytics/react` has no TypeScript types — causes TS warning | Add `@types/...` or cast as `any` |
| 4 | `src/lib/speech.ts` | Watchdog timer is 220ms/char (max 48s for 220-char chunk) — very conservative but safe | Tune down to 120ms/char (still safe, faster recovery) |
| 5 | `server/tts_server.py` Bark | Urdu voices mapped to Hindi speaker presets — Bark has no Urdu-specific preset | Acceptable fallback; add comment explaining this. A native Urdu Bark voice requires fine-tuning |
| 6 | `api/v1/sync.ts` | Dead `communityVote` code branch — documented above | Remove the dead branch in a future cleanup PR |

---

## Environment Variables

| Variable | Required | Where set | Notes |
|---|---|---|---|
| `MONGODB_URI` | Yes (server) | Vercel env / `.env.local` | MongoDB Atlas connection string |
| `MONGODB_DATABASE` | Yes (server) | Vercel env / `.env.local` | Default: `interview_box` |
| `GOOGLE_CLIENT_ID` | Yes (OAuth) | Vercel env / `.env.local` | |
| `GOOGLE_CLIENT_SECRET` | Yes (OAuth) | Vercel env / `.env.local` | |
| `APP_URL` | Yes (prod) | Vercel env / `.env.local` | Canonical app URL for OAuth redirect |
| `VITE_WHISPER_URL` | No | `.env.local` (build-time) | Standalone Whisper STT server URL |
| `TTS_PORT` | No | Python server env | Default: 5052 |
| `XTTS_PROXY_URL` | No | Python server env | Default: http://127.0.0.1:8001 |
| `BARK_SMALL` | No | Python server env | Set to `1` to use smaller Bark model |
