# Interview Box — System Enhancement Analysis
## Consolidated View of All 23 Integration Projects Across 3 Domains

**Prepared:** 2026-10-22
**System:** `interview-box.html` · 2474 questions · localhost:8765 · whisper port 5051
**Current size:** 3.55 MB (budget: 6 MB)
**Scope:** audio-integrations (5 projects) + OAUTH/AI-gateway (7 projects) + translation-INTEGRATIONS (11 projects)

---

## 1. Executive Summary

Interview Box is a single-HTML-file interview preparation platform with 2474 questions,
offline Whisper STT, Urdu/Hindi/Roman-Urdu transliteration, and AI coaching via `puter.com`.
The three integration folders contain **23 open-source projects** that transform it from a
question-bank app into a **fully offline, multilingual, AI-powered interview coaching system**
with voice synthesis, neural translation, legal knowledge retrieval, and free LLM routing.

### The Three Domains and Their Roles

| Domain | Projects | Core Mission | Primary Enhancement |
|--------|----------|-------------|---------------------|
| **Audio** (`audio-integrations/`) | 5 | Voice pipeline: TTS, STT, cloning, dubbing | Speak questions aloud · transcribe answers · clone interviewer voice |
| **AI Gateway** (`OAUTH/`) | 7 | Free, reliable LLM access without puter.com | Replace single AI dependency with 178-route failover pool + offline models |
| **Translation & Intelligence** (`translkation-INTEGRATIONS/`) | 11 | Urdu NLP, interview analytics, knowledge base | Deep Urdu support · answer scoring · STAR evaluation · Pakistan law RAG |

### What Interview Box Looks Like After All Integrations

```
                        ┌─────────────────────────────────────────┐
                        │        INTERVIEW BOX (localhost:8765)     │
                        │                                           │
                        │  2474 Qs · Mock Interview · Speaking Coach│
                        │  JD Prep · SQL Lab · Spaced Repetition    │
                        └──────────────┬──────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌─────────────────┐     ┌──────────────────────┐    ┌─────────────────────────┐
│  AI GATEWAY     │     │   AUDIO PIPELINE      │    │  LANGUAGE & INTELLIGENCE │
│  (7 projects)   │     │   (5 projects)        │    │  (11 projects)           │
│                 │     │                      │    │                          │
│ freellmpool     │     │ Awaaz (Urdu TTS)     │    │ ibx-transliteration.js   │
│ free-ai-gateway │     │ Piper (offline TTS)  │    │ roman-urdu-translator    │
│ Ollama-models   │     │ VoxCPM (studio TTS)  │    │ urduhack (normalization) │
│ scout-intel-mcp │     │ Voice-Pro (pipeline) │    │ Intervity (analytics)    │
│ + catalogs      │     │ Vocal Craft (browser)│    │ interview-skills (UX)    │
│                 │     │                      │    │ dictionariez (dictionary) │
│ 178 routes      │     │ STT → TTS → Clone    │    │ PAKGOV-RAG (law Q&A)      │
│ 23 providers    │     │ Dub → Demix          │    │ UTRNet (OCR)             │
│ + offline Ollama│     │                      │    │                          │
└────────┬────────┘     └──────────┬───────────┘    └───────────┬──────────────┘
         │                         │                            │
         └─────────────────────────┼────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     ENHANCED USER FLOW         │
                    │                                │
                    │  1. AI asks question (TTS)     │
                    │  2. User answers (STT)         │
                    │  3. Transliterate Roman↔Urdu   │
                    │  4. Score: STAR + Mistakes     │
                    │  5. AI feedback (free LLM)     │
                    │  6. Export to MD/Anki          │
                    └──────────────────────────────┘
```

---

## 2. Domain 1 — Audio Pipeline (5 Projects)

### 2.1 Current State of Audio in Interview Box

| Capability | Current Implementation | Status |
|-----------|----------------------|--------|
| Text-to-speech | `speechSynthesis` (browser API) | ✅ Works, limited voices |
| Speech-to-text | Whisper server (port 5051) | ✅ Offline, Roman Urdu post-proc |
| Voice cloning | None | ❌ Not available |
| Audio cleanup | None | ❌ Not available |
| Dubbing/translation | None | ❌ Not available |
| Urdu TTS | Browser Urdu voice (if installed) | ⚠️ Unreliable |

### 2.2 What the 5 Audio Projects Add

| # | Project | Type | What It Does | Offline? | Effort | Key Enhancement |
|---|---------|------|-------------|----------|--------|-----------------|
| 1 | **Awaaz** | TTS | Urdu TTS via Microsoft Edge API | ❌ Cloud | ⭐ | "🔊 Read in Urdu" button — 2 voices (Asad/Uzma) |
| 2 | **Piper** | TTS | Fast ONNX-based TTS, 30+ languages | ✅ CPU | ⭐⭐ | Offline TTS fallback — Urdu/Hindi voices without internet |
| 3 | **VoxCPM** | TTS + Clone | 2B-param model, 48kHz, emotion control, voice design | ✅ GPU | ⭐⭐⭐⭐ | Studio-quality TTS + clone real interviewer voice |
| 4 | **Voice-Pro** | Full pipeline | Whisper STT + translation + TTS + cloning + demix + YouTube dubbing | ✅ Local | ⭐⭐⭐⭐⭐ | Replace entire audio stack — most powerful single project |
| 5 | **Vocal Craft Studio** | TTS (browser) | WASM-based Hindi/English TTS, zero-shot cloning | ✅ WASM | ⭐⭐ | No server needed — runs in browser tab |

### 2.3 How They Work Together

The 5 projects form a **quality/complexity ladder** — each tier adds capabilities:

```
Tier 1 (immediate, 2 hours):
  Awaaz → read questions in Urdu with natural voice
         Cloud API, free, no key, 2 voices

Tier 2 (offline fallback, 4 hours):
  Piper → same capability but fully offline
         30+ languages, CPU-only, ONNX models

Tier 3 (browser-native, 1 day):
  Vocal Craft Studio → Hindi+English TTS in browser
         WASM, no server, 1.8 GB download once

Tier 4 (studio quality, 2-3 days):
  VoxCPM → 48kHz studio TTS + voice cloning from text description
         Emotion control, 30 languages, needs GPU

Tier 5 (complete pipeline, 1 week):
  Voice-Pro → everything above + STT + translation + dubbing + demix
         Full audio platform, replaces all other audio tools
```

### 2.4 Concrete Enhancements to Interview Box

| Enhancement | Source Project | User-Facing Feature |
|-------------|---------------|---------------------|
| **Read question aloud in Urdu** | Awaaz / Piper | 🔊 button on question cards |
| **Read AI feedback aloud** | Piper / VoxCPM | Audio feedback in coaching view |
| **Transcribe user speech faster** | Voice-Pro (Faster-Whisper) | Replace current Whisper with faster variant |
| **Clone a real interviewer's voice** | VoxCPM / Voice-Pro | AI coach speaks in a familiar Pakistani accent |
| **Clean background noise from recordings** | Voice-Pro (demix) | Better transcription quality |
| **Offline TTS for all languages** | Piper | Works without internet |
| **Browser-only TTS** | Vocal Craft Studio | No Python server needed |

### 2.5 Online vs Offline Matrix — Audio

| Capability | Online | Offline | Project |
|-----------|--------|---------|---------|
| Urdu TTS | ✅ Awaaz (cloud API) | ✅ Piper (ONNX) | Awaaz + Piper |
| Hindi TTS | ✅ Cloud voices | ✅ Vocal Craft (WASM) | Vocal Craft |
| English TTS | ✅ Browser built-in | ✅ Piper | Browser + Piper |
| Studio-quality TTS | ✅ Cloud TTS APIs | ✅ VoxCPM (GPU) | VoxCPM |
| Voice cloning | ✅ Cloud APIs | ✅ Voice-Pro/VoxCPM | Voice-Pro |
| Speech-to-text | ✅ Cloud STT | ✅ Whisper server (current) | Whisper + Voice-Pro |
| Audio demixing | ✅ Cloud services | ✅ Voice-Pro (local) | Voice-Pro |
| Translation dubbing | ✅ Cloud | ✅ Voice-Pro (local) | Voice-Pro |

---

## 3. Domain 2 — AI Gateway / Free LLM Access (7 Projects)

### 3.1 Current State of AI in Interview Box

Interview Box relies on `puter.com` for all AI features — the AI coach, answer generation,
question explanation, and JD analysis all route through a single endpoint. When that fails
(no internet, DNS issue, rate limit), the entire AI layer goes dark.

| AI Feature | Current Implementation | Vulnerability |
|-----------|----------------------|-------------|
| AI coach | `SAMPLE()` → puter.com | Single point of failure |
| Answer generation | `SAMPLE()` → puter.com | Rate limited |
| Question explanation | `SAMPLE()` → puter.com | No offline fallback |
| JD analysis | `SAMPLE()` → puter.com | One provider = one outage away |

### 3.2 What the 7 Gateway Projects Add

| # | Project | Type | What It Does | Offline? | Key Enhancement |
|---|---------|------|-------------|----------|-----------------|
| 1 | **freellmpool** | Proxy | 178 chat routes from 23 providers, one endpoint, keyless start | ⚠️ Online + Ollama offline | Replace puter.com with 178-route failover pool |
| 2 | **free-ai-gateway** | Router | TypeScript proxy, 20 providers, circuit breaker, MCP server | ⚠️ Online + Ollama | Enterprise-grade routing with failover |
| 3 | **awesome-freellm-apis** | Catalog | 516+ free LLM APIs with config snippets, updated daily | 📖 Reference | Know which provider to use and how |
| 4 | **awesome-free-ai-coding** | Catalog | 86 free AI coding offers probed twice weekly + litellm config | 📖 Reference | Live-checked list of what actually works |
| 5 | **scout-intel-mcp** | MCP server | 6 intelligence tools: company research, market intel, news | ❌ Online | Enrich JD analysis with real company data |
| 6 | **Ollama-models** | Local models | Pre-packaged Llama, DeepSeek, Mistral, etc. | ✅ 100% offline | AI works with zero internet |
| 7 | **claude-opus-dev-workbench** | Browser tool | AI coding workbench companion | ❌ Online | Development companion, not user-facing |

### 3.3 How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│                    AI REQUEST FROM IBX                         │
│              (AI coach, answer gen, JD analysis)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Choose provider layer  │
              │  (awesome-freellm-apis)  │ ← Reference: which API to use
              │  (awesome-free-ai-coding)│ ← Live status checks
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Routing layer           │
              │  freellmpool (178 routes)│ ← Primary: one endpoint, auto-failover
              │  free-ai-gateway (20)    │ ← Alternative: enterprise router
              └────────────┬───────────┘
                           │
              ┌────────────┴───────────┐
              │                        │
              ▼                        ▼
    ┌─────────────────┐    ┌──────────────────┐
    │  Cloud providers │    │  Local models     │
    │  (23 providers)  │    │  Ollama-models    │
    │  Online only      │    │  100% offline     │
    └─────────────────┘    └──────────────────┘
              │
              ▼ (if online + researching companies)
    ┌─────────────────┐
    │  scout-intel-mcp │
    │  Company/market  │
    │  research        │
    └─────────────────┘
```

### 3.4 Concrete Enhancements to Interview Box

| Enhancement | Source Project | Impact |
|-------------|---------------|--------|
| **Eliminate puter.com dependency** | freellmpool | 178 routes → if one fails, next takes over |
| **Work offline with AI** | Ollama-models | AI coach works with no internet (local Llama/DeepSeek) |
| **Company research for JD prep** | scout-intel-mcp | Pull real company info before mock interview |
| **Know which free API to use** | awesome-freellm-apis | 516+ catalogued configs, no guessing |
| **Enterprise-grade failover** | free-ai-gateway | Circuit breaker + automatic provider switching |
| **Live-checked availability** | awesome-free-ai-coding | Know what is actually working this week |

### 3.5 The #1 Change — 1 Minute to Execute

```bash
pip install freellmpool && freellmpool serve
```

Then change Interview Box's AI URL from `puter.com` to `http://localhost:8000/v1`.
Instantly gets 178 free AI routes, auto-failover, no credit card. With Ollama added
as a backend, the system works even without internet.

### 3.6 Online vs Offline Matrix — AI Gateway

| Capability | Online | Offline | Project |
|-----------|--------|---------|---------|
| Free LLM chat | ✅ 23 cloud providers (178 routes) | ✅ Ollama local models | freellmpool + Ollama |
| Enterprise routing | ✅ 20 providers + circuit breaker | ✅ Ollama backend | free-ai-gateway |
| Company research | ✅ scout-intel-mcp (6 tools) | ❌ Needs internet | scout-intel-mcp |
| Provider catalog | ✅ Live-updated list | 📖 Static copy | awesome-freellm-apis |
| Coding AI | ✅ 86 checked offers | ✅ Ollama coding models | awesome-free-ai-coding |
| AI model hosting | N/A | ✅ 100% local (Llama, DeepSeek) | Ollama-models |
| Dev workbench | ✅ Browser-based | ❌ Needs API access | claude-opus-dev-workbench |

---

## 4. Domain 3 — Translation & Intelligence (11 Projects)

### 4.1 Current State of Language & Intelligence in Interview Box

| Capability | Current Status | Gap |
|-----------|---------------|-----|
| Roman Urdu → Urdu script | ✅ ibx-transliteration.js (13K words) | Only 12,956 UR→Roman entries |
| Urdu → Roman Urdu | ✅ 12,956 entries | Misses 30K+ words in roman_urdu_map.json |
| Urdu character normalization | ⚠️ NFC only | Arabic-variant characters fail silently |
| Answer quality scoring | ⚠️ Basic (WPM, fillers) | No STAR, no mistake classification |
| Interviewer persona | ⚠️ Generic | No Pakistani tech context |
| Reference answers | ❌ Not available | No model answers for comparison |
| Session export | ⚠️ JSON only | No Markdown, no Anki |
| Company-specific prep | ❌ Not available | No Google/Amazon/PITB style profiles |
| PDF resume parsing | ❌ Not available | Can't upload resume PDF |
| Pakistan law knowledge | ❌ Not available | No government document RAG |
| Urdu OCR | ❌ Not available | Can't read Urdu from images |

### 4.2 What the 11 Projects Add — Organized by Layer

#### Layer 1: Language / Urdu NLP (6 projects)

| # | Project | Status | What It Adds | Offline? |
|---|---------|--------|-------------|---------|
| 1 | **urduify** | ✅ Integrated | 16K Roman↔Urdu dictionary + 501 interview vocab triples | ✅ |
| 2 | **Transliteration-RomantoUrdu** | ✅ Integrated | 48-char Unicode mapping for char-level fallback | ✅ |
| 3 | **ibx-transliteration.js** | ✅ Built + Live | 13K dict, `window.IBX_TR` API, 7 patches to IBX | ✅ |
| 4 | **roman-urdu-translator** | ⏳ Merge | 30,888 Urdu→Roman entries (2.4× more) + ONNX neural model | ✅ |
| 5 | **urduhack** | ⏳ Port | 71 Arabic-variant→canonical Urdu char mappings | ✅ |
| 6 | **Word-Freq-Analyzer** | ⏳ Port | Word frequency + vocabulary diversity scoring | ✅ |

**Combined effect:** Transliteration dictionary grows from 12,956 → 32,000+ entries.
Arabic-variant Urdu text (from WhatsApp, websites, phones) stops failing silently.
Neural translation handles unseen words via BPE subword tokenization.

#### Layer 2: Interview Intelligence (3 projects)

| # | Project | Status | What It Adds | Offline? |
|---|---------|--------|-------------|---------|
| 7 | **Intervity** | ⏳ Port to JS | MistakeClassifier (4 tiers), STAR evaluator, prosody analyzer, 11 coaching strategies, Pakistani persona, adaptive curriculum, agent memory | ✅ All JS |
| 8 | **interview-skills** | ⏳ Port to JS | Auto-restart STT (fixes 60s cutoff), reference answers + good/bad, Markdown export, company style profiles, PDF resume parsing, IndexedDB storage | ✅ All JS |
| 9 | **dictionariez** | ⏳ Port patterns | AI lookup with dual cache, Anki flashcard export, word hover dictionary, localStorage cache factory | ✅ All JS |

**Combined effect:** Answer analysis goes from basic WPM/fillers to full MistakeClassifier
+ STAR + prosody + vocabulary diversity. Mock interview gets Pakistani interviewer persona
and company-specific style profiles. Questions get reference answers. Sessions export to
Markdown and Anki. SpeechRecognition stops cutting out after 60 seconds.

#### Layer 3: Knowledge Base (1 project)

| # | Project | Status | What It Adds | Offline? |
|---|---------|--------|-------------|---------|
| 10 | **PAKGOV-RAG** | ⏳ Integration | 6,711 chunks from Pakistan Constitution, PPC, CrPC, ESTACODE, Senate Rules. 50 verified Q&A. Hybrid RRF retrieval R@5=0.74. Bilingual En+Ur retrieval (similarity 0.837) | ✅ FAISS local |

**Combined effect:** AI coach can answer Pakistan governance/law questions with citations
from official government documents. 50 verified Q&A can be imported directly into the
question bank as a new "Pakistan Governance & Law" category.

#### Layer 4: Input / OCR (1 project)

| # | Project | Status | What It Adds | Offline? |
|---|---------|--------|-------------|---------|
| 11 | **UTRNet** | 🔵 Optional | Urdu OCR — read printed Urdu text from images/PDFs. 180 glyphs, HRNet+DBiLSTM+CTC | ✅ PyTorch local |

**Combined effect:** Scanned Urdu resumes, whiteboard photos, and government PDFs with
embedded images become searchable text. Enables Urdu resume upload for JD↔CV matching.

### 4.3 How They Work Together

```
User speaks answer
    │
    ▼
┌─────────────────────────────────────────────┐
│ Whisper STT (port 5051)                       │
│ + roman-urdu-translator roman_hint (32K words)│  ← Layer 1: transliteration
│ + urduhack char normalization (71 mappings)    │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ spAnalyse() — Answer Quality Scoring          │
│ ├── Word-Freq-Analyzer → vocabulary diversity │  ← Layer 1: analytics
│ ├── Intervity Prosody → WPM, fillers, pauses  │  ← Layer 2: intelligence
│ ├── Intervity MistakeClassifier → 4 tiers     │  ← Layer 2: intelligence
│ └── Intervity STAR Evaluator → behavioral     │  ← Layer 2: intelligence
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ IBX_TR.romanToUrdu() → show Urdu script       │
│ + urduhack normalization → accurate lookup    │  ← Layer 1: transliteration
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ AI Feedback (via freellmpool/Ollama)          │  ← Domain 2: AI gateway
│ + Pakistani interviewer persona              │  ← Layer 2: Intervity prompts
│ + Company style profile (Google/PITB/etc)    │  ← Layer 2: interview-skills
│ + PAKGOV RAG context (if law question)       │  ← Layer 3: knowledge base
│ + Coaching strategy (11 types)              │  ← Layer 2: Intervity strategies
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│ Output & Persistence                           │
│ ├── TTS: read feedback aloud (Awaaz/Piper)    │  ← Domain 1: audio
│ ├── Export session as Markdown                │  ← Layer 2: interview-skills
│ ├── Add Q&A to Anki flashcards                │  ← Layer 2: dictionariez
│ ├── Agent memory: track weak topics           │  ← Layer 2: Intervity
│ └── Adaptive QBL: next question targets weak  │  ← Layer 2: Intervity
└─────────────────────────────────────────────┘
```

### 4.4 Online vs Offline Matrix — Translation & Intelligence

| Capability | Online | Offline | Project(s) |
|-----------|--------|---------|-----------|
| Roman→Urdu transliteration | ✅ (N/A — client-side) | ✅ 13K dict in browser | ibx-transliteration.js |
| Urdu→Roman transliteration | ✅ (N/A — client-side) | ✅ 32K dict after merge | roman-urdu-translator |
| Neural sentence translation | ✅ Cloud translation | ✅ ONNX 84MB in browser | roman-urdu-translator |
| Urdu char normalization | ✅ (N/A — client-side) | ✅ 71 mappings in JS | urduhack |
| Word frequency analysis | ✅ (N/A — client-side) | ✅ Pure JS | Word-Freq-Analyzer |
| Answer scoring (STAR/mistakes) | ✅ (N/A — client-side) | ✅ Pure JS | Intervity |
| Reference answers | ✅ Needs LLM | ✅ Via Ollama | interview-skills + AI gateway |
| Company style profiles | ✅ (N/A — static data) | ✅ Hardcoded in JS | interview-skills |
| PDF resume parsing | ✅ (N/A — client-side) | ✅ pdf.min.js (WASM) | interview-skills |
| Pakistan law Q&A | ✅ PAKGOV RAG service | ✅ FAISS local | PAKGOV-RAG |
| Urdu OCR | ✅ (N/A — local) | ✅ PyTorch local | UTRNet |
| Anki export | ✅ (N/A — local API) | ✅ AnkiConnect (localhost:6006) | dictionariez |
| Dictionary lookup | ✅ Free Dictionary API | ✅ Cached locally | dictionariez |
| Agent memory | ✅ (N/A — localStorage) | ✅ Pure JS | Intervity |

---

## 5. Cross-Domain Interactions — Where All 3 Areas Meet

### 5.1 The Complete Interview Cycle

This is how a single mock interview session touches all three domains:

```
1. QUESTION PHASE
   ┌─ Translation: ibx-transliteration.js renders question in Urdu script
   ├─ Audio: Awaaz/Piper reads question aloud in Urdu
   └─ AI: freellmpool/Ollama generates the question (if dynamic)

2. ANSWER PHASE
   ┌─ Audio: Whisper STT transcribes spoken answer
   ├─ Translation: roman-urdu-translator normalizes Roman Urdu
   ├─ Translation: urduhack fixes Arabic-variant characters
   └─ Translation: Word-Freq-Analyzer counts vocabulary diversity

3. ANALYSIS PHASE (all client-side, no internet needed)
   ┌─ Translation: Intervity MistakeClassifier → 4-tier diagnosis
   ├─ Translation: Intervity STAR Evaluator → behavioral score
   ├─ Translation: Intervity Prosody Analyzer → WPM + fillers
   └─ Translation: ibx-transliteration.js shows Urdu script version

4. FEEDBACK PHASE
   ┌─ AI: freellmpool routes to best free LLM (or Ollama offline)
   ├─ Translation: Intervity Pakistani persona + coaching strategy
   ├─ Translation: interview-skills company style profile
   ├─ Translation: PAKGOV-RAG context (if law/governance question)
   ├─ AI: scout-intel-mcp enriches with real company data
   └─ Audio: Piper/VoxCPM reads feedback aloud

5. PERSISTENCE PHASE
   ┌─ Translation: interview-skills exports session as Markdown
   ├─ Translation: dictionariez exports Q&A to Anki flashcards
   ├─ Translation: Intervity agent memory tracks weak topics
   └─ Translation: Intervity QBL schedules next question on weak area
```

### 5.2 Critical Dependency: AI Gateway Unlocks Everything

The AI gateway is the **keystone** — without it, 3 of the most valuable translation-layer
features cannot work offline:

| Feature | Needs AI? | Works Offline Today? | Works Offline After Gateway? |
|---------|-----------|----------------------|---------------------------|
| Reference answers | ✅ LLM call | ❌ (puter.com needs internet) | ✅ (Ollama local) |
| AI coaching feedback | ✅ LLM call | ❌ | ✅ (Ollama local) |
| Dynamic question generation | ✅ LLM call | ❌ | ✅ (Ollama local) |
| PAKGOV RAG grounded answers | ✅ LLM call | ❌ | ✅ (Ollama local) |
| MistakeClassifier | ❌ Pure JS | ✅ Already works | ✅ Already works |
| STAR Evaluator | ❌ Pure JS | ✅ Already works | ✅ Already works |
| Transliteration | ❌ Pure JS | ✅ Already works | ✅ Already works |
| TTS (Awaaz) | ❌ (cloud API) | ❌ | ❌ (but Piper covers offline) |

**Conclusion:** Deploy freellmpool + Ollama first. It is the one change that makes the
entire system work without internet.

### 5.3 Architecture: All 3 Domains Compose Without Overlap

No project in any domain duplicates a project in another domain. They fill complementary roles:

| Concern | Audio Domain | AI Gateway Domain | Translation Domain |
|---------|-------------|-------------------|-------------------|
| **Input** | Whisper STT (voice→text) | — | UTRNet OCR (image→text) |
| **Processing** | Voice-Pro demix/cleanup | freellmpool routing | Intervity scoring + urduhack normalization |
| **Intelligence** | — | Ollama LLM + scout-intel | Intervity strategies + PAKGOV RAG |
| **Output** | Awaaz/Piper TTS (text→voice) | — | ibx-transliteration.js (Roman↔Urdu) |
| **Persistence** | — | — | interview-skills MD export + dictionariez Anki |

---

## 6. Complete Project Inventory (All 23 Projects)

### 6.1 By Status

| Status | Count | Projects |
|--------|-------|----------|
| ✅ Done/Integrated | 4 | urduify, Transliteration-*, ibx-transliteration.js, (whisper_server current) |
| ⏳ Next (pending) | 15 | Awaaz, Piper, roman-urdu-translator, urduhack, Word-Freq-Analyzer, Intervity, interview-skills, dictionariez, PAKGOV-RAG, freellmpool, free-ai-gateway, scout-intel-mcp, Ollama-models, awesome-freellm-apis, awesome-free-ai-coding |
| 🔵 Optional/Later | 4 | VoxCPM, Voice-Pro, Vocal Craft Studio, UTRNet, claude-opus-dev-workbench |

### 6.2 By Impact Tier

| Impact | Projects | Why |
|--------|----------|-----|
| 🔴 **Critical** (fixes core dependency) | freellmpool, Ollama-models | Eliminates puter.com single point of failure |
| 🟠 **High** (major new features) | Intervity, interview-skills, PAKGOV-RAG, Awaaz, Piper, roman-urdu-translator | Answer scoring, ref answers, law Q&A, Urdu TTS, 32K dict |
| 🟡 **Medium** (quality improvements) | urduhack, Word-Freq-Analyzer, dictionariez, free-ai-gateway, scout-intel-mcp | Normalization, vocab stats, Anki export, routing, company intel |
| 🟢 **Nice-to-have** | VoxCPM, Voice-Pro, Vocal Craft, UTRNet, awesome catalogs, claude workbench | Studio TTS, full pipeline, browser TTS, OCR, references |

### 6.3 By Online/Offline Capability

```
FULLY OFFLINE (works with zero internet):
├── ibx-transliteration.js (13K dict, client-side)
├── roman-urdu-translator (ONNX 84MB, browser)
├── urduhack (71 mappings, JS port)
├── Word-Freq-Analyzer (20 lines JS)
├── Intervity analytics (STAR, MistakeClassifier, Prosody — all JS)
├── Intervity coaching strategies (11 types, JS)
├── interview-skills (auto-restart STT, MD export, company profiles — all JS)
├── dictionariez (cache factory, Anki export — JS)
├── Piper TTS (ONNX models, CPU)
├── Vocal Craft Studio (WASM, browser)
├── Whisper STT (current, port 5051)
├── PAKGOV-RAG (FAISS local index)
├── UTRNet OCR (PyTorch local)
└── Ollama-models (local LLM inference)

NEEDS INTERNET (cloud-dependent):
├── Awaaz TTS (Microsoft Edge API)
├── freellmpool (routes to 23 cloud providers — but has Ollama fallback)
├── free-ai-gateway (routes to 20 cloud providers — but has Ollama fallback)
├── scout-intel-mcp (web search, news, company research)
├── awesome-freellm-apis (reference site)
├── awesome-free-ai-coding (live probing)
└── claude-opus-dev-workbench (browser API calls)

PARTIALLY OFFLINE (cloud preferred, local fallback):
├── freellmpool + Ollama (cloud first, Ollama when offline)
├── dictionariez dictionary lookup (free API, cached locally)
└── PAKGOV-RAG (retrieval offline, answer generation needs LLM)
```

---

## 7. Unified Priority Roadmap

### Phase 0 — Foundation (1 hour, fixes everything)
| # | Action | Project | Effect |
|---|--------|---------|--------|
| 0 | `pip install freellmpool && freellmpool serve` | freellmpool | 178 AI routes, auto-failover |
| 0b | Install Ollama + pull 1 model | Ollama-models | AI works offline |

### Phase 1 — Immediate (no new servers, pure JS ports, ~10 hours total)
| # | Feature | Source | Wire Into | Effort |
|---|---------|--------|-----------|--------|
| 1 | MistakeClassifier (4 tiers) | Intervity | `spAnalyse()` | 1h |
| 2 | STAR Evaluator | Intervity | `spAnalyse()` behavioral Qs | 1h |
| 3 | Prosody + Vocab diversity | Intervity + Word-Freq | `spAnalyse()` | 1h |
| 4 | Pakistani interviewer persona | Intervity | Mock `SAMPLE()` | 30min |
| 5 | Auto-restart SpeechRecognition | interview-skills | `spRec()` | 1h |
| 6 | Reference answer + Good vs Bad | interview-skills | Question cards | 2h |
| 7 | Session export as Markdown | interview-skills | Mock completion | 1h |
| 8 | Company style profiles | interview-skills | JD prep | 1h |
| 9 | AI lookup cache factory | dictionariez | Any AI call | 30min |
| 10 | PAKGOV 50 Q&A → bank | PAKGOV-RAG | Bank import | 30min |
| 11 | Urdu TTS button (Awaaz) | Awaaz | Question cards | 2h |

### Phase 2 — Short-term (data merges + rebuilds, ~9 hours total)
| # | Feature | Source | Effect | Effort |
|---|---------|--------|--------|--------|
| 12 | Merge roman_urdu_map.json (30,888) | roman-urdu-translator | UR2RU: 12K→32K | 1h |
| 13 | Port urduhack 71 char mappings | urduhack | Fix Arabic-variant failures | 2h |
| 14 | Urdu normalize + diacritic strip | roman-urdu-translator + urduhack | Reliable Urdu input | 1h |
| 15 | Anki flashcard export | dictionariez | Q&A → Anki one-click | 1h |
| 16 | Word hover dictionary | dictionariez | Inline definitions | 2h |
| 17 | 11 Coaching strategies | Intervity | AI Coach targeted by type | 3h |
| 18 | PDF resume parsing | interview-skills | Upload resume PDF | 2h |
| 19 | Piper offline TTS | Piper | TTS without internet | 4h |

### Phase 3 — Medium-term (optional services, ~10 hours total)
| # | Feature | Service | Port | Effort |
|---|---------|---------|------|--------|
| 20 | PAKGOV RAG | Streamlit + FAISS | 8501 | 30min |
| 21 | Neural sentence translation | ONNX in browser | — | 1h |
| 22 | Agent memory (cross-session) | Intervity pattern | localStorage | 2h |
| 23 | IndexedDB session storage | interview-skills | — | 4h |
| 24 | Adaptive QBL curriculum | Intervity | localStorage | 4h |
| 25 | Company research for JD | scout-intel-mcp | MCP server | 2h |

### Phase 4 — Optional / Long-term
| # | Feature | Source | Notes |
|---|---------|--------|-------|
| 26 | Studio-quality TTS + voice cloning | VoxCPM | Needs GPU |
| 27 | Full audio pipeline | Voice-Pro | Replaces all audio tools |
| 28 | Browser TTS (no server) | Vocal Craft Studio | WASM, 1.8 GB |
| 29 | Urdu OCR service | UTRNet | PyTorch + model weights |
| 30 | Free dictionary API tooltip | dictionariez | Online only |

---

## 8. Feature Enhancement Matrix

### 8.1 New Features Added (currently not in IBX)

| New Feature | Source Domain | Source Project | User Benefit |
|-------------|--------------|---------------|-------------|
| Urdu TTS (read questions aloud) | Audio | Awaaz/Piper | Accessibility, audio learning |
| Offline TTS (no internet needed) | Audio | Piper | Works on planes, bad WiFi |
| Voice cloning (clone interviewer) | Audio | VoxCPM/Voice-Pro | Realistic mock interview |
| 178-route AI failover | AI Gateway | freellmpool | AI never goes down |
| Offline AI (local LLM) | AI Gateway | Ollama-models | Works with zero internet |
| Company research | AI Gateway | scout-intel-mcp | Real company data for prep |
| Answer mistake classification | Translation | Intervity | Know exactly what is wrong |
| STAR method scoring | Translation | Intervity | Behavioral answer structure |
| Reference answers (good/bad) | Translation | interview-skills | Compare against model answer |
| Session Markdown export | Translation | interview-skills | Shareable interview records |
| Anki flashcard export | Translation | dictionariez | Spaced repetition integration |
| Company-specific interview style | Translation | interview-skills | Google vs PITB vs Amazon prep |
| PDF resume parsing | Translation | interview-skills | Upload resume directly |
| Pakistan law Q&A (RAG) | Translation | PAKGOV-RAG | Government interview prep |
| Urdu OCR (image to text) | Translation | UTRNet | Read Urdu from images |
| 32K transliteration dictionary | Translation | roman-urdu-translator | 2.4× more Urdu↔Roman coverage |
| Arabic-variant normalization | Translation | urduhack | Fix Urdu from WhatsApp/web |
| Adaptive curriculum | Translation | Intervity | Auto-target weak areas |
| Agent memory | Translation | Intervity | Cross-session coaching context |
| Word hover dictionary | Translation | dictionariez | Inline tech term definitions |

### 8.2 Existing Features Improved

| Existing Feature | Current | After Enhancement | Source |
|------------------|---------|-------------------|--------|
| AI coaching | puter.com only | 178 routes + Ollama offline | freellmpool |
| SpeechRecognition | Cuts out after 60s | Auto-restarts seamlessly | interview-skills |
| spAnalyse() | WPM + fillers only | + MistakeClassifier + STAR + vocab | Intervity + Word-Freq |
| urToRoman() | 12,956 entries | 32,000+ entries | roman-urdu-translator |
| Urdu text handling | NFC only | + 71 char mappings + diacritic strip | urduhack |
| Mock interview persona | Generic | Pakistani tech context | Intervity |
| Session persistence | JSON backup | + Markdown export + Anki | interview-skills + dictionariez |
| Question selection | Random | Adaptive (targets weak tags) | Intervity QBL |
| Whisper roman_hint | 80 words | 32K dictionary | roman-urdu-translator |
| TTS | Browser speechSynthesis | + Piper offline + Awaaz Urdu | Audio domain |

---

## 9. Online/Offline Decision Matrix

### 9.1 What Works With Zero Internet?

After all integrations, these features work completely offline:

```
✅ FULLY OFFLINE CAPABILITIES (after all integrations)
├── Question bank (2474 Qs — already offline)
├── Whisper STT (port 5051 — already offline)
├── Transliteration Roman↔Urdu (32K dict — client-side)
├── Urdu normalization (71 mappings — client-side)
├── Neural translation (ONNX 84MB — browser cached)
├── Answer scoring (MistakeClassifier + STAR — client-side)
├── Prosody analysis (WPM + fillers — client-side)
├── Vocabulary diversity (word freq — client-side)
├── TTS Urdu/English/Hindi (Piper ONNX — local)
├── TTS browser (Vocal Craft WASM — local)
├── AI coaching (Ollama local LLM — offline)
├── Reference answers (Ollama — offline)
├── Pakistan law Q&A (PAKGOV FAISS + Ollama — offline)
├── PDF resume parsing (pdf.min.js — client-side)
├── Session Markdown export (client-side)
├── Anki flashcard export (AnkiConnect — localhost)
├── Agent memory (localStorage — client-side)
├── Adaptive curriculum (localStorage — client-side)
├── Spaced repetition (localStorage — already offline)
└── SQL Lab (SQLite — already offline)
```

### 9.2 What Needs Internet?

```
⚠️ INTERNET-ONLY CAPABILITIES (no offline equivalent)
├── Awaaz Urdu TTS (Microsoft Edge API — cloud only)
├── Company research via scout-intel-mcp (web search)
├── Free Dictionary API (word hover tooltip — but cached after first use)
├── Live provider availability checks (awesome-free-ai-coding)
└── Cloud LLM routes in freellmpool (178 routes — but Ollama covers offline)
```

### 9.3 Graceful Degradation Chain

```
Internet available:
  AI → freellmpool (178 cloud routes) → fastest, best quality
  TTS → Awaaz (cloud Urdu voice) → best Urdu TTS
  Research → scout-intel-mcp → live company data

Internet drops:
  AI → Ollama local model → slower but works
  TTS → Piper ONNX → local, good quality
  Research → skip (graceful fallback)

No internet at all:
  AI → Ollama local model → works
  TTS → Piper ONNX → works
  Research → skip
  Everything else → works (all client-side)
```

---

## 10. Resource Requirements Summary

### 10.1 Disk Space

| Component | Size | Required? |
|-----------|------|-----------|
| interview-box.html (current) | 3.55 MB | Already have |
| ibx-transliteration.js | 636 KB | Already have |
| ibx-transliteration.js (after merge) | ~800 KB | After Phase 2 |
| roman_urdu_map.json | 744 KB | Source data |
| ONNX neural translator | 84 MB | Optional (Phase 3) |
| Piper TTS models | 300 MB–5 GB | Phase 2 |
| Ollama + 1 model | 4–8 GB | Phase 0 |
| PAKGOV FAISS index | ~500 MB | Phase 3 |
| pdf.min.js + worker | 1.5 MB | Phase 2 |
| UTRNet model weights | ~100 MB | Optional |

### 10.2 RAM

| Scenario | RAM Needed |
|----------|-----------|
| IBX + Whisper only (current) | 2–4 GB |
| + Piper TTS | + 300 MB–1 GB |
| + Ollama (7B model) | + 4–8 GB |
| + PAKGOV RAG | + 1–2 GB |
| + Voice-Pro full pipeline | + 4–6 GB |
| + VoxCPM | + 4–8 GB |

### 10.3 Ports

| Service | Port | Required? |
|---------|------|-----------|
| IBX HTTP server | 8765 | ✅ Always |
| Whisper STT | 5051 | ✅ Already running |
| freellmpool | 8000 | ✅ Phase 0 |
| Ollama | 11434 | ✅ Phase 0 |
| PAKGOV RAG | 8501 | 🔵 Phase 3 |
| UTRNet OCR | 5052 | 🔵 Optional |
| AnkiConnect | 6006 | 🔵 If Anki installed |

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| puter.com goes down | High | Critical — all AI dead | freellmpool + Ollama (Phase 0) |
| Arabic-variant Urdu fails silently | High | Medium — wrong transliteration | urduhack port (Phase 2) |
| SpeechRecognition cuts out after 60s | Medium | Annoying — lost answers | interview-skills port (Phase 1) |
| File size exceeds 6 MB | Low | Build breaks | Lazy-load all external files |
| Ollama model too slow on user's laptop | Medium | UX degradation | Use smaller model (7B) |
| PAKGOV RAG retrieval misses | Low | Wrong answers | R@5=0.74 is acceptable; show citations |
| Piper model download is large | Low | Setup friction | One-time download, then cached |

---

## 12. The Bottom Line

### What This System Becomes

**Before:** A 2474-question interview prep app that depends on puter.com for AI,
has basic Urdu support, no audio output, and simple answer analysis.

**After all 23 integrations:** A fully offline-capable, multilingual AI interview
coaching platform that:
- Speaks questions aloud in Urdu (Awaaz/Piper)
- Transcribes answers with Whisper STT
- Scores answers on 4 mistake tiers + STAR + prosody + vocabulary diversity
- Gives AI feedback through 178 free LLM routes (or local Ollama when offline)
- Uses a Pakistani interviewer persona with company-specific style profiles
- Answers Pakistan law questions from 6,711 government document chunks
- Transliterates 32,000+ words between Roman Urdu and Urdu script
- Normalizes Arabic-variant Urdu characters from any source
- Exports sessions to Markdown and Anki flashcards
- Adapts question selection to target weak areas
- Remembers coaching context across sessions
- Works with zero internet (except live web research and cloud TTS)

### The 3 Most Impactful Changes (in order)

1. **freellmpool + Ollama** (1 hour) — eliminates the puter.com single point of
   failure and makes AI work offline. This is the keystone.

2. **Intervity analytics port** (4 hours) — transforms answer analysis from
   basic WPM/fillers into professional-grade MistakeClassifier + STAR + prosody.

3. **roman_urdu_map.json merge + urduhack normalization** (3 hours) — 2.4× more
   transliteration coverage and fixes silent failures on real-world Urdu text.

Everything else is additive quality — voice cloning, studio TTS, OCR, neural
translation, company research — each valuable but not blocking.

---

*This document consolidates analysis from:*
- *audio-integrations/details.md (Audio: 5 projects)*
- *OAUTH/details.md (AI Gateway: 7 projects)*
- *translkation-INTEGRATIONS/MASTER_INTEGRATION.md (Translation: 11 projects)*
