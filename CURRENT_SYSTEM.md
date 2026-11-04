# Interview Box — Current System Documentation
**Last updated:** 2026-10-22
**System:** `interview-box.html` · 3.43 MB · 2474 questions · localhost:8765
**Whisper server:** `whisper_server.py` · port 5051
**Transliteration:** `ibx-transliteration.js` · 636 KB · 13K dictionary

---

## 1. System Overview

Interview Box is a single-HTML-file interview preparation platform. Everything — questions, AI, speech recognition, transliteration, spaced repetition, SQL practice — lives in one file with no build step, no npm, and no CDN. It runs on `localhost:8765` via a Python HTTP server, with an optional Whisper server on port 5051 for offline speech-to-text.

### Key Numbers

| Metric | Value |
|--------|-------|
| File size | 3.43 MB (budget: 6 MB) |
| Questions in bank | 2474 |
| Transliteration entries | 13,084 Roman→Urdu + 12,956 Urdu→Roman + 501 tech terms |
| Languages | 5 (English, Urdu, Hindi, Roman Urdu, Punjabi) |
| AI providers | 9 (Puter, OpenRouter, Groq, Gemini, Mistral, Ollama, xAI, Fireworks, Anthropic/OpenAI) |
| Views/tabs | 10 (Library, JD Prep, Mock, Speaking Coach, AI Studio, Progress, SQL Lab, Listen, Downloads, Learn) |

---

## 2. Core Features — What Exists and How It Works

### 2.1 Question Bank (Library tab)
**Function:** `QS` array, `QMAP` object, `renderList()`, `filterQs()`, `openQSheet()`, `openCard()`

- 2474 questions stored as JSON in `<script id="bank">` inside the HTML
- Each question: `{id, q, a, t:[tags], f:flags, l:level, s:status, p:part, sq:searchText, sa:searchAnswer}`
- Tags: technology topics (Laravel, React, Redis, SQL, etc.)
- Flags: `c` (most asked), `i` (most important), `h` (how it works), `n` (new 2026), `mine` (user added), `ai` (AI generated), `imp` (imported), `due` (SRS due)
- Levels: `j` (junior), `m` (mid), `s` (senior)
- Parts/categories: from "Your book" (original bank) and "New 2026 bank" (PITB + merged)
- Search: `rankQs()` does term matching with stopword filtering + tech matching + level/status filtering
- Question cards: show question, answer (rendered as HTML with code blocks), tags, difficulty, flags
- Card actions: Listen (TTS), Explain (AI), Mock (start interview), Whiteboard, Common traps, Ask agent

### 2.2 AI System — `SAMPLE()` function
**Function:** `SAMPLE(msgs, opts)` — returns a Promise with AI response text

- Abstraction layer that routes to 9 providers:
  - **Puter** (default, free, no API key) — `puter.com` endpoint
  - **OpenRouter** — user provides API key
  - **Groq** — free tier, fast inference
  - **Gemini** — Google's free tier
  - **Mistral** — free tier
  - **Ollama** — local/offline AI (localhost:11434)
  - **xAI** — Grok
  - **Fireworks** — paid
  - **Anthropic/OpenAI** — paid, user provides key
- AI status indicator (top right): shows "AI" (working), "No AI" (offline), or specific provider
- `SAMPLE.json()` — sends prompt requesting JSON response, parses it
- AI Connect screen (`openConnect()`): user selects provider, enters API key, tests connection
- Language routing: `langRule()` injects instruction to respond in selected language (Urdu/Hindi/Roman Urdu)
- Profile context: `profileCtx()` injects candidate profile + JD into AI prompts

### 2.3 Speech Recognition (Speaking Coach tab)
**Functions:** `spRec()`, `spMetrics()`, `spAnalyse()`, `spRSpeak()`, `spRPhrases()`

- **Browser STT:** `SpeechRecognition` API (Chrome/Edge) via `spRec()`
  - Continuous mode with auto-restart
  - Interim results for real-time display
  - Final results with alternatives + duration + pause count
  - Auto-restart on end (fixes 60s cutoff — enhanced in Phase 1)
- **Whisper STT (offline):** `whisper_server.py` on port 5051
  - OpenAI Whisper models (tiny→large)
  - WAV conversion via ffmpeg
  - Roman Urdu post-processing (80-word hint table)
  - Auto-detect language or manual selection (13 languages)
  - `/health`, `/models`, `/languages`, `/progress` endpoints
  - Threaded mode for concurrent requests
- **Answer analysis** (`spMetrics()`):
  - Words per minute (WPM)
  - Filler word detection (um, uh, like, basically, etc.)
  - Repeated word detection (restarts = nerves indicator)
  - Duration tracking
  - Pause counting
- **AI coaching** (`spAnalyse()`):
  - Sends transcript to AI with speaking coach system prompt
  - AI returns: fluency/clarity/structure scores (0-10), grammar fixes, pronunciation issues, better answer, practice lines, nerves tip
  - Transliteration: auto-detects Roman Urdu → shows Urdu script, or Urdu → shows Roman
- **Phase 1 enhancements** (now active):
  - MistakeClassifier: 4-tier diagnosis (CONCEPTUAL/L4_CEILING/VAGUE/STRUCTURAL)
  - STAR Evaluator: Situation(15) + Task(15) + Action(50) + Result(20) = 100
  - Prosody Analyzer: pacing score (0-100), filler density, rating
  - Vocabulary diversity: unique words ratio + top words + diversity label
- **Phrase library** (`spRPhrases()`):
  - STAR framework templates (5 answer structures)
  - South Asian English corrections (e.g., "I am having" → "I have")
  - Common interview phrases for practice

### 2.4 Text-to-Speech
**Functions:** `pickVoice()`, `speakSeg()`, `startPlayer()`, `spSay()`

- Uses browser `speechSynthesis` API
- Voice selection: `pickVoice(k)` picks best voice for language `k` (en/ur/hi)
  - Voice scoring: natural/neural/premium > Google > local
  - Accent preference: en-IN, en-PK, en-GB, en-US
  - Urdu voice: prefers `ur-PK` locale
- Player: `startPlayer(items, start, label)` — plays sequence of Q&A segments
  - Each segment: language tag + text
  - Auto-advances through list
  - Speed control via `rt` input
  - Pause/resume
- `speakSeg()` — speaks current segment using `SpeechSynthesisUtterance`
- **Phase 1 addition:** Awaaz Urdu TTS (`awaazSpeak()`)
  - Fetches Urdu audio from Edge TTS API (StreamElements proxy)
  - Two voices: Asad (male), Uzma (female)
  - Falls back to browser speechSynthesis on error
  - Activated via `data-awaaz` attribute on elements

### 2.5 Transliteration — `ibx-transliteration.js`
**API:** `window.IBX_TR` (lazy-loaded via `loadTranslit()`)

- **636 KB** file, loaded only on first use
- Dictionaries:
  - `RU2UR`: 13,084 Roman Urdu → Urdu script words
  - `UR2RU`: 12,956 Urdu → Roman Urdu words
  - `TECH_TERMS`: 501 English ↔ Urdu ↔ Roman interview vocabulary triples
- Functions:
  - `IBX_TR.romanToUrdu(text)` — word lookup → variant spellings → char-level digraph fallback
  - `IBX_TR.urduToRoman(text)` — word lookup → position-aware char fallback
  - `IBX_TR.lookupRoman(word)` — single word lookup
  - `IBX_TR.lookupUrdu(word)` — single word lookup
  - `IBX_TR.translateEnToUrdu(word)` — English → {ur, ru}
  - `IBX_TR.findTechTerm(query)` — search tech terms by substring
  - `IBX_TR.stats` — dictionary sizes
- **Phase 1 enhancement:** `IBX_TR.urduToRoman()` now calls `normalizeUrdu()` first
  - NFC normalization
  - Diacritics stripping (tashkeel marks)
  - Zero-width character removal
  - 71 Arabic-variant → canonical Urdu character mappings (from urduhack)

### 2.6 Translation System
**Functions:** `trGet()`, `trGetBest()`, `urToRoman()`, `romanToUrdu()`, `isUrduScript()`

- `TR` object: translations cached in memory + IndexedDB + localStorage
- Translation keys: `id|lang` (e.g., `CB-1|ur`)
- Fallback chain: Roman Urdu → Urdu → Hindi (closest available)
- Auto-generation: if Urdu translation exists but Roman Urdu doesn't, generates via `IBX_TR.urduToRoman()`
- `urToRoman(text)` — delegates to `IBX_TR.urduToRoman()` if loaded, else 80-word stub
- `romanToUrdu(text)` — delegates to `IBX_TR.romanToUrdu()` if loaded, else passthrough
- `isUrduScript(t)` — checks Arabic-range character ratio > 25%
- `detectLang(t)` — auto-detects: Urdu (Arabic chars), Hindi (Devanagari), Roman Urdu (keyword matching), English (default)

### 2.7 Mock Interview
**Function:** `startMock(qs, mode)`

- Modes: `ai` (AI interviewer), `self` (self-practice)
- AI mode: uses `SAMPLE()` with interviewer prompt
  - One question at a time
  - Follow-up questions based on answers
  - Cross-question tracking
  - Timer with optional pressure mode (90s limit)
  - Scorecard at end
- Self mode: sequential question display with answer recording
- Session data: questions, answers, scores, timing
- **Phase 1 addition:** Markdown export (`exportSessionMD()`)
  - Exports session as `.md` file with Q&A, reference answers, scores, summary
  - Activated via `data-export-md` attribute

### 2.8 JD Prep
**Tab:** JD (Job Description preparation)

- Paste job description → AI extracts:
  - Tech stack
  - Likely interview questions
  - AI prep pack (key topics to study)
  - 60-second intro script
- Tech extraction: `matchTech()` matches JD text against known technology tags
- Question prediction: AI generates questions based on JD + candidate profile
- **Phase 1 addition:** Company style profiles (`COMPANY_STYLES`)
  - 13 companies: Google, Amazon, Meta, Microsoft, ByteDance, PITB, NADRA, Arbisoft, NetSol, Systems Ltd, Techlogix, Devsinc, Tencent
  - Each: focus area, interview time, style, tips
  - `companyStyle(name)` — matches company name and returns profile
  - `INTERVIEWER_PROMPT_PAK()` — Pakistani interviewer persona with tech ecosystem context

### 2.9 AI Studio (Agent + Live Interview)
**Tab:** AI

- **Agent:** natural language commands → searches bank, reads progress, saves questions, builds playlists
  - `rankQs()` for question retrieval
  - Tool-calling: search bank, create playlist, mark weak, generate questions
  - Progress summary integration
- **Live interview:** spoken back-and-forth interview
  - 4 interviewer styles
  - Follow-up questions based on answers
  - Hiring scorecard at end
- **Smart review:** SRS scheduling (rate Weak/Okay/Solid → reschedule)
- **CV ↔ JD match:** score + stronger bullets + questions about projects
- **Stories:** turn rough notes into STAR answers
- Card actions: 📐 Whiteboard, ⚠ Common traps, 🤖 Ask agent

### 2.10 Spaced Repetition
**Functions:** `srsRate()`, `srsDue()`, `srsDueList()`

- Rating: 1 (Weak) → 1 day, 2 (Okay) → 3+ days, 3 (Solid) → 7+ days
- Interval grows: `iv = max(7, ceil(prev_iv * 2.5))` for Solid
- Due questions surface in Library with `⏰ Due` flag
- SRS state stored in `S.srs` object in localStorage

### 2.11 SQL Lab
**Tab:** Lab

- Interactive SQLite practice
- `labSetup()` initializes the lab
- Run queries, see results
- Hint system + solution reveal
- 63 SQL-related references in the codebase

### 2.12 Listen Mode
**Tab:** Learn

- Auto-plays question list: English question → Urdu/Hindi explanation → English interview line → memory hook
- `lnSetup()` initializes the player
- Uses `startPlayer()` with language-tagged segments
- Good for commuting/passive learning

### 2.13 Downloads / Offline
**Tab:** DL

- `dlSetup()` manages offline content
- Translation packs: import pre-generated translations for all questions
- Backup/restore: JSON export of all localStorage data
- Works without internet after content is downloaded

### 2.14 Progress Dashboard
**Tab:** Me

- `renderMe()` displays:
  - Practice statistics (questions done, weak/okay/solid counts)
  - Speaking coach history (WPM, fillers, fluency scores)
  - SRS due count
  - Language & audio settings
  - AI provider settings
  - Voice studio (cloned voice import)
  - Backup/restore
  - Translation cache management

### 2.15 State Management
- `var S` — main state object, persisted to `localStorage` key `ibx`
  - `S.lang` — current UI language (en/ur/hi/ru/pa)
  - `S.done` — completed question IDs
  - `S.rate` — question ratings (1=weak, 2=okay, 3=solid)
  - `S.srs` — spaced repetition state
  - `S.about` — candidate profile text
  - `S.jd` — saved job description
  - `S.sel` — selected tech tags
  - `S.flags` — active flag filters
  - `S.imports` — imported question sources
  - `S.hiddenTechs` — hidden technology tags
- `save()` — writes `S` to localStorage
- `var TR` — translation cache (memory + IndexedDB + localStorage)
- `var QS` — question array (parsed from bank JSON)
- `var QMAP` — question lookup by ID
- `var TMAP` — tag map
- `var TECHS` — technology tag list

### 2.16 Internationalization
**Functions:** `applyI18n()`, `setLang()`, `langRule()`

- 5 languages: English, Urdu (RTL, Nastaliq script), Hindi (Devanagari), Roman Urdu, Punjabi
- UI labels: `data-i18n` attributes + `I18N` / `I18N_HI` dictionaries
- AI responses: `langRule()` injects language instruction into AI prompts
- RTL support: `dir="rtl"` + `.ui-ur` class for Urdu
- `urAttr(t)` — adds RTL attributes if text has >30% Arabic characters
- `mdL(t)` — renders markdown with RTL wrapper for Urdu text

---

## 3. Integrations Attached

### 3.1 Phase 1 Enhancements (ACTIVE — patched 2026-10-22)

All Phase 1 features are injected as a `<script>` block before `</body>` and are live.

| # | Feature | Source Project | How It Works | Status |
|---|---------|---------------|-------------|--------|
| 1 | **MistakeClassifier** | Intervity `MistakeClassifier.ts` | `window.classifyMistake(answer)` — 4 tiers (CONCEPTUAL/L4_CEILING/VAGUE/STRUCTURAL) with colored cards, critique, golden response, mental model. Hooked into `spAnalyse()` via `enhanceSpAnalyse()`. | ✅ Active |
| 2 | **STAR Evaluator** | Intervity `StarMethodEvaluator.ts` | `window.starEval(answer)` — scores Situation(15) + Task(15) + Action(50) + Result(20) = 100. Shows progress bars + feedback. Hooked into `spAnalyse()`. | ✅ Active |
| 3 | **Prosody Analyzer** | Intervity `SoftSkillsProsodyAnalyzer.ts` | `window.prosodyAnalyze(text, dur, latency)` — WPM, filler density, pacing score (0-100), rating. Enhanced with South Asian English crutches (ya, na, means). Hooked into `spAnalyse()`. | ✅ Active |
| 4 | **Vocabulary Diversity** | Urdu-English-Word-Frequency-Analyzer | `window.vocabDiversity(text)` — unique word count, ratio, diversity label (Rich/Average/Limited), top 5 words. Hooked into `spAnalyse()`. | ✅ Active |
| 5 | **Pakistani Interviewer Persona** | Intervity `SystemPrompts.ts` | `window.INTERVIEWER_PROMPT_PAK(role, resume, company)` — generates system prompt with Pakistani tech ecosystem (PITB, PASHA, NUST/LUMS, Pakistani English idioms). Ready for Mock `SAMPLE()`. | ✅ Active |
| 6 | **Company Style Profiles** | interview-skills `company-profiles.md` | `window.COMPANY_STYLES` — 13 companies with focus/time/style/tips. `window.companyStyle(name)` matches and returns profile. | ✅ Active |
| 7 | **Reference Answers** | interview-skills `reference-answer.js` | `window.openRef(qid, mode)` — generates model answer via `SAMPLE()`, caches in localStorage. `data-ref` attribute triggers on click. | ✅ Active |
| 8 | **Session Markdown Export** | interview-skills `export-md.js` | `window.exportSessionMD(session)` — builds MD with Q&A, reference answers, scores, summary. Downloads as `.md` file. `data-export-md` attribute. | ✅ Active |
| 9 | **AI Lookup Cache** | dictionariez `localStorageCache.js` + `ai-lookup.js` | `window.ibxCacheFactory(ns, max)` — FIFO cache factory. `window.aiLookup(word, context, cb)` — queued AI explanations with cache. `EXPLAIN_CACHE`, `DICT_CACHE`, `REF_CACHE` pre-created. | ✅ Active |
| 10 | **urduhack Char Normalization** | urduhack `character.py` | `window.normalizeUrduChars(text)` — 71 Arabic-variant → canonical Urdu mappings. `window.removeDiacritics(text)` — strips tashkeel. `window.normalizeUrdu(text)` — combined NFC + diacritics + zero-width + char normalization. Hooked into `IBX_TR.urduToRoman()`. | ✅ Active |
| 11 | **Awaaz Urdu TTS** | Awaaz `urdu_voiceover.py` | `window.awaazSpeak(text, voice)` — fetches Urdu audio from Edge TTS. Voices: Asad (male), Uzma (female). Falls back to browser TTS. `data-awaaz` attribute. | ✅ Active |
| 12 | **Anki Flashcard Export** | dictionariez `ankiwindow.js` | `window.ankiAdd(front, back, deck)` — sends to AnkiConnect (port 6006). `data-anki` attribute. | ✅ Active |
| 13 | **Agent Memory** | Intervity `AgentMemoryRepository.ts` | `window.agentMemRecord(type, content)` — cross-session coaching context in localStorage. Tracks weaknesses, profile, topics. | ✅ Active |
| 14 | **Adaptive QBL Curriculum** | Intervity `QBLEngine.ts` | `window.qblPickNext()` — picks next question targeting weakest tag by mastery rate. `window.getSkillMastery(tag)` / `updateSkillMastery(tag, correct)`. | ✅ Active |
| 15 | **Coaching Strategy Dispatcher** | Intervity `AgentCoachingHarness.ts` | `window.pickCoachStrategy(q)` — picks from 7 strategies (behavioral, engineering, ai_platform, client_perf, staff_elevation, motivational, rotating_fallback). `window.COACH_STRATEGIES` map. | ✅ Active |
| 16 | **Auto-restart SpeechRecognition** | interview-skills `mic-input.js` | Safety timer on `spRec()` — 55s proactive restart for continuous mode. Original `onend` handler already restarts. | ✅ Active |

### 3.2 Previously Integrated (Before Phase 1)

| # | Feature | Source | How It Works | Status |
|---|---------|--------|-------------|--------|
| 17 | **urduify dictionary** | urduify `dataset_1.txt` | 16,091 CSV pairs → 13,084 unique entries in `RU2UR` dict of `ibx-transliteration.js` | ✅ Active |
| 18 | **Transliteration char map** | Transliteration-RomantoUrdu | 48-entry Unicode map → `RO_CHAR_MAP` for char-level fallback | ✅ Active |
| 19 | **ibx-transliteration.js** | Built from urduify + Transliteration | 636 KB lazy-loaded. 7 patches to interview-box.html: `loadTranslit()`, `romanToUrdu()`, upgraded `urToRoman()`, `isUrduScript()`, `trGet()` auto-gen, `spAnalyse()` transliteration, Whisper `onFinal` enhancement | ✅ Active |
| 20 | **Whisper Server v2.0** | `whisper_server.py` | Offline STT on port 5051. WAV conversion, Roman Urdu post-proc, confidence scores, threaded mode, 13 languages, auto-enable detection | ✅ Active |
| 21 | **Bank merge** | `merge-banks.js` | Merged 1950 legacy + 531 PITB → 2474 questions | ✅ Active |
| 22 | **Whisper patches** | `patch-whisper-improvements.js` | 11 patches: WS state, auto-enable, retry, mic UI, language selector, model selector | ✅ Active |
| 23 | **Translation patches** | `patch-translation.js` | `trGet()` fallback chain + `urToRoman()` + auto-generate Roman Urdu from cached Urdu | ✅ Active |

### 3.3 Pending Integration (Not Yet Active)

| # | Feature | Source | What It Adds | Effort | Priority |
|---|---------|--------|-------------|--------|----------|
| 24 | **roman_urdu_map.json merge** | roman-urdu-translator | 30,888 Urdu→Roman entries (2.4× more coverage). Merge into `ibx-transliteration.js` | 1h | 🔴 High |
| 25 | **freellmpool** | OAUTH/freellmpool | 178 free AI routes from 23 providers, auto-failover. Replace puter.com single dependency | 30min | 🔴 Critical |
| 26 | **Ollama models** | OAUTH/Ollama-models | Offline AI (Llama, DeepSeek). AI works with zero internet | 30min | 🔴 Critical |
| 27 | **PAKGOV Q&A import** | PAKGOV-RAG `verified_qa_50.jsonl` | 49 verified Pakistan law Q&A → new question bank category | 30min | 🟠 High |
| 28 | **Neural sentence translation** | roman-urdu-translator ONNX | Full English ↔ Roman Urdu sentence translation in browser (84 MB download) | 1h | 🟡 Medium |
| 29 | **PDF resume parsing** | interview-skills `pdf.min.js` | Upload resume PDF → extract text → JD prep | 2h | 🟡 Medium |
| 30 | **Word hover dictionary** | dictionariez + Free Dictionary API | Double-click word → inline definition tooltip | 2h | 🟡 Medium |
| 31 | **PAKGOV RAG service** | PAKGOV-RAG Streamlit | 6,711 Pakistan law document chunks, hybrid RRF retrieval (R@5=0.74), port 8501 | 30min | 🟡 Medium |
| 32 | **scout-intel-mcp** | OAUTH/scout-intel-mcp | Company/market research for JD analysis (6 intelligence tools) | 2h | 🟢 Later |
| 33 | **Piper offline TTS** | audio-integrations/Piper | Offline TTS for 30+ languages, CPU-only, ONNX models | 4h | 🟢 Later |
| 34 | **VoxCPM studio TTS** | audio-integrations/VoxCPM | 48kHz studio-quality TTS + voice cloning, needs GPU | 2-3 days | 🔵 Optional |
| 35 | **Voice-Pro full pipeline** | audio-integrations/Voice-Pro | Complete audio platform: STT + translate + TTS + clone + demix | 1 week | 🔵 Optional |
| 36 | **Vocal Craft browser TTS** | audio-integrations/Vocal-Craft-Studio | Browser WASM TTS, no server needed, 1.8 GB download | 1 day | 🔵 Optional |
| 37 | **UTRNet Urdu OCR** | UTRNet | Urdu OCR from images/PDFs, PyTorch, port 5052 | 2 days | 🔵 Optional |
| 38 | **IndexedDB session storage** | interview-skills `storage.js` | 3-store IndexedDB for sessions/prefs/creds, prevents localStorage 5MB overflow | 4h | 🔵 Optional |

---

## 4. Architecture

### 4.1 File Structure

```
interview-box/
├── interview-box.html          ← Main app (3.43 MB, 2474 Qs, all JS/CSS inlined)
├── ibx-transliteration.js      ← 636 KB Urdu↔Roman dictionary (lazy-loaded)
├── whisper_server.py          ← Offline STT service (port 5051)
├── start-interview-box-linux.sh ← Startup script
├── merge-banks.js              ← Bank merge script (already run)
├── patch-whisper-improvements.js ← Whisper patches (already applied)
├── patch-translation.js       ← Translation patches (already applied)
├── patch-transliteration.js   ← Transliteration patches (already applied)
├── patch-phase1-enhancements.js ← Phase 1 patches (applied 2026-10-22)
├── interview-box.html.bak-*    ← Backup chain
├── SYSTEM_ENHANCEMENT_ANALYSIS.md ← Consolidated analysis of all 23 projects
├── AUDIO_INTEGRATIONS_ANALYSIS.md ← Audio projects analysis
├── OAUTH_ANALYSIS.md           ← AI gateway projects analysis
└── translkation-INTEGRATIONS/  ← 11 source projects for integration
    ├── MASTER_INTEGRATION.md   ← Single source of truth for integration plan
    ├── urduify/                ← ✅ Integrated (dictionary)
    ├── Transliteration-*/       ← ✅ Integrated (char map)
    ├── roman-urdu-translator/   ← ⏳ Pending (30,888 entries + ONNX)
    ├── urduhack/                ← ✅ Ported (71 char mappings, Phase 1)
    ├── Urdu-English-Word-Freq/ ← ✅ Ported (vocab diversity, Phase 1)
    ├── Intervity/               ← ✅ Ported (analytics + persona, Phase 1)
    ├── interview-skills/        ← ✅ Ported (STT restart, ref answers, MD export, Phase 1)
    ├── dictionariez/            ← ✅ Ported (cache + Anki, Phase 1)
    ├── PAKGOV-RAG-project/      ← ⏳ Pending (49 Q&A + RAG service)
    └── UTRNet/                  ← 🔵 Optional (OCR)
```

### 4.2 Port Assignments

| Service | Port | Status |
|---------|------|--------|
| IBX HTTP server | 8765 | ✅ Always running |
| Whisper STT | 5051 | ✅ When needed |
| freellmpool | 8000 | ⏳ Pending setup |
| Ollama | 11434 | ⏳ Pending setup |
| PAKGOV RAG | 8501 | ⏳ Pending setup |
| UTRNet OCR | 5052 | 🔵 Optional |
| AnkiConnect | 6006 | 🔵 If Anki installed |

### 4.3 Data Flow

```
User speaks answer
    │
    ▼
Whisper STT (port 5051) or browser SpeechRecognition (spRec)
    │
    ▼
Transcript text
    │
    ▼
spAnalyse() ──┬── spMetrics() → WPM, fillers, repeats, pauses
              ├── classifyMistake() → 4-tier diagnosis [Phase 1]
              ├── starEval() → STAR score /100 [Phase 1]
              ├── prosodyAnalyze() → pacing score /100 [Phase 1]
              ├── vocabDiversity() → unique ratio + top words [Phase 1]
              ├── IBX_TR.romanToUrdu() → Urdu script display
              │   └── normalizeUrdu() → NFC + diacritics + char norm [Phase 1]
              └── SAMPLE() → AI coaching feedback
                  └── langRule() → response in user's language
    │
    ▼
Results panel: stats + mistake classification + STAR bars + prosody + vocab + AI feedback + transliteration
    │
    ▼
Persistence: S.ans history + agentMemRecord() + updateSkillMastery() [Phase 1]
    │
    ▼
Optional: exportSessionMD() → .md file [Phase 1]
         ankiAdd() → Anki flashcard [Phase 1]
         qblPickNext() → next question on weakest tag [Phase 1]
```

### 4.4 Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| SpeechRecognition | ✅ | ✅ | ❌ | ❌ |
| speechSynthesis (TTS) | ✅ | ✅ (best Urdu voices) | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |
| Web Audio (Whisper) | ✅ | ✅ | ✅ | ✅ |

---

## 5. What Works Online vs Offline

### Fully Offline (zero internet needed)

| Feature | How |
|---------|-----|
| Question bank (2474 Qs) | Inlined in HTML |
| Whisper STT | Local Python server port 5051 |
| Transliteration (13K dict) | ibx-transliteration.js loaded locally |
| urduhack normalization (71 mappings) | Phase 1 JS, client-side |
| MistakeClassifier / STAR / Prosody / Vocab | Phase 1 JS, client-side |
| Spaced repetition | localStorage |
| SQL Lab | Client-side SQLite |
| Session Markdown export | Client-side file download |
| Anki export | localhost:6006 (AnkiConnect) |
| Agent memory | localStorage |
| Adaptive QBL | localStorage |
| Reference answers | ⚠️ Needs AI (but works with Ollama offline once set up) |
| Company style profiles | Hardcoded in JS |
| Awaaz TTS | ⚠️ Needs internet (but browser TTS works offline) |

### Needs Internet

| Feature | Why | Offline Fallback |
|---------|-----|-----------------|
| AI coaching (SAMPLE) | Routes to cloud providers | Ollama local (pending setup) |
| Puter AI | Cloud API | freellmpool (pending) |
| Awaaz Urdu TTS | Edge TTS cloud API | Browser speechSynthesis |
| Translation auto-gen | Uses AI | Pre-downloaded translation packs |
| Reference answers | Uses AI | Cached in localStorage after first generation |

---

## 6. Backup Chain

```
interview-box.html.bak-phase1-1792613352945  ← Before Phase 1 (original 3.55 MB)
interview-box.html.bak-translit-*            ← Before transliteration patches
interview-box.html.bak-patch-*               ← Before whisper patches
interview-box.html.bak-merge-*               ← Before bank merge
interview-box.html.bak-20261020-182031       ← Original before any changes
```

All backups are in the interview-box directory. To restore: copy a `.bak-*` file over `interview-box.html`.

---

## 7. Pending Work (Next Steps)

### Immediate (high impact, low effort)

1. **roman_urdu_map.json merge** — 30,888 entries → 32K total in ibx-transliteration.js
2. **freellmpool setup** — `pip install freellmpool && freellmpool serve` → replace puter.com
3. **Ollama setup** — install + pull 1 model → offline AI
4. **PAKGOV Q&A import** — 49 verified Q&A → new bank category

### Short-term

5. PDF resume parsing (pdf.min.js lazy load)
6. Word hover dictionary (double-click → tooltip)
7. PAKGOV RAG service (Streamlit port 8501)
8. Neural sentence translation (ONNX 84MB in browser)

### Long-term / Optional

9. Piper offline TTS
10. VoxCPM studio TTS + voice cloning
11. Voice-Pro full audio pipeline
12. UTRNet Urdu OCR
13. IndexedDB session storage
14. scout-intel-mcp company research

---

*This document reflects the system state as of 2026-10-22 after Phase 1 patch was applied.*

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
Summary
  
  ┌────────────────────────────┬────────┬─────────────────────────────────────────┬──────────────────────────────────────┐
  │ Folder                     │ Size   │ Referenced by system?                   │ Verdict                              │
  ├────────────────────────────┼────────┼─────────────────────────────────────────┼──────────────────────────────────────┤
  │ audio-integrations/        │ 393 MB │ No — 0 references in interview-box.html │ Safe to remove                       │
  ├────────────────────────────┼────────┼─────────────────────────────────────────┼──────────────────────────────────────┤
  │ OAUTH/                     │ 33 MB  │ No — 0 references                       │ Safe to remove (but see note)        │
  ├────────────────────────────┼────────┼─────────────────────────────────────────┼──────────────────────────────────────┤
  │ translkation-INTEGRATIONS/ │ 215 MB │ No — 0 references                       │ Mostly safe to remove (but see note) │
  ├────────────────────────────┼────────┼─────────────────────────────────────────┼──────────────────────────────────────┤
  │ v1-interview-box/          │ 4.5 MB │ No — 0 references                       │ Safe to remove                       │
  ├────────────────────────────┼────────┼─────────────────────────────────────────┼──────────────────────────────────────┤
  │ whisper/                   │ 23 MB  │ YES — whisper_server.py line 37         │ DO NOT REMOVE                        │
  └────────────────────────────┴────────┴─────────────────────────────────────────┴──────────────────────────────────────┘
  
  Total reclaimable: ~640 MB
  
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  Detailed Breakdown
  
  1. whisper/ — DO NOT REMOVE (23 MB)
  
  whisper_server.py line 37 does this:
  
  sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "whisper"))
  import whisper
  
  This folder IS the OpenAI Whisper Python package. Removing it breaks offline speech-to-text completely.
  
  2. v1-interview-box/ — Safe to remove (4.5 MB)
  
  Old version of interview-box.html (3.27 MB, dated Jan 1980) plus old bank import scripts and markdown study guides. The banks were
  already merged into the current 2474-question bank via merge-banks.js. Nothing references this folder.
  
  3. audio-integrations/ — Safe to remove (393 MB)
  
  5 TTS/voice projects (Awaaz, Piper, VoxCPM, Voice-Pro, Vocal Craft Studio). Zero references in interview-box.html. The Awaaz Urdu TTS
  functionality was already ported as JavaScript in the Phase 1 patch. These are just source repos for reference.
  
  4. OAUTH/ — Safe to remove (33 MB)
  
  7 AI gateway projects (freellmpool, free-ai-gateway, awesome-freellm-apis, etc.). Zero references in interview-box.html. These are
  source/reference repos.
  
  Note: If you plan to set up freellmpool + Ollama (pending task #4), you'd need to pip install freellmpool anyway — it comes from
  PyPI, not this folder. So removing this folder doesn't block that work.
  
  5. translkation-INTEGRATIONS/ — Mostly safe to remove (215 MB)
  
  11 source projects. Zero references in interview-box.html or ibx-transliteration.js. Everything that was needed has already been
  extracted and ported:
  - urduify dictionary → already in ibx-transliteration.js (13K words)
  - urduhack 71 mappings → already ported in Phase 1 patch
  - Intervity analytics → already ported in Phase 1 patch
  - interview-skills features → already ported in Phase 1 patch
  - dictionariez patterns → already ported in Phase 1 patch
  
  Two pending items still need data from this folder:
  - roman-urdu-translator/roman_urdu_map.json (30,888 entries) — not yet merged into ibx-transliteration.js
  - PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl (49 Q&A) — not yet imported to question bank
  
  If you want to keep those two pending tasks possible, copy these two files out first:
  
  cp translkation-INTEGRATIONS/roman-urdu-translator/roman_urdu_map.json .
  cp translkation-INTEGRATIONS/PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl .
  
  Then remove the whole folder.
  
  6. Already-run patch scripts — Safe to remove
  
  These have already been applied and their changes are baked into interview-box.html:
  - merge-banks.js (11 KB)
  - patch-whisper-improvements.js (29 KB)
  - patch-translation.js (3.6 KB)
  - patch-transliteration.js (13 KB)
  - patch-phase1-enhancements.js (49 KB)
  
  Keep them only if you want documentation of what was patched.
  
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  
  Commands to Clean Up
  
  If you want to reclaim ~640 MB, run these:
  
  cd "/home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box"
  
  # Save the two pending data files first
  cp translkation-INTEGRATIONS/roman-urdu-translator/roman_urdu_map.json .
  cp translkation-INTEGRATIONS/PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl .
  
  # Remove the 4 safe-to-delete folders
  rm -rf audio-integrations OAUTH translkation-INTEGRATIONS v1-interview-box
  
  # DO NOT remove whisper/ — whisper_server.py needs it
  
  Want me to run these commands? I'll confirm before deleting since this is irreversible.
 