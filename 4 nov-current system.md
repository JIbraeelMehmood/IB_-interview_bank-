# Interview Box — Current System (4 Nov 2026, Updated)

## Build status
✅ `npm run build` passes — 0 TypeScript errors, 138 modules, 3.3 MB dist, 23 precached entries

## Question Bank
- 2,140 questions (1,950 original + 190 from markdown imports)
- 50 parts, sources: `b` (book), `n` (new 2026), `import` (markdown)
- Run `npm run parse-md` to re-parse markdown files

## What's Implemented

### Core PWA
- React 19 + Vite + TypeScript + Dexie + Workbox
- Service worker, installable on Android/iOS, offline-first
- PWA icons (192, 512, maskable-512)
- Mobile UX (bottom nav, touch targets, viewport-fit)
- MongoDB auth (signup, login, logout, me, sync, health) — working

### AI System
- 12 providers: server, puter, claude, gemini, groq, openrouter, openai, anthropic, custom, mistral, xai, fireworks
- **Auto-failover**: when primary provider fails, tries other configured providers automatically
- **Puter SDK integration**: free AI with no key — loads puter.com SDK dynamically, works in browser
- Streaming SSE, JSON parsing, task routing, language routing, profile injection

### Audio / TTS (improved 4 Nov)
- Pitch control (0.5–2.0), Volume control (0–100%)
- Roman Urdu → Urdu transliteration (`ruToUrdu` toggle)
- Voice quality labels (Neural/Cloud/Enhanced/Standard/Basic)
- Per-voice preview (🔊 button plays sample before selecting)
- Separate Roman Urdu voice selector
- Better voice preference ordering (hi-IN preferred for Roman Urdu)
- Custom range slider styling
- 4 voice selectors: English, Urdu, Hindi, Roman Urdu

### Intelligence Features
- classifyMistake(), starEval(), prosodyAnalyze(), vocabDiversity()
- pakistaniInterviewerPrompt(), coachStrategy(), getRefAnswer()
- COMPANY_PROFILES (14 companies)

### PDF Resume Upload (new 4 Nov)
- Upload .pdf files in CV↔JD match
- Parsed in browser using pdf.js (lazy-loaded, no dependency bloat)
- Also accepts .txt, .md, .json, .docx

### Language & Urdu
- normalizeUrduText() — 71 Arabic→Urdu char mappings
- AI translation + MyMemory fallback + Dexie cache
- Roman Urdu normalization, RTL, Devanagari
- 260-term pronunciation dictionary

### Other
- FSRS spaced repetition (ts-fsrs)
- Anki export, backup/restore
- Whisper STT integration + Web Speech API
- Wake Lock + Media Session for lock-screen controls
- Vercel deployment config (vercel.json fixed)

## What's Remaining

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| roman_urdu_map.json merge (30,888 entries) | Medium | 1h | Expands UR→Roman dict from 12K to 32K |
| PAKGOV Q&A import (49 law questions) | Low | 30min | New "Pakistan Law" category |
| freellmpool auto-failover setup | Low | 30min | Localhost only — cloud already has auto-failover |
| Real phoneme pronunciation scoring | Medium | 4h | Better speaking coach scoring |
| Voice cloning | Optional | server-side | Needs GPU model |
| Extract more questions from markdown | Medium | varies | Parser exists, more files could be added |

## Localhost-Only Services
- Whisper STT (port 5051) — code exists, needs Python server
- Ollama (port 11434) — not set up
- freellmpool (port 8000) — not set up
- PAKGOV RAG (port 8501) — not set up
- AnkiConnect (port 6006) — code exists, needs Anki desktop
