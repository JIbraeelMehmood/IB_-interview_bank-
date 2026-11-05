# Interview Box PWA — Implementation Status
**Date:** 2026-10-28  
**PWA path:** `pwa/` (React 19 + Vite + TypeScript + Dexie + Workbox)  
**Build status:** ✅ `npm run build` passes — dist: 3.5 MB, 23 precached entries, **2,481 questions**

---

## Side-by-Side: v7 HTML vs PWA

| Feature | v7 HTML (interview-box.html) | PWA (pwa/src/) | Status |
|---------|------------------------------|----------------|--------|
| **Question bank** | 2,474 questions inlined in HTML | 2,481 questions in `public/data/bank.json` | ✅ More than v7 |
| **AI providers** | 9 (Puter, OpenRouter, Groq, Gemini, Mistral, Ollama, xAI, Fireworks, Anthropic/OpenAI) | 12 (server, puter, claude, gemini, groq, openrouter, openai, anthropic, custom, mistral, xai, fireworks) | ✅ More than v7 |
| **Library / question browser** | `renderList()`, `filterQs()`, `openCard()` | `Library.tsx` — search, chips, pagination, play all | ✅ Done |
| **Mock interview** | `startMock(qs, mode)` | `Mock.tsx` — AI grading, flashcard mode, 5 personas | ✅ Done |
| **Speaking coach** | `spRec()`, `spAnalyse()`, 4 analyses | `Speak.tsx` — 6 tabs, all v7 analyses + AI | ✅ Done |
| **AI Studio** | `AI` tab — agent, live interview, CV↔JD, stories | `AiStudio.tsx` — 6 tabs | ✅ Done |
| **JD Prep** | `JD` tab — keyword extract + AI prep pack | `JdPrep.tsx` | ✅ Done |
| **SQL Lab** | `Lab` tab — SQLite in browser | `Lab.tsx` — sql.js asm.js | ✅ Done |
| **Learn / listen** | `Learn` tab — TTS playlist | `Learn.tsx` + `Topics.tsx` | ✅ Done |
| **Progress / Settings** | `Me` tab — stats, SRS, settings | `Progress.tsx` — 9 settings sheets | ✅ Done |
| **Downloads / Offline** | `DL` tab — translation packs | `Downloads.tsx` | ✅ Done |
| **Spaced repetition** | Custom SRS (`srsRate()`) | FSRS via `ts-fsrs` — more accurate | ✅ Better than v7 |
| **Transliteration** | `ibx-transliteration.js` (636 KB lazy) | `lang.ts` + server (dictionary endpoint) | ✅ Done |
| **Urdu char normalization** | `window.normalizeUrdu()` — 71 Arabic→Urdu maps | `lang.ts:normalizeUrduText()` — same 71 maps | ✅ Done |
| **Translation** | `trGet()`, `TR` cache, IndexedDB | `translate.ts`, Dexie `translations` table | ✅ Done |
| **Text-to-speech** | `speechSynthesis` + Awaaz TTS | `speech.ts:speakSegments()` + voice prefs | ✅ Done |
| **Speech recognition** | `SpeechRecognition` + Whisper server | `speech.ts:listen()` + Whisper (when server set) | ✅ Done |
| **MistakeClassifier (4-tier)** | `window.classifyMistake()` Phase 1 | `features.ts:classifyMistake()` | ✅ Done |
| **STAR Evaluator** | `window.starEval()` Phase 1 | `features.ts:starEval()` | ✅ Done |
| **Prosody Analyzer** | `window.prosodyAnalyze()` Phase 1 | `features.ts:prosodyAnalyze()` + South Asian fillers | ✅ Done |
| **Vocab Diversity** | `window.vocabDiversity()` Phase 1 | `features.ts:vocabDiversity()` | ✅ Done |
| **Pakistani Interviewer Persona** | `window.INTERVIEWER_PROMPT_PAK()` Phase 1 | `features.ts:pakistaniInterviewerPrompt()` + `Mock.tsx` persona | ✅ Done |
| **Company Style Profiles (13+)** | `window.COMPANY_STYLES` Phase 1 | `features.ts:COMPANY_PROFILES` — 14 companies | ✅ Done |
| **Reference Answers** | `window.openRef(qid, mode)` Phase 1 | `features.ts:getRefAnswer()` + `QCard.tsx` Ref button | ✅ Done |
| **Session Markdown Export** | `window.exportSessionMD()` Phase 1 | `Mock.tsx:exportMockSession()` | ✅ Done |
| **AI Lookup Cache** | `window.ibxCacheFactory()` Phase 1 | Dexie `explains` table (cache-first) | ✅ Done (better) |
| **Anki Flashcard Export** | `window.ankiAdd()` Phase 1 | `backup.ts:ankiAdd()` + `ankiAvailable()` | ✅ Done |
| **Agent Memory** | `window.IBX_AGENT_MEM` Phase 1 | `db.kv` + AiStudio context | ✅ Done |
| **Adaptive QBL Curriculum** | `window.qblPickNext()` Phase 1 | `queries.ts:weakestCodes()` + FSRS | ✅ Done (better) |
| **Coaching Strategy Dispatcher** | `window.pickCoachStrategy()` Phase 1 | `features.ts:coachStrategy()` — 9 strategies | ✅ Done |
| **Auto-restart SpeechRecognition** | 55s proactive restart Phase 1 | `speech.ts:listen()` — continuous with restart | ✅ Done |
| **PWA install** | ❌ Not a PWA | `install.ts` + manifest + SW | ✅ Done |
| **Offline support** | Partial (file on localhost) | Workbox precache + offline-first Dexie | ✅ Done (better) |
| **Mobile support** | ❌ Not designed for mobile | React + bottom nav + viewport-fit:cover | ✅ Done |
| **Auth / sign-in** | Manual API key entry | `auth.ts` — Google/OpenRouter OAuth PKCE | ✅ Done |
| **Server mode (Laravel)** | ❌ | `providers.ts:serverCall()` — server holds keys | ✅ New |
| **Vercel deploy** | ❌ | `vercel.json` at workspace root | ✅ Done |
| **Backup/restore** | JSON localStorage dump | `backup.ts` — v7 + v2 format + translation packs | ✅ Done |

---

## What Was Done (Phases Completed)

### Phase A — Question Bank ✅ Complete
| Step | Status | Notes |
|------|--------|-------|
| Extractor script `scripts/extract-v7.mjs` | ✅ | Fixed to capture all parts |
| `public/data/bank.json` generated | ✅ | 2,474 questions from v7 HTML |
| All 2,474 questions extracted | ✅ | All 51 parts included |
| `interview-box-banks-clean.json` merged | ✅ | +7 unique = **2,481 total** |

### Phase B — AI Providers ✅ Complete
| Provider | Status |
|----------|--------|
| Mistral AI | ✅ In `ai.ts` PROVIDERS |
| xAI (Grok) | ✅ In `ai.ts` PROVIDERS |
| Fireworks AI | ✅ In `ai.ts` PROVIDERS |
| All 12 providers route via `openAiStyle()` | ✅ Working |

### Phase C — Intelligence Features ✅ Complete
| Feature | File | Status |
|---------|------|--------|
| `classifyMistake()` | `lib/features.ts:450+` | ✅ Done |
| `starEval()` | `lib/features.ts:545+` | ✅ Done |
| `prosodyAnalyze()` | `lib/features.ts:620+` | ✅ Done |
| `vocabDiversity()` | `lib/features.ts:685+` | ✅ Done |
| `pakistaniInterviewerPrompt()` | `lib/features.ts:735+` | ✅ Done |
| `coachStrategy()` | `lib/features.ts:800+` | ✅ Done |
| `getRefAnswer()` | `lib/features.ts:835+` | ✅ Done |
| COMPANY_PROFILES (14 companies) | `lib/features.ts` | ✅ Done |

### Phase D — Urdu Normalization ✅ Complete
| Component | File | Status |
|-----------|------|--------|
| 71-char URDU_CHAR_NORM map | `lib/lang.ts:223` | ✅ Done |
| `normalizeUrduText()` | `lib/lang.ts:299` | ✅ Done |
| NFC + zero-width removal | `lib/lang.ts:301` | ✅ Done |
| Diacritics stripping | `lib/lang.ts:303` | ✅ Done |
| Wired into translation system | `lib/translate.ts` | ✅ Done |

### Phase E — Company Profiles ✅ Complete
| Company | Status |
|---------|--------|
| Google, Amazon, Meta, Microsoft, ByteDance | ✅ |
| PITB, NADRA | ✅ (Pakistani gov) |
| Arbisoft, NetSol, Systems Ltd, Techlogix, Devsinc | ✅ (Pakistani IT) |
| Tencent | ✅ |
| Profile selector in Progress screen | ✅ Progress.tsx |

### Phase F — Mock Interview Enhancements ✅ Complete
| Enhancement | File | Status |
|-------------|------|--------|
| Pakistani Tech persona (5th persona) | `features/Mock.tsx:23` | ✅ Done |
| `pakistaniInterviewerPrompt()` injected in system prompt | `features/Mock.tsx` | ✅ Done |
| Company style context injection | `features/Mock.tsx` | ✅ Done |
| MistakeClassifier shown per answer | `features/Mock.tsx:494` | ✅ Done |
| STAR score shown per answer | `features/Mock.tsx:504` | ✅ Done |
| Prosody + vocab metrics per answer | `features/Mock.tsx:465` | ✅ Done |
| Markdown export button | `features/Mock.tsx:457,487` | ✅ Done |
| Anki export of weak answers | `features/Mock.tsx:462` | ✅ Done |

### Phase G — QCard Reference Answers ✅ Complete
| Component | File | Status |
|-----------|------|--------|
| `getRefAnswer(q, mode)` function | `lib/features.ts` | ✅ Done |
| 💡 Ref button in action row | `components/QCard.tsx:12,461` | ✅ Done |
| 'single' and 'compare' modes | `components/QCard.tsx` | ✅ Done |
| Cached in `db.explains` | `lib/features.ts` | ✅ Done |
| 🔊 TTS for reference answer | `components/QCard.tsx` | ✅ Done |

### Phase H — Speaking Coach Enhanced Analysis ✅ Complete
| Feature | File | Status |
|---------|------|--------|
| `prosodyAnalyze()` in AnswerTab | `features/Speak.tsx:465` | ✅ Done |
| `vocabDiversity()` in AnswerTab | `features/Speak.tsx:466` | ✅ Done |
| `classifyMistake()` in AnswerTab | `features/Speak.tsx:494` | ✅ Done |
| `starEval()` in AnswerTab | `features/Speak.tsx:504` | ✅ Done |
| WPM + pacing score display | `features/Speak.tsx` | ✅ Done |
| South Asian filler detection (ya, na, means) | `lib/features.ts` | ✅ Done |

### Phase I — Anki Export ✅ Complete
| Component | File | Status |
|-----------|------|--------|
| `ankiAdd(front, back, deck)` | `lib/backup.ts:337` | ✅ Done |
| `ankiAvailable()` — localhost only | `lib/backup.ts:367` | ✅ Done |
| Anki button in Mock result | `features/Mock.tsx:462` | ✅ Done |
| Anki button in QCard | `components/QCard.tsx` | ✅ Done |
| Graceful failure on cloud/mobile | `lib/backup.ts` | ✅ Done |

### Phase J — Vercel Deploy Config ✅ Complete
| File | Status |
|------|--------|
| `vercel.json` at workspace root | ✅ Exists |
| Build command: `cd pwa && npm install && npm run build` | ✅ |
| Output: `pwa/dist` | ✅ |
| SPA fallback route | ✅ |
| Service worker headers (no-cache) | ✅ |
| v7 `/v7` route → `interview-box.html` | ✅ |

---

## PWA Core Features (Online + Offline + Mobile)

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Service Worker** | Workbox via `vite-plugin-pwa`, `generateSW` mode | ✅ |
| **Precache** | All JS/CSS/HTML/SVG/PNG/JSON including bank.json | ✅ |
| **Runtime cache** | `/data/*` StaleWhileRevalidate, `/audio/*` CacheFirst, `/api/v1/*` NetworkFirst 8s | ✅ |
| **Install prompt** | `BeforeInstallPromptEvent` + `install.ts` | ✅ |
| **Update prompt** | `registerType:'prompt'` — user confirms before reload | ✅ |
| **Offline detection** | `navigator.onLine` + event listeners in App.tsx | ✅ |
| **Manifest** | `display:standalone`, theme #1D5C48, 3 shortcuts | ✅ |
| **iOS support** | `viewport-fit:cover`, `navigator.standalone` detection | ✅ |
| **Android support** | Standard PWA install via Chrome | ✅ |
| **Wake Lock** | `speech.ts:requestWakeLock()` during TTS sessions | ✅ |
| **Media Session** | `speech.ts:setMediaSession()` — lock screen controls | ✅ |
| **Offline AI** | Custom provider → Ollama at localhost:11434 | ✅ |
| **Offline questions** | All 1,950 (2,474 pending) precached in service worker | ✅ |
| **Offline translations** | Dexie `translations` table, batch download in Downloads | ✅ |
| **Offline SQL Lab** | `sql.js` asm.js build (no WASM, no network) | ✅ |
| **IndexedDB data** | Dexie v4, 14 tables, version 1 schema | ✅ |
| **Offline-first outbox** | `db.outbox` queues ratings for sync when online | ✅ |

---

## Auth Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| Google sign-in (OpenRouter OAuth PKCE) | `auth.ts:beginGoogleSignIn()` | ✅ |
| OAuth callback handler | `App.tsx:finishSignIn()` | ✅ |
| One-tap banner in Library | `Library.tsx` onboarding banner | ✅ |
| Key storage (localStorage only, never in backup) | `ai.ts:KEYS` | ✅ |
| Server mode (Laravel holds keys) | `providers.ts:serverCall()` | ✅ |
| Sign-out | `auth.ts:signOut()` | ✅ |
| Puter account sign-in | Stubbed (`puterOk` flag) | ⚠️ Stubbed |

---

## AI Features

| Feature | Providers | Status |
|---------|-----------|--------|
| AI text generation | All 12 providers | ✅ |
| Streaming responses (SSE) | server, openai, groq, gemini, anthropic, mistral, xai, fireworks, openrouter | ✅ |
| JSON parsing (loose, fence-tolerant) | `ai.ts:parseJsonLoose()` | ✅ |
| Language routing (Urdu/Hindi/Roman) | `features.ts:ENGLISH_ONLY()` | ✅ |
| Profile injection in prompts | `features.ts:profileBlock()` | ✅ |
| Task routing (quick/translate/grade/explain/interview/chat) | `AiOptions.task` | ✅ |
| AI explain (3 focus × 3 depth modes) | `features.ts:explain()` | ✅ |
| AI grade answer (0-10 + feedback) | `features.ts:gradeAnswer()` | ✅ |
| AI scorecard | `features.ts:mockScorecard()` | ✅ |
| AI speaking feedback | `features.ts:speakingFeedback()` | ✅ |
| AI JD prep pack | `features.ts:jdPrepPack()` | ✅ |
| AI CV↔JD match | `features.ts:cvMatch()` | ✅ |
| AI STAR story builder | `features.ts:buildStory()` | ✅ |
| AI daily plan | `features.ts:planMyDay()` | ✅ |
| AI generate questions | `features.ts:generateQuestions()` | ✅ |
| AI tool-using agent | `features.ts:agentTurn()` | ✅ |
| Pakistani interviewer persona | `features.ts:pakistaniInterviewerPrompt()` | ✅ |
| MistakeClassifier (4-tier) | `features.ts:classifyMistake()` | ✅ |
| STAR Evaluator (4-axis, 100pt) | `features.ts:starEval()` | ✅ |
| Prosody Analyzer + South Asian fillers | `features.ts:prosodyAnalyze()` | ✅ |
| Vocab Diversity | `features.ts:vocabDiversity()` | ✅ |
| Coaching strategy dispatcher (9 types) | `features.ts:coachStrategy()` | ✅ |
| Reference answer (good vs weak) | `features.ts:getRefAnswer()` | ✅ |
| AI cache (Dexie explains table) | `lib/features.ts + db.ts` | ✅ |

---

## Language & Urdu Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| 4 languages: en/ur/ru/hi | `types.ts:Lang` | ✅ |
| RTL support (Urdu) | `.ur` class, `dir=rtl`, Noto Nastaliq | ✅ |
| Devanagari support (Hindi) | `.hi` class | ✅ |
| Urdu char normalization (71 maps) | `lang.ts:normalizeUrduText()` | ✅ |
| Diacritics stripping (tashkeel) | `lang.ts:normalizeUrduText()` | ✅ |
| Modern register substitution | `lang.ts:modern()` | ✅ |
| Roman Urdu normalization | `lang.ts:ruNorm()` | ✅ |
| 260-term pronunciation dictionary | `public/data/dictionary.json` | ✅ |
| AI translation (Urdu/Hindi/Roman) | `translate.ts:translateOne()` | ✅ |
| Free translation fallback (MyMemory) | `translate.ts:machineOne()` | ✅ |
| Translation cache (3000 entries max) | `db.translations` + `TR_LIMIT` | ✅ |
| Batch offline translation download | `translate.ts:translateBatch()` | ✅ |
| 20 hand-written v7 translations | `seed.ts:builtinTranslations()` | ✅ |
| Urdu TTS voice preference | `speech.ts:pickVoice()` | ✅ |
| Tech-term pronunciation fix | `text.ts:enSay()` | ✅ |
| Speechify (English→Urdu script TTS) | `text.ts:speechify()` | ✅ |

---

## What Still Needs Doing

| Task | Priority | Effort | File |
|------|----------|--------|------|
| ~~Extract all 2,474 questions (fix extractor for 6 missing parts)~~ | ✅ Done | | |
| ~~Merge `interview-box-banks-clean.json` (334 KB)~~ | ✅ Done | | |
| ~~AI features not working (server URL override bug)~~ | ✅ Fixed 2026-10-28 | | `lib/providers.ts` |
| ~~OpenRouter 400 on sign-in (sessionStorage PKCE loss)~~ | ✅ Fixed 2026-10-28 | | `lib/auth.ts` |
| ~~Whisper not integrated (only Web Speech API)~~ | ✅ Fixed 2026-10-28 | | `lib/speech.ts` |
| ~~Add experience-year filters (1–6) + question categorization~~ | ✅ Done 2026-10-28 | | `lib/queries.ts`, `lib/seed.ts`, `features/Library.tsx` |
| Puter SDK integration (currently stubbed as `puterOk` flag) | 🟠 Medium | 2h | `lib/auth.ts` |
| Neural TTS server voices (MMS-TTS/Chatterbox) | 🟡 Medium | server-side | — |
| Real phoneme pronunciation scoring | 🟡 Medium | 4h | `lib/speech.ts` |
| PDF resume upload + parsing | 🟡 Medium | 2h | `features/AiStudio.tsx` |
| roman_urdu_map.json merge (30,888 entries) | 🟡 Medium | 1h | `lib/lang.ts` |
| freellmpool auto-failover | 🟡 Medium | 30min | `lib/providers.ts` |
| PAKGOV Q&A (49 questions) | 🟢 Low | 30min | `scripts/extract-v7.mjs` |
| Voice cloning | 🔵 Optional | server-side | — |

---

## Build Output

```
dist/manifest.webmanifest          0.71 kB
dist/index.html                    2.00 kB  (gzip: 0.91 kB)
dist/assets/index-Cu7ALbE5.css    12.63 kB  (gzip: 3.58 kB)
dist/assets/workbox-window.js      5.75 kB  (gzip: 2.36 kB)
dist/assets/fsrs-jDcacSkf.js      21.34 kB  (gzip: 6.64 kB)
dist/assets/react-DShIE1tp.js     50.84 kB  (gzip: 17.86 kB)
dist/assets/db-DQm87uOy.js        97.68 kB  (gzip: 32.86 kB)
dist/assets/index-DQDMTNZc.js  1,753.58 kB  (gzip: 593.30 kB)
Total dist:  ~3.5 MB
Precache:   23 entries, 3615.74 KiB  (includes 2,481 questions)
Build time: ~18 seconds
```

---

## File Map: v7 → PWA

| v7 Function/Global | PWA File | PWA Function/Component |
|--------------------|----------|------------------------|
| `QS` array, `QMAP` | `lib/queries.ts` | `loadLibrary()`, `Filters` |
| `SAMPLE()` | `lib/ai.ts` + `lib/providers.ts` | `aiText()`, `callProvider()` |
| `spRec()` | `lib/speech.ts` | `listen()` |
| `spAnalyse()` | `features/Speak.tsx` | `AnswerTab` component |
| `spMetrics()` | `lib/features.ts` | `speechMetrics()`, `prosodyAnalyze()` |
| `startPlayer()` | `lib/player.ts` + `components/Player.tsx` | `usePlayer`, `PlayerBar` |
| `srsRate()`, `srsDue()` | `lib/fsrs.ts` | `review()`, `dueCount()`, `dueCodes()` |
| `trGet()`, `TR` cache | `lib/translate.ts` | `getOrTranslate()` |
| `openConnect()` | `features/Progress.tsx` | AI Connect sheet |
| `renderMe()` | `features/Progress.tsx` | Progress screen |
| `startMock()` | `features/Mock.tsx` | `Runner` component |
| `openQSheet()`, `openCard()` | `components/QCard.tsx` | `QCard` component |
| `filterQs()`, `rankQs()` | `lib/queries.ts` | `applyFilters()`, `matchesSearch()` |
| `window.classifyMistake` | `lib/features.ts` | `classifyMistake()` |
| `window.starEval` | `lib/features.ts` | `starEval()` |
| `window.prosodyAnalyze` | `lib/features.ts` | `prosodyAnalyze()` |
| `window.vocabDiversity` | `lib/features.ts` | `vocabDiversity()` |
| `window.INTERVIEWER_PROMPT_PAK` | `lib/features.ts` | `pakistaniInterviewerPrompt()` |
| `window.COMPANY_STYLES` | `lib/features.ts` | `COMPANY_PROFILES` |
| `window.openRef` | `lib/features.ts` + `components/QCard.tsx` | `getRefAnswer()` |
| `window.exportSessionMD` | `features/Mock.tsx` | `exportMockSession()` |
| `window.ankiAdd` | `lib/backup.ts` | `ankiAdd()` |
| `window.IBX_AGENT_MEM` | `lib/db.ts` + `features/AiStudio.tsx` | `db.kv` + agent context |
| `window.qblPickNext` | `lib/fsrs.ts` + `lib/queries.ts` | `weakestCodes()` + FSRS |
| `window.pickCoachStrategy` | `lib/features.ts` | `coachStrategy()` |
| `window.normalizeUrdu` | `lib/lang.ts` | `normalizeUrduText()` |
| `window.awaazSpeak` | `lib/speech.ts` | `speakSegments()` |
| `IBX_TR.romanToUrdu` | `lib/translate.ts` + `lib/lang.ts` | via `normalizeUrduText()` + server |
| `labSetup()` | `lib/sqllab.ts` + `features/Lab.tsx` | `openLab()`, `Lab` component |
| `lnSetup()` | `features/Learn.tsx` + `lib/player.ts` | `Learn` + player queue |
| `dlSetup()` | `features/Downloads.tsx` | `Downloads` component |
| `save()` → `localStorage` | `lib/settings.ts` + Dexie | Zustand + Dexie persistence |
| `S.srs` object | `lib/fsrs.ts` Dexie `reviews` table | FSRS `Review` records |
| `S.done`, `S.rate` | Dexie `ratings` table | `Rating` records |
| `S.about`, `S.jd` | `lib/settings.ts` `UserSettings.profile` | Profile Zustand store |

---

## How to Run / Deploy

### Local dev
```bash
cd pwa
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

### Extract questions from v7
```bash
cd pwa
node scripts/extract-v7.mjs ../interview-box.html
# Writes to public/data/bank.json
```

### Build for production
```bash
cd pwa
npm run build        # outputs to pwa/dist/
```

### Deploy to Vercel
```
vercel                       # from workspace root — vercel.json picks up pwa/dist
```
The `vercel.json` at the workspace root handles the build + routing.

### Run old v7 locally (fallback)
```bash
cd /path/to/interview-box
python3 -m http.server 8765
# Open http://localhost:8765/interview-box.html
```

---

*Generated: 2026-10-28 — reflects actual state of pwa/ source tree after `npm run build` success.*
