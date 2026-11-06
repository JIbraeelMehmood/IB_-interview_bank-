# Deep Analysis & Insights: Kiro Modern Pakistani Urdu Project Brief

> **Source document:** `kiro-modern-pakistani-urdu-project-brief.md`  
> **Analyzed by:** Kiro CLI  
> **Date:** November 6, 2026  
> **Purpose:** Thorough breakdown of every decision, requirement, architectural pattern, and implicit assumption in the brief — with commentary, gaps, risks, and actionable recommendations.

---

## Table of Contents

1. [What This Project Actually Is](#1-what-this-project-actually-is)
2. [The Core Problem Being Solved](#2-the-core-problem-being-solved)
3. [Language Strategy — Deep Analysis](#3-language-strategy--deep-analysis)
4. [Architecture Findings](#4-architecture-findings)
5. [API Contract Analysis](#5-api-contract-analysis)
6. [TTS (Text-to-Speech) Strategy Analysis](#6-tts-text-to-speech-strategy-analysis)
7. [Translation Prompting Strategy](#7-translation-prompting-strategy)
8. [Roman Urdu — The Hardest Problem](#8-roman-urdu--the-hardest-problem)
9. [Terminology / Glossary System](#9-terminology--glossary-system)
10. [Frontend Requirements Analysis](#10-frontend-requirements-analysis)
11. [Security Model](#11-security-model)
12. [Implementation Roadmap — Phase-by-Phase Review](#12-implementation-roadmap--phase-by-phase-review)
13. [Quality Assurance Framework](#13-quality-assurance-framework)
14. [Gaps, Risks & Unknowns](#14-gaps-risks--unknowns)
15. [Key Insights & Takeaways Summary](#15-key-insights--takeaways-summary)
16. [What to Build First — Prioritized Execution Order](#16-what-to-build-first--prioritized-execution-order)

---

## 1. What This Project Actually Is

### Surface reading
A multilingual translation + TTS (text-to-speech) feature layer on top of an existing React/Next.js application. Users enter text → get output in 4 languages → can listen to each one.

### Deeper reading
This is **a Pakistani Urdu language quality product** disguised as a tech feature. The engineering work is secondary. The primary deliverable is a linguistically correct, culturally accurate, natural-sounding Pakistani Urdu experience. Every technical decision flows from that language requirement.

The brief states this explicitly in its final principle:

> *"The most important quality target is that a Pakistani user should read the Urdu output and feel: 'This is how a real, educated Pakistani Urdu speaker would naturally say it.'"*

### What kind of users are targeted
- Pakistani developers reading/listening to software documentation
- General Pakistani Urdu speakers
- Users who switch between Urdu script, Roman Urdu, and English fluidly in the same sentence

This is **code-switching territory** — one of the most linguistically complex use cases for any NLP system.

---

## 2. The Core Problem Being Solved

The brief identifies **five active failures** in the current system:

| # | Problem | Root Cause Category |
|---|---|---|
| 1 | Translation is inaccurate or unnatural | Prompting / provider quality |
| 2 | Urdu & Roman Urdu pronunciation is wrong | Wrong TTS script input (Roman Urdu sent to Urdu-script voice) |
| 3 | Hindi/Urdu vocabulary mixed | No language separation in prompts; possibly chained translation |
| 4 | Audio sounds robotic | Default voice, no SSML, no speech tuning |
| 5 | Language-specific handling inadequate | One-size-fits-all pipeline, no per-language config |

### The single most critical bug identified
**Roman Urdu being sent directly to an Urdu-script TTS voice.** This is a fundamental input mismatch — the voice model expects Unicode Arabic/Urdu script characters, receives Latin characters instead, and either fails silently or produces gibberish pronunciation. The fix is architectural: always convert Roman Urdu → Urdu script → TTS.

### The "Hindi disguised as Urdu" problem
This is subtle and important. Modern LLMs (including GPT-4) are trained on more Hindi data than Pakistani Urdu data. Without explicit steering, models default to Hindi-ized vocabulary and grammar patterns, which sound wrong to Pakistani ears even though they are technically Urdu-adjacent. The brief addresses this head-on with detailed prompting rules and a nuanced linguistic note: *don't use a Hindi-word blacklist* — use contextual quality judgment.

---

## 3. Language Strategy — Deep Analysis

### The four-language matrix

```
English   →  Accurate, natural English
Urdu      →  Modern Pakistani Urdu (Urdu script, ur-PK)
Roman Urdu → Same content as Urdu, Latin characters, Pakistani convention
Hindi     →  Natural Hindi (Devanagari, hi-IN) — NOT Urdu rewritten in Devanagari
```

### What makes this hard

#### 1. Urdu ≠ Hindi (even though they share grammar)
The brief makes a linguistically sophisticated point: Urdu and Hindi share roughly 60–70% vocabulary. The distinction is not purely vocabulary — it's:
- **Script** (Arabic-derived Nastaliq vs Devanagari)
- **Vocabulary register** (Perso-Arabic vs Sanskrit-derived loanwords)
- **Cultural framing** (Pakistani context vs Indian context)
- **Technical terminology** (Pakistani developers use English terms; Hindi speakers sometimes translate them)

A naive AI model conflates them. A well-prompted model can distinguish them.

#### 2. Roman Urdu is not a standard
Roman Urdu has **no ISO standard, no governing body, no fixed spelling rules**. Every Pakistani writes it slightly differently. The brief defines the project's own canonical spelling table (26 core words listed), which is the correct approach. Key choices made:

| Word | Chosen | Avoided |
|---|---|---|
| ہے (is) | Hai | Hay, He |
| نہیں (no/not) | Nahi | Nahin, Nai |
| بہت (very) | Bohat | Bahut |
| آپ (you formal) | Aap | Ap |
| کیا (what) | Kya | Kia, Kiya |

**Insight:** `Bohat` vs `Bahut` is the clearest signal of Pakistani vs Indian Roman Urdu. `Bahut` is the Hindi pronunciation. `Bohat` is Pakistani. This single word can tell you which dialect is being targeted.

#### 3. Developer code-switching is a first-class requirement
The brief includes a detailed table of 15 developer sentence examples (Section 3.5). This is not boilerplate — it defines exact behavior:
- Technical terms stay in English
- Surrounding explanation is in Urdu
- Grammar flows naturally in Urdu around English nouns/verbs

Example: `"The API is not responding."` → `"API جواب نہیں دے رہی۔"` — the word "API" is kept, the verb phrase is Urdu, and the gender agreement is feminine (آی — feminine noun treatment in Urdu).

---

## 4. Architecture Findings

### What the brief proposes

```
User Input
    ↓
Language Detection / Manual Selection
    ↓
[Parallel translation to: EN | UR | UR-Roman | HI]
    ↓
Structured Translation Result (JSON validated)
    ↓
[Parallel TTS: EN voice | UR voice | HI voice]
         ↑
   Roman Urdu audio → Urdu script → Urdu TTS (same voice)
    ↓
Audio Storage / Cache
    ↓
Frontend Audio Player
```

### Key architectural decisions and their rationale

#### Decision 1: Separate services for translation, transliteration, TTS
**Why it matters:** These have different providers, failure modes, latencies, and costs. Mixing them into one monolith makes it impossible to swap providers or debug failures independently.

#### Decision 2: Provider abstraction layer
The brief demands a `speech-provider.ts` interface so Azure and Google can be swapped. This is standard strategy-pattern architecture. **Risk if skipped:** provider lock-in when pricing or quality changes.

#### Decision 3: Roman Urdu audio routed through Urdu script
Not a UI trick — it's the correct fix for the pronunciation bug. The Roman Urdu text is shown on screen, but the audio is synthesized from its Urdu-script equivalent. Users get readable Latin-character text + correctly pronounced Urdu audio.

#### Decision 4: Server-side-only provider calls
All AI API keys stay on the server. Never `NEXT_PUBLIC_`. This is non-negotiable for security. The brief calls this out multiple times.

#### Decision 5: Chunking for long text
TTS providers have limits (Azure: ~10 minutes audio, Google: ~5000 chars per request). Long text must be split at sentence/paragraph boundaries, synthesized as ordered chunks, and played sequentially. The brief defines a status machine: `pending → processing → completed/failed`.

### Proposed file structure — assessment

The proposed `src/lib/` structure is clean and follows separation of concerns well:

```
lib/ai/          — translation.ts, transliteration.ts
lib/speech/      — provider interface + Azure/Google implementations + voice config
lib/language/    — detection, config, normalization, terminology
```

**Potential gap:** There is no mention of a caching layer implementation. The brief mentions caching by "content/configuration hash" but does not specify where (Redis, filesystem, database, CDN). This needs a concrete decision.

---

## 5. API Contract Analysis

### Three core endpoints proposed

#### `POST /api/translate`
- Takes text + source language + target languages + style + domain
- Returns structured JSON with all translations
- `domain` field (`general` vs `software_development`) allows terminology switching — this is a smart design that avoids bloated prompts

**Gap identified:** No mention of max input length validation. LLM token limits (e.g., GPT-4o: 128k context) could be hit with long documents. The translate endpoint needs an `input_max_chars` guard.

#### `POST /api/transliterate`
- Urdu script → Roman Urdu and ideally the reverse
- The brief acknowledges that Roman Urdu → Urdu script is ambiguous due to vowel elision in Urdu script. This is accurate — Urdu script does not encode short vowels (اعراب/harakat are optional), making reverse transliteration a genuinely hard NLP problem.

**Insight:** For the reverse direction (Roman → Urdu script), an AI model (GPT-4 with context) will outperform any deterministic algorithm because it can infer missing vowels from context.

#### `POST /api/speech`
- Takes Urdu-script text + locale + voice + speed + format
- Returns audio URL or stream or job ID
- The brief correctly hedges: actual response shape depends on whether streaming or async job pattern is used

**Gap:** No mention of audio format negotiation. MP3 is mentioned as default, but different clients may need different formats (OGG for Firefox, MP3 for Safari, WAV for high quality). Recommend adding `Accept` header handling or explicit format parameter with allowed values.

#### `GET /api/voices`
- Returns voices filtered by language
- Only returns configured/supported voices — not the full provider catalogue

This is correct security/UX practice — don't expose provider internals to the frontend.

---

## 6. TTS (Text-to-Speech) Strategy Analysis

### Provider comparison from the brief

| Provider | Urdu | Quality Note |
|---|---|---|
| Azure AI Speech | `ur-PK-UzmaNeural` (F), `ur-PK-AsadNeural` (M) | Pakistani Urdu native voices |
| Google Cloud TTS | `ur-IN` voices | Indian accent — not ideal for Pakistani users |

### Critical finding: Azure is the right primary for Pakistani Urdu
Google's Urdu voices are tagged `ur-IN` (India), not `ur-PK` (Pakistan). The accent difference is perceptible to Pakistani listeners — similar to how American English sounds different from British English. The brief correctly identifies this risk and flags it for testing before adoption.

### SSML — why it matters
Standard TTS sends plain text. SSML (Speech Synthesis Markup Language) allows:
- `<break time="300ms"/>` — insert pauses at sentence boundaries
- `<prosody rate="slow">` — slow down complex technical passages
- `<say-as interpret-as="characters">API</say-as>` — spell out acronyms vs reading them as words
- `<lang xml:lang="en-US">Backend</lang>` — switch language for English terms in Urdu sentences

Without SSML, the TTS voice will attempt to "read" English technical terms using Urdu phoneme rules — producing incorrect pronunciation for words like "API", "Laravel", "GitHub".

**This is the second most critical fix after the Roman Urdu script routing.**

### Voice catalogue verification instruction
The brief explicitly says: **verify voice availability before implementing**. Azure voices are region-specific. `ur-PK-AsadNeural` may not be available in all Azure regions. This must be checked against the actual subscription and region.

---

## 7. Translation Prompting Strategy

### The system prompt — what makes it good

The proposed system prompt (Section 8) is well-structured for several reasons:

1. **Role definition:** "Expert multilingual translator specializing in contemporary Pakistani Urdu" — sets the model's persona
2. **Explicit negatives:** "Avoid archaic, classical, poetic, literary..." — LLMs respond better to explicit don'ts than vague dos
3. **Language separation rules:** Urdu and Hindi sections are clearly delineated
4. **Developer vocabulary list:** Named terms are told to stay in English, removing ambiguity
5. **Output format enforcement:** "Return the exact structured JSON schema. Do not include commentary outside the JSON."

### What could make it even better

The brief mandates Zod validation on model output. This is the right call — LLMs occasionally produce:
- Malformed JSON (extra text before/after the object)
- Missing fields (only some languages translated)
- Reversed fields (Roman Urdu in the Urdu field)
- Refusals ("I'm sorry, I cannot translate...")

Zod catches all of these at runtime before they reach the user.

### The "domain" parameter for terminology switching
The `domain: "software_development"` field in the translation request is a lightweight way to inject domain-specific system prompt additions without bloating the base prompt. This is a clean design pattern — keep the base prompt stable and inject domain context as needed.

### Translation chaining warning
The brief explicitly prohibits: `English → Urdu → Hindi` (chained translation). This is correct. Chained translation compounds errors. Always translate directly from source to each target independently. Modern LLMs (GPT-4, Claude) can handle this in a single structured output call.

---

## 8. Roman Urdu — The Hardest Problem

### Why Roman Urdu is technically the most complex part

1. **No standard exists** — every Pakistani writes it differently
2. **Urdu script lacks short vowels** — transliteration from script to Roman requires vowel inference
3. **TTS cannot reliably handle it** — most TTS providers expect script, not Latin
4. **Code-switching is dense** — "Mujhe database connection ka issue aa raha hai" mixes Urdu grammar + English technical terms
5. **Consistency is hard to maintain** — "Hai" vs "Hay", "Kya" vs "Kia" must be normalized system-wide

### Recommended implementation path (from brief)

```
Urdu script text
       ↓
AI-based transliteration (context-aware)
       ↓
Spelling normalization (project's canonical table)
       ↓
English term preservation (don't transliterate "API", "Laravel")
       ↓
Roman Urdu output
```

### Reverse path (Roman Urdu → Urdu script for TTS)

```
Roman Urdu text
       ↓
AI-based reverse transliteration (GPT-4 with Pakistani Urdu context)
       ↓
Urdu script (with harakat/diacritics where needed for TTS)
       ↓
ur-PK TTS voice
```

### Testing requirement
The brief calls for gender, verb form, plural, common particles, and code-switching tests. These are the exact failure modes of naive transliteration:
- Gender: `گئی` (gayi, feminine) vs `گیا` (gaya, masculine) — must preserve in Roman Urdu
- Verb forms: `کر رہا ہوں` → `kar raha hoon` (first person) vs `کر رہے ہیں` → `kar rahe hain` (plural)

---

## 9. Terminology / Glossary System

### Design pattern identified: context-sensitive glossary

The brief proposes a JSON-based glossary with per-context translations. This is sophisticated:

```json
{
  "term": "request",
  "translations": [
    { "context": "software_api",          "urdu": "Request" },
    { "context": "everyday_conversation", "urdu": "درخواست" }
  ]
}
```

**Insight:** The word "request" in Urdu has two completely different translations depending on context — and mixing them creates awkward or incorrect output. A software API call is a "Request" (English preserved); a formal application to an office is a "درخواست" (Darkhwast). This is the kind of nuance that separates professional localization from automated translation.

### 10 glossary categories defined
The brief lists these domains (Section 9):
1. Everyday conversation
2. Business/professional
3. Software development
4. Web development
5. Programming languages/frameworks
6. IT infrastructure/DevOps
7. AI/ML
8. Education
9. Numbers, dates, time
10. Common expressions/idioms

This is a well-thought-out taxonomy. The glossary should be queryable by category + style, not just by term.

### Glossary governance
The brief mandates human review for glossary additions and version control. This is essential — automated glossary expansion without review will introduce errors that propagate into every translation.

---

## 10. Frontend Requirements Analysis

### What the brief asks for

| Feature | Notes |
|---|---|
| Original text input area | Standard textarea |
| Source language selector | Or auto-detection indicator |
| 4 output tabs/cards | EN, UR, Roman UR, HI |
| Copy button per language | Standard clipboard API |
| Independent play/pause per language | Separate audio elements |
| Voice selector | Where multiple voices configured |
| Speed control | Per language ideally |
| Loading/processing/completed/failed states | Full async state machine |
| Retry button for failed audio | Per-language retry |
| Long text progress indicator | Chunked progress |
| RTL layout for Urdu | CSS `direction: rtl` + correct font |
| LTR for EN/Roman Urdu/Hindi | Reset from RTL default |

### RTL considerations
Urdu (نستعلیق / Nastaliq) requires:
- `direction: rtl` on container
- `text-align: right`
- Correct Urdu font (`Noto Nastaliq Urdu`, `Jameel Noori Nastaleeq`, or similar)
- Number rendering (Urdu uses `٠١٢٣٤٥٦٧٨٩` Eastern Arabic numerals in formal text, Western `0-9` in developer context)
- Punctuation mirroring (Urdu `؟` for `?`, `،` for `,`)

Roman Urdu is LTR despite being Urdu content — this is a common UI mistake to watch for. Do not apply RTL to Roman Urdu.

### State machine for audio
The frontend needs to handle:
```
idle → loading → playing → paused → ended
            ↓
          error → [retry available]
```
For chunked long text, each chunk has its own state, and the overall player shows aggregate progress.

---

## 11. Security Model

### What the brief mandates

| Rule | Rationale |
|---|---|
| All provider keys server-side only | Client bundle is public; keys in `NEXT_PUBLIC_*` are exposed |
| Input validation on all endpoints | Size, language, voice, speed, format |
| Rate limiting on speech endpoints | TTS is expensive ($4–$16 per 1M chars for Azure Neural) |
| Authenticated access for private audio | Don't serve audio files publicly without auth |
| Short-lived signed URLs for audio | Standard approach for S3/GCS private objects |
| No logging of full user text | Privacy; also avoids log bloat for long articles |
| Define retention/deletion policy | GDPR/PDPA compliance for Pakistani users |
| No arbitrary remote URL fetch for audio | Prevents SSRF (Server-Side Request Forgery) attacks |

### Security gap not addressed
The brief does not mention **content filtering** on input text. If the translation endpoint is public or authenticated only at a basic level, users could submit offensive content that gets translated and stored. Recommend adding input content moderation (Azure Content Safety, OpenAI moderation API) as a separate middleware layer.

---

## 12. Implementation Roadmap — Phase-by-Phase Review

### Phase 0: Repository Audit (Mandatory)
**Assessment:** This is the most important phase and the brief is right to flag it first. Without understanding the existing codebase, any changes risk breaking working features. The explicit instruction "Do not begin broad refactoring before this audit" is correct.

**What to look for:**
- Current translation provider (likely Google Translate API, DeepL, or a basic OpenAI call)
- Current TTS provider (likely Google TTS or browser `speechSynthesis` API)
- Whether App Router or Pages Router is used (affects file structure completely)
- Existing state management (Redux, Zustand, React Query, or none)
- Database/ORM (determines audio storage strategy)
- Deployment platform (Vercel, AWS, self-hosted — affects environment variable handling)

### Phase 1: Translation Foundation
**Critical order dependency:** Must come before TTS. You cannot test TTS quality without accurate translation output.

### Phase 2: Roman Urdu
**Highest risk phase.** Roman Urdu transliteration quality is the hardest to achieve and the hardest to test. Budget more time here than the roadmap implies.

### Phase 3: TTS Provider
**Dependency:** Needs Phase 1 output (clean Urdu script) to test properly.

### Phase 4: Audio Reliability
**Often underestimated.** Chunking, async jobs, retry logic, storage, status tracking — this is 30–40% of the total backend work.

### Phase 5: Frontend
**Safest phase.** UI integration, state management, RTL layout, audio players.

### Phase 6: Evaluation
**Not a phase — it's continuous.** The brief's QA framework should start at Phase 1, not at the end.

---

## 13. Quality Assurance Framework

### Test dataset: 200 reviewed examples across 4 categories

| Category | Count | Examples |
|---|---|---|
| Everyday conversations | 50 | "How are you?" → Urdu/Roman/Hindi |
| Business/professional | 50 | Formal emails, meeting requests |
| Software development | 50 | Error messages, code comments, API docs |
| Mixed language/code-switching | 50 | "Meeting kal 10 baje hai" |

### 10 evaluation dimensions
The brief defines a multi-dimensional scoring rubric:
1. Translation meaning/accuracy
2. Pakistani Urdu naturalness
3. Vocabulary suitability
4. Grammar/sentence structure
5. Roman Urdu consistency/readability
6. Urdu/Hindi language separation
7. Developer terminology preservation
8. TTS pronunciation quality
9. TTS prosody (pauses, rhythm, naturalness)
10. Latency, reliability, cost

**Key insight:** These dimensions require **two types of evaluators**:
- Native Pakistani Urdu speakers (dimensions 2–7)
- Technical evaluators (dimensions 8–10)

Automated metrics (BLEU score, etc.) are insufficient for this use case. Human native-speaker review is mandatory.

### The "no Hindi blacklist" rule
The brief explicitly warns: *"Do not use a simplistic Hindi-word blacklist as the primary quality metric."* This is linguistically correct. Words like `مطلب` (matlab), `مسئلہ` (masla), `پانی` (paani) are perfectly natural in Pakistani Urdu even though Hindi speakers use them too. Quality must be evaluated at the sentence level, not by individual word lookup.

---

## 14. Gaps, Risks & Unknowns

### Gaps identified in the brief

| Gap | Detail | Recommendation |
|---|---|---|
| Cache implementation | Mentioned but not specified | Choose: Redis (fast), filesystem (simple), or DB-backed |
| Audio format negotiation | Only MP3 mentioned | Support OGG/MP3/WAV; use `Accept` header or format param |
| Input length limits | No max_chars specified | Add guard (e.g., 5000 chars for translate, 3000 for TTS) |
| Content moderation | Not mentioned | Add for public-facing endpoints |
| Hindi voice quality | Google `ur-IN` flagged as risky, but hi-IN not evaluated | Test `hi-IN` voices before committing |
| Deployment platform | Unknown | Affects environment vars, audio storage, background jobs |
| Authentication system | "existing auth" referenced but not described | Must understand before modifying endpoints |
| Queue/worker infrastructure | "if available" — no specification | Decision needed: database-backed queue vs Redis/BullMQ |

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Roman Urdu transliteration quality lower than expected | HIGH | Plan for native speaker QA cycles; build test harness early |
| Azure `ur-PK` voices not available in deployment region | MEDIUM | Verify region + account before architecture commitment |
| Existing codebase uses Pages Router (not App Router) | MEDIUM | Phase 0 audit will resolve; file structure changes needed |
| Long text audio chunking ordering bugs | MEDIUM | Strict sequential chunk ID + ordering in storage |
| LLM produces inconsistent Roman Urdu spelling | HIGH | Post-processing normalization layer essential |
| Hindi output sounds Urdu-ized (or vice versa) | HIGH | Separate prompts for Urdu and Hindi; test with native speakers |
| Provider cost overruns (TTS expensive at scale) | MEDIUM | Rate limiting + aggressive caching + cost alerts |

### Unknowns that must be resolved in Phase 0

1. What is the current translation provider and its API key structure?
2. Does the app currently have any TTS at all, or is it broken?
3. What Next.js version and router type?
4. Is there a database? What ORM?
5. What deployment platform (Vercel, AWS EC2, DigitalOcean)?
6. Are there existing tests? What framework?
7. What is the authentication system?

---

## 15. Key Insights & Takeaways Summary

### Linguistic insights

1. **Pakistani Urdu ≠ Hindi.** This is the foundational insight. The entire brief exists because LLMs default to Hindi-influenced Urdu. Explicit Pakistani Urdu prompting with negative constraints is mandatory.

2. **Roman Urdu is a dialect signal.** `Bohat` vs `Bahut` is the clearest phonetic marker of Pakistani vs Indian Urdu. The project's spelling table encodes this correctly.

3. **Technical terms stay English.** Pakistani developers do not say "پروگرام" (program) or "ڈیٹابیس" (database) in conversation — they say "program" and "database". Forcing Urdu equivalents sounds artificial.

4. **Roman Urdu cannot be TTS'd directly.** This is an architectural fact, not a preference. The fix is Urdu script conversion before synthesis.

5. **Urdu script has no short vowels.** This makes Urdu → Roman Urdu transliteration inherently context-dependent. AI inference is required, not rule-based character maps.

### Technical insights

6. **Provider abstraction is not optional.** TTS providers change pricing, deprecate voices, have regional outages. The abstraction layer is a business continuity requirement.

7. **SSML is required for mixed-language TTS.** Without SSML, English terms in Urdu sentences will be mispronounced by the Urdu voice.

8. **The Roman Urdu pipeline has a direction inversion.** User sees Latin text; audio is generated from Arabic/Urdu script. This must be clearly documented in code to avoid "fixing" it accidentally.

9. **Phase 0 (audit) determines everything.** The brief cannot give a concrete implementation plan without knowing the existing codebase. The audit is not optional bureaucracy — it is the foundation.

10. **Chunking strategy determines audio quality.** Audio cut at wrong points (mid-word, mid-sentence) will sound terrible. Split only at sentence boundaries, using Unicode sentence segmentation.

### Product insights

11. **This is not a "translator widget".** It is a complete localization stack for a specific linguistic/cultural context. The quality bar is native-speaker acceptance, not machine translation accuracy.

12. **The glossary system is a competitive moat.** A well-maintained context-sensitive glossary with Pakistani developer terminology is not easily replicated by off-the-shelf solutions. Build it properly and version it.

13. **Native speaker review is non-negotiable.** No automated metric can detect that `"مطلب"` is natural Pakistani Urdu in a software context. Human QA is part of the product, not a nice-to-have.

---

## 16. What to Build First — Prioritized Execution Order

Based on the brief's phases and risk analysis, the recommended execution order is:

### Step 1: Repository Audit + Documentation (Phase 0)
> Output: `ARCHITECTURE_AUDIT.md` listing current providers, router type, auth system, storage, tests, open issues.

### Step 2: Translation Layer (Phase 1)
> Build: server-side `translation.ts`, system prompt, structured output with Zod validation, all 4 languages in one API call.
> Test: Run the 200-example test set manually against the new system. Compare with existing output.

### Step 3: Roman Urdu Transliteration (Phase 2)
> Build: `transliteration.ts`, spelling normalization, test harness with gender/verb/code-switching cases.
> Test: 50 Roman Urdu test cases with native speaker review.

### Step 4: TTS Provider Integration (Phase 3)
> Build: `speech-provider.ts` interface + Azure implementation.
> Test: All 4 voices with sample sentences. SSML for mixed-language sentences.

### Step 5: Audio Storage + Chunking (Phase 4)
> Build: Audio cache, chunk processor, status machine, secure access.

### Step 6: Frontend Polish (Phase 5)
> Build: RTL Urdu layout, independent audio players, retry buttons, progress indicators.

### Step 7: QA + Deployment (Phase 6)
> Run: Native speaker reviews, load testing, cost monitoring, deployment verification.

---

## Appendix: Quick Reference — Key Decisions from Brief

| Decision | Choice | Reason |
|---|---|---|
| Translation provider | OpenAI API | Context-aware, structured output, Pakistani Urdu steering |
| Primary TTS | Azure AI Speech | `ur-PK` native voices |
| Fallback TTS | Google Cloud TTS | `hi-IN` Hindi, possible fallback |
| Urdu voice (F) | `ur-PK-UzmaNeural` | Pakistani female neural voice |
| Urdu voice (M) | `ur-PK-AsadNeural` | Pakistani male neural voice |
| Roman Urdu audio | Urdu script → TTS | Roman Urdu sent to Urdu script, then synthesized |
| Output validation | Zod schema | Catch malformed/missing model output at runtime |
| API style | REST JSON | POST for translate/speech, GET for voices |
| Provider pattern | Strategy/interface | Swap providers without changing business logic |
| Secret management | Server-side only | Never `NEXT_PUBLIC_` for API keys |
| Audio caching | Hash-based dedup | Same text+voice+speed = same audio, cached |
| Long text | Paragraph chunks | Sequential, ordered, async processing |
| Glossary | Context-sensitive JSON | Same term, different translation per domain |
| Roman Urdu spelling | Project canonical table | 26 core words standardized |
| Quality bar | Native speaker acceptance | Not BLEU score or automated metrics |

---

*End of analysis. This document should be treated as a living reference and updated after Phase 0 repository audit reveals concrete implementation details.*
