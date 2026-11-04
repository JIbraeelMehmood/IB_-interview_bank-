# Interview Box — Integration Guide
**Last updated:** 2026-10-21  
**Status:** Living document — add new options as discovered  
**Current system:** `interview-box.html` (3.54 MB, 2474 questions, localhost:8765)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Project: Dictionariez](#1-dictionariez)
3. [Project: interview-skills](#2-interview-skills)
4. [Project: Intervity](#3-intervity)
5. [Priority Roadmap](#priority-roadmap)
6. [Integration Patterns (How-To)](#integration-patterns)
7. [Future Integration Options](#future-integration-options)
8. [Notes & Constraints](#notes--constraints)

---

## System Overview

### interview-box.html — What it already has
| Feature | Implementation |
|---------|---------------|
| Question bank | 2474 questions embedded in `<script id="bank">` JSON |
| AI provider abstraction | `SAMPLE()` wrapper — OpenRouter, Puter, Groq, Gemini, Mistral, Ollama, xAI, Fireworks |
| State persistence | `localStorage` key `ibx` + `IndexedDB` translation cache |
| TTS/Audio | `speechSynthesis` via `speakSeg()`, `pickVoice()`, `startPlayer()` |
| Speech-to-text | Browser `SpeechRecognition` + Whisper (local Flask server port 5051) |
| Language support | English, Urdu (RTL), Hindi, Roman Urdu, Punjabi (detect + TTS route) |
| Mock interviewer | Timer, scorecard, cross-questions, AI feedback |
| Speaking coach | Voice practice, answer analysis (`spAnalyse()`), filler detection |
| Translation cache | `trGet()`/`trSave()` with fallback chain ru→ur→hi |
| JD prep | Job description parser, tech stack extraction, question prediction |
| SQL Lab | Interactive SQLite practice |
| Spaced repetition | SRS (`srsDue()`) for question scheduling |
| Export/backup | JSON backup/restore of full state |

### Architecture constraints
- **Single HTML file** — all JS/CSS inlined, no bundler
- **localhost:8765** — served by Python `http.server` (Linux/Mac) or PowerShell (Windows)
- **No npm/node at runtime** — pure browser JS only
- **Whisper server** — separate Python Flask process on port 5051
- **Storage limit** — localStorage ~5–10MB; use IndexedDB for large data
- **Offline-first** — AI calls go out, everything else works offline

---

## 1. Dictionariez

**Location:** `./dictionariez/`  
**What it is:** Browser extension for multi-dictionary word lookup (Chrome/Firefox/Edge)  
**Key files:**

```
dictionariez/src/
  background/
    ai-lookup.js          — AI contextual lookup with queue + cache (in-memory + localStorage)
    plain-lookup.js       — Structured word lookup: pronunciation US/UK, definitions, examples
    dict.js               — Dictionary engine (fetch, parse, render)
    speak.js              — TTS speak helper (background context)
    tts-speak.js          — Background TTS with fallback synthesis voice
    translate.js          — Google Translate bridge (1-click translate)
    storage.js            — Extension storage (word history, settings)
    localStorageCache.js  — Generic localStorage cache factory (max N items, FIFO evict)
    ankiwindow.js         — Anki flashcard export via AnkiConnect HTTP API
    contextMenu.js        — Right-click context menu: Look up, Translate, Speak, Anki
  content/
    inject.js             — Main content script injector
    tts-translator-inject.js — Translate + speak selected text on any page
    plain-lookup-tooltip-webcomponent.js (38KB) — Tooltip web component for plain lookups
    tts-player-webcomponent.bundle.js (397KB)   — Full audio player web component
    lookup-parser.js      — Parses raw HTML from 50+ dictionary sites into structured data
    detect-language.js    — Browser i18n.detectLanguage API wrapper with DOM fallback
    audio-listener.js     — Listens for TTS audio events from background
    anki-inject.js        — Injects Anki export button into dict popups
  shared-readonly/
    dictionaries.js       — Registry of 50+ dictionaries with URLs and parsers
    detectLanguage.js     — Language detection with parent-node fallback (reliable)
    utils.js              — Text utils: isSentence(), hasEnglish(), word validation
    dictionaries/
      english.js          — English dictionary configs (Merriam-Webster, Oxford, etc.)
      common.js           — Common multi-language dict configs
  resources/
    dict-parsers.json     — Parser descriptors for 50+ online dictionaries
    langs.json            — Language config: synthesis voice mapping, script ranges
  option/
    synthesis-options.js  — TTS voice selection UI per language
    ai-language-select.js — AI response language preference
```

### Integration options

#### A. Inline Word Lookup (hover/double-click on technical terms)
**Effort:** Medium | **Impact:** High  
**What:** User double-clicks any word in a question/answer card → tooltip shows definition, pronunciation, example sentence  
**How:**
- Extract `lookup-parser.js` + `utils.js` + `localStorageCache.js` into IBX `<script>`
- On `dblclick` inside `.ans` or `.qh`, get selected word → call dictionary URL → parse response
- Show result in a small tooltip/sheet (reuse IBX's `.sheet` pattern)
- Cache lookup results in `localStorage` (port `localStorageCache.js` factory function)
- **Dictionaries to use:** For English technical terms → Merriam-Webster API or Free Dictionary API (free, no key)
```js
// Pattern from localStorageCache.js
function dictCache(ns, max) {
  function get(word) { var c=JSON.parse(localStorage.getItem(ns)||'{}'); return c[word]||null; }
  function set(word, val) { var c=JSON.parse(localStorage.getItem(ns)||'{}'); var keys=Object.keys(c);
    if(keys.length>=max)delete c[keys[0]]; c[word]=val; localStorage.setItem(ns,JSON.stringify(c)); }
  return {get, set};
}
var DICT_CACHE = dictCache('ibx-dict', 200);
```

#### B. AI Contextual Lookup (explain term in interview context)
**Effort:** Low | **Impact:** High  
**What:** Select a technical term in any answer → "Explain in interview context" → AI explains it as you'd answer in an interview  
**How:**
- Port the **queue + cache pattern** from `ai-lookup.js`:
  - In-memory cache (`lastKey`/`lastResult`) for immediate re-lookup
  - localStorage cache (max 20 entries) for persistence across sessions
  - Request queue (`pending[]`) so concurrent lookups serialize instead of racing
- Wire to IBX's existing `SAMPLE()` AI wrapper
- Add "🔍 Explain" button to question cards (`.qh` long-press or right-click)
```js
// Pattern: queue-based AI lookup with dual cache
var _aiLookupCache = {}, _aiLookupLast = {key:null, res:null}, _aiLookupQ = [], _aiLookupBusy = false;
function aiLookup(word, context, cb) {
  var key = word + '|' + context.slice(0,50);
  if(_aiLookupLast.key===key) { cb(_aiLookupLast.res); return; }
  if(_aiLookupCache[key]) { cb(_aiLookupCache[key]); return; }
  _aiLookupQ.push({key,word,context,cb});
  if(!_aiLookupBusy) _processAiLookupQ();
}
```

#### C. Reliable Language Detection
**Effort:** Low | **Impact:** Medium  
**What:** Replace IBX's regex `detectLang()` with the browser's built-in `chrome.i18n.detectLanguage`  
**How:**
- Port `detectLanguage.js` fallback logic:
  - Try `chrome.i18n.detectLanguage(text)` first (available in Chrome extension context)
  - If not available or not reliable, fall back to IBX's existing `arabicShare()` + `RU_WORDS` regex
  - Check parent DOM node if text is too short (< 40 chars) — climb up 3 levels
- In IBX context (not extension): use `window.navigator.language` + existing regex as fallback

#### D. TTS Player Web Component
**Effort:** High | **Impact:** Medium  
**What:** Replace IBX's fragile `speechSynthesis` loop with the battle-tested TTS player web component  
**How:**
- Copy `tts-player-webcomponent.bundle.js` (397KB) to the IBX server directory
- Load via `<script src="/tts-player-webcomponent.bundle.js">` in `interview-box.html` head
- Replace `startPlayer()` + `speakSeg()` calls with the web component's API
- **Note:** Large file — only load on demand (lazy load when player first opened)

#### E. Anki Flashcard Export
**Effort:** Medium | **Impact:** Medium  
**What:** "Export to Anki" button on each question card → adds Q&A as flashcard in Anki  
**How:**
- Port `ankiwindow.js` — uses `AnkiConnect` HTTP API on `http://localhost:8765` (Anki's default port when running)
- **Wait — conflict:** IBX also runs on 8765. AnkiConnect actually runs on `6006` by default.
- Add "🃏 Anki" button to question card actions
- `POST http://localhost:6006` with JSON `{"action":"addNote","params":{...}}`
- Check if AnkiConnect is running first (`GET /health`)
```js
function ankiAdd(front, back, deck) {
  fetch('http://localhost:6006',{method:'POST',body:JSON.stringify({
    action:'addNote', version:6,
    params:{note:{deckName:deck||'Interview Box',modelName:'Basic',
      fields:{Front:front,Back:back},options:{allowDuplicate:false}}}
  })}).then(r=>r.json()).then(j=>toast(j.error?'Anki error: '+j.error:'✓ Added to Anki'));
}
```

#### F. Urdu/Arabic Dictionary Support
**Effort:** Medium | **Impact:** High (for Urdu speakers)  
**What:** Add Urdu-specific dictionaries (Rekhta, UrduPoint, Oxford Urdu) to word lookup  
**How:**
- Extend `dict-parsers.json` pattern: add Urdu dictionary URLs + CSS selectors for result parsing
- Wire to IBX's Urdu RTL display (`.ur` class, Nastaliq font)
- Suggested dictionaries: `rekhta.org/urdudictionary`, `urdupoint.com/dictionary`

---

## 2. interview-skills

**Location:** `./interview-skills/`  
**What it is:** Chinese AI mock interview web app (EasyClaw Skill Store)  
**Key files:**

```
interview-skills/
  ui/
    app.js (118KB)        — Full vanilla JS application
    index.html (21KB)     — Main UI
    styles.css (32KB)     — All styles
    storage.js (7KB)      — IndexedDB 3-store layer
    lib/
      pdf.min.js (377KB)  — PDF.js for resume PDF parsing
      pdf.worker.min.js (1.1MB) — PDF.js worker
  extensions/
    mic-input/
      mic-input.js (12KB) — Continuous SpeechRecognition with auto-restart + AI correction
      mic-input.css       — Mic button styles
    reference-answer/
      reference-answer.js (15KB) — Per-question reference answer with good/bad comparison
      reference-answer.css
    export-md/
      export-md.js (13KB) — Beautiful Markdown session export
      export-md.css
    storage-sync/
      storage-sync.js (6KB) — Cross-tab/cross-session storage sync
    model-config/
      model-config.js (5KB) — LLM model selector UI
      model-config.json     — Default model configurations
    server.js (8KB)       — Node.js extension injection server
  references/
    bei-framework.md      — BEI (Behavioral Event Interview) framework
    resume-parser.md      — Resume parsing patterns
    company-profiles.md   — Interview styles: Alibaba, ByteDance, Google, Amazon, Meta, etc.
    question-design.md    — Question design principles
    jd-parser.md          — JD parsing logic
    chatbox-senior-ai-chatbot.md (55KB) — Full senior AI chatbot reference design
  PRD.md                  — Full product spec: JD parser, resume parser, 10Q generator, good/bad comparison
  SKILL.md                — Skill installation guide
```

### Integration options

#### A. Continuous SpeechRecognition with Auto-Restart + AI Correction
**Effort:** Low | **Impact:** High  
**What:** Fix IBX's 60-second SpeechRecognition cutoff. The browser stops recognition after ~60s of silence. mic-input.js auto-restarts it silently.  
**How:** Port these patterns from `mic-input.js` into IBX's `spRec()` function:
```js
// 1. Auto-restart on onend (browser stops recognition ~60s)
recognition.onend = function() {
  if(shouldRestart && rec.isConnected) {
    var next = newRecognition();
    if(next){ currentRec=next; try{next.start()}catch(e){stopRec()} }
  } else { stopRec(); }
};

// 2. Accumulate FINAL results across restarts
var utteranceFinal = '';
recognition.onresult = function(e) {
  var interim = '';
  for(var i=e.resultIndex;i<e.results.length;i++){
    var t = e.results[i][0].transcript;
    if(e.results[i].isFinal) utteranceFinal += (utteranceFinal?' ':'')+t;
    else interim += t;
  }
  textarea.value = originalValue+(utteranceFinal?' ':'')+utteranceFinal+interim;
};

// 3. AI homophone/filler correction after stop
function correctWithAI(text, question, cb) {
  SAMPLE([{role:'system',content:'Fix homophones, punctuation, filler words only. Do not add content.'},
          {role:'user',content:'Question: '+question+'\nAnswer: '+text}], cb);
}
```

#### B. Reference Answer + Good vs Bad Comparison
**Effort:** Medium | **Impact:** High  
**What:** Add "💡 Reference" button to each question card. Shows a model answer. Optional "good vs bad" AI comparison.  
**How:** Port `reference-answer.js` pattern:
```js
// localStorage cache for reference answers
var REF_CACHE_KEY = 'ibx-ref-answers';
function refGet(qid) { try{return JSON.parse(localStorage.getItem(REF_CACHE_KEY)||'{}')[qid]||''}catch(e){return''} }
function refSet(qid, text) { var c=JSON.parse(localStorage.getItem(REF_CACHE_KEY)||'{}'); c[qid]=text; try{localStorage.setItem(REF_CACHE_KEY,JSON.stringify(c))}catch(e){} }

// Add button to card HTML (in cardHtml())
'<button class="btn sm ghost" onclick="openRef(\''+q.id+'\')">💡 Reference</button>'

// Generate reference answer via AI
function openRef(qid) {
  var q = QMAP[qid]; if(!q) return;
  var cached = refGet(qid);
  if(cached) { showSheet(cached); return; }
  SAMPLE([{role:'system',content:'You are a senior interviewer. Give a model answer.'},
          {role:'user',content:q.q}], function(ans){ refSet(qid,ans); showSheet(ans); });
}
```
- Add "Good vs Bad" mode: prompt AI for a high-score example + low-score example with critique

#### C. Session Export as Markdown
**Effort:** Low | **Impact:** Medium  
**What:** Export any mock interview session as a clean `.md` file  
**How:** Port `export-md.js` pattern — builds Markdown from session turns:
```js
function exportSessionMD(session) {
  var L=['# Mock Interview — '+new Date().toLocaleDateString(),''];
  (session.qs||[]).forEach(function(q,i){
    L.push('### Q'+(i+1)+' · '+q.q.slice(0,50)+'…','');
    L.push('**Question:** '+q.q,'');
    if(session.ans&&session.ans[q.id]) L.push('**Your answer:** '+session.ans[q.id],'');
    var ref=refGet(q.id);
    if(ref) L.push('> **Reference:** '+ref,'');
    L.push('---','');
  });
  saveFile('interview-session-'+Date.now()+'.md', L.join('\n'));
}
```

#### D. Company Interview Style Profiles
**Effort:** Low | **Impact:** High  
**What:** When user enters a company name in JD prep, adjust AI mock interviewer style  
**Source:** `references/company-profiles.md` — full profiles for 15+ companies  
**Companies covered:** Alibaba, ByteDance, Tencent, Baidu, Meituan, Google, Meta, Amazon, Microsoft, Apple, Huawei, Didi  
**PITB equivalent:** Add Pakistani govt/tech company profiles (PITB, NADRA, NTC, Jazz, Telenor, Arbisoft, Systems Limited)

```js
var COMPANY_STYLES = {
  'google':   {focus:'system design + coding clarity + trade-off reasoning', format:'45min technical + 45min behavioral'},
  'amazon':   {focus:'Leadership Principles + Dive Deep + measurable impact', format:'LP first then technical'},
  'meta':     {focus:'coding speed + scale problems + data-driven decisions', format:'2 coding + 1 system design'},
  'pitb':     {focus:'Laravel/PHP + delivery track record + govt system understanding', format:'technical + team lead behavioral'},
  'bytedance':{focus:'algorithms required + business impact + growth mindset', format:'2 algo + 1 system + 1 behavioral'},
};
function companyStyle(name) {
  var k=(name||'').toLowerCase();
  for(var c in COMPANY_STYLES) if(k.includes(c)) return COMPANY_STYLES[c];
  return null;
}
```

#### E. IndexedDB 3-Store Session Storage
**Effort:** High | **Impact:** Medium (future-proofing)  
**What:** Move IBX's mock session history from localStorage to IndexedDB (no 5MB limit)  
**How:** Port `storage.js` 3-store pattern:
- Store 1: `sessions` — full mock interview sessions (questions, answers, scores, timestamps)
- Store 2: `preferences` — user preferences (currently in `localStorage` key `ibx`)
- Store 3: `credentials` — API keys (currently in localStorage — move to more secure IDB)
```js
var IDB_NAME='ibx', IDB_VER=1;
function ibxOpenDB() {
  return new Promise(function(res,rej){
    var r=indexedDB.open(IDB_NAME,IDB_VER);
    r.onupgradeneeded=function(e){
      var db=e.target.result;
      if(!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions',{keyPath:'id'});
      if(!db.objectStoreNames.contains('prefs'))    db.createObjectStore('prefs',{keyPath:'id'});
    };
    r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)};
  });
}
```

#### F. PDF Resume Parsing
**Effort:** Medium | **Impact:** High  
**What:** Allow users to upload a PDF resume → parse text → use in JD↔CV match and mock interviewer context  
**How:**
- Copy `pdf.min.js` + `pdf.worker.min.js` to IBX server root (served at `http://localhost:8765/`)
- Load lazily when "Upload Resume PDF" button clicked
- Parse text from all pages → feed into JD prep AI prompt
```js
function parsePDF(file, cb) {
  if(!window.pdfjsLib) { var s=document.createElement('script'); s.src='/pdf.min.js'; s.onload=function(){parsePDF(file,cb)}; document.head.appendChild(s); return; }
  pdfjsLib.workerSrc='/pdf.worker.min.js';
  var reader=new FileReader();
  reader.onload=function(e){
    pdfjsLib.getDocument({data:e.target.result}).promise.then(function(pdf){
      var pages=[],i=0;
      function next(){ if(i>=pdf.numPages){cb(pages.join('\n'));return;}
        pdf.getPage(++i).then(function(p){p.getTextContent().then(function(tc){
          pages.push(tc.items.map(function(item){return item.str}).join(' ')); next(); }); }); }
      next();
    });
  };
  reader.readAsArrayBuffer(file);
}
```

#### G. BEI Framework Integration
**Effort:** Low | **Impact:** Medium  
**What:** Use Behavioral Event Interview framework from `references/bei-framework.md` in mock interviewer prompts  
**What it adds:** Structured behavioral question probing (specific past event → actions → outcome, not hypothetical)  
**How:** Add BEI prompt template as an option in IBX's mock interviewer system prompt

#### H. LLM Model Config UI
**Effort:** Low | **Impact:** Low  
**What:** Port `model-config.js` — a clean model selector dropdown (GPT-4o, Claude 3.5, Gemini, Mistral, Ollama)  
**How:** IBX already has "AI Connect" settings. Merge model-config.json defaults into IBX's AI settings panel.

---

## 3. Intervity

**Location:** `./Intervity/src/`  
**What it is:** React Native 0.76.5 offline AI mock interview app (100% on-device)  
**Key extractable files (pure logic, no React Native deps):**

```
Intervity/src/
  analytics/
    MistakeClassifier.ts (4.9KB)    — 4 mistake tiers: CONCEPTUAL, L4_CEILING, VAGUE, STRUCTURAL
    StarMethodEvaluator.ts (2.4KB)  — STAR score: Situation/Task/Action/Result with feedback
    SoftSkillsProsodyAnalyzer.ts    — WPM, pause detection, filler ratio analysis
  core/
    llm/
      SystemPrompts.ts (9KB)        — Full interviewer + coaching prompt templates
      OfflineLLMEngine.ts (15KB)    — llama.rn wrapper (mobile-only, not portable)
    agent/
      AgentCoachingHarness.ts (24KB) — 11 coaching strategy dispatcher
      TeddyDialogueEngine.ts        — Conversational coaching with persona tiers
      strategies/
        BehavioralLeadershipStrategy.ts  — Behavioral Q coaching
        EngineeringLeadershipStrategy.ts — System design/architecture coaching
        AnalogicalTeachingStrategy.ts    — Teach via analogy
        EmotionalSupportStrategy.ts      — Handle candidate stress/frustration
        HighScaleValidationStrategy.ts   — Validate large-scale system claims
        AiPlatformStrategy.ts            — AI/ML topic coaching
        ClientPerformanceStrategy.ts     — Client/browser performance coaching
        ProjectDiscoveryStrategy.ts      — Project deep-dive coaching
        StaffElevationStrategy.ts        — Staff/L6+ level framing
        RotatingCurriculumFallbackStrategy.ts — Fallback when no strategy matches
        MascotLevelUpFallbackStrategy.ts — Motivational fallback
    qbl/
      QBLEngine.ts (33KB)           — Adaptive curriculum engine
      QBLCurriculumGenerator.ts (40KB) — Curriculum from skill gaps
      QBLQuestionCatalog.ts (125KB) — Full question catalog with metadata
      domain/
        NodeJSDomain.ts (113KB)     — Node.js domain questions
    resume/
      OfflineResumeParser.ts        — Regex resume parser (skills, exp, education)
    stt/
      OfflineSpeechToTextService.ts — whisper.rn wrapper (mobile-only)
    tts/
      OfflineTtsService.ts          — Kokoro-82M TTS wrapper (mobile-only)
    voice/
      VoiceBiometricsService.ts     — Voice enrollment + speaker verification
    hardware/
      HardwareAccelerationManager.ts — GPU/NPU detection (mobile-only)
  database/
    SQLiteClient.ts                 — op-sqlite client
    DatabaseSchema.ts               — Full schema: sessions, skills, qbl, memory
    SessionStorageManager.ts        — Session CRUD
    QBLStorageManager.ts            — QBL progress CRUD
    SkillStorageManager.ts          — Skill mastery CRUD
    AgentMemoryRepository.ts        — Agent memory (episodic + semantic)
  types/index.ts (14KB)            — All TypeScript types (portable as JSDoc)
```

### Integration options

#### A. MistakeClassifier — Answer Diagnosis
**Effort:** Low | **Impact:** Very High  
**What:** After "Check my answer" in Speaking Coach → classify the mistake type and give golden response  
**4 mistake tiers:**
- `CONCEPTUAL` — Fundamental misunderstanding of architecture/runtime
- `L4_CEILING` — Correct happy path but missing failure modes (senior gaps)
- `VAGUE` — Buzzword usage without mechanics, numbers, or trade-offs
- `STRUCTURAL` — No quantified metrics, no "I did" ownership, no BLUF

**How to port (vanilla JS):**
```js
function classifyMistake(answer) {
  var t = answer.toLowerCase();
  // CONCEPTUAL — fundamental wrong
  if(t.includes('threads without locks')||t.includes('directly on gpu')) {
    return {cat:'CONCEPTUAL', critique:'Fundamental misunderstanding of runtime/architecture.',
      golden:'Explain the actual mechanism (e.g. JSI, memory ownership, thread boundaries).',
      model:'Always ground explanations in memory ownership and thread safety.'};
  }
  // L4_CEILING — missing failure modes
  if(t.includes('redis')&&!t.includes('stampede')&&!t.includes('eviction')&&!t.includes('lock')) {
    return {cat:'L4_CEILING', critique:'Correct but missing failure modes for senior level.',
      golden:'Mention cache stampede mitigation, eviction policies, and write storm handling.',
      model:'When discussing caching, always explain invalidation, concurrency, and eviction.'};
  }
  // VAGUE — no specifics
  if(t.length<80||(!t.includes('ms')&&!t.includes('%')&&!t.includes('per second'))) {
    return {cat:'VAGUE', critique:'Too vague — no mechanics, numbers, or trade-off reasoning.',
      golden:'Add specific numbers (latency, throughput, size), explain why you chose this approach.',
      model:'Never state what tech you used without quantifying the outcome.'};
  }
  // STRUCTURAL — no ownership/metrics
  if(!t.includes(' i ')&&!t.includes('latency')&&!t.includes('percent')&&!t.includes('reduced')) {
    return {cat:'STRUCTURAL', critique:'Missing personal ownership and measurable outcomes.',
      golden:'Use "I designed/implemented", add p99 latency, %, cost savings, user impact.',
      model:'BLUF: Bottom Line Up Front. Close with measurable business impact.'};
  }
  return null;
}
```
- Wire into `spAnalyse()` output — show after AI feedback
- Color-code by tier: CONCEPTUAL=red, L4_CEILING=orange, VAGUE=yellow, STRUCTURAL=blue

#### B. STAR Method Evaluator
**Effort:** Low | **Impact:** High  
**What:** Score behavioral answers (HR/behavioral questions) on the STAR framework  
**Scoring:** Situation (15%) + Task (15%) + Action (50%) + Result (20%) = 100  
**How to port:**
```js
function starEval(answer) {
  var t=answer.toLowerCase(), fb=[];
  var sit=(t.includes('when')||t.includes('project')||t.includes('team')||t.includes('while working'));
  var sitS=sit?15:5; if(!sit)fb.push('Set the business context or project scope clearly at the start.');
  var task=(t.includes('goal')||t.includes('needed to')||t.includes('problem')||t.includes('challenge'));
  var taskS=task?15:5; if(!task)fb.push('State the SLA, deadline, or specific engineering challenge.');
  var acts=(t.match(/\b(i implemented|i designed|i built|i led|i solved|i debugged|i refactored)\b/g)||[]).length;
  var actS=acts>=2?50:acts>=1?35:20; if(acts<1)fb.push('Take ownership: "I designed/implemented" not "we".');
  var res=(/\b(\d+%|\d+ms|\d+\s*seconds|\$\d+|\d+k|\d+\s*qps)\b/i.test(t)||t.includes('reduced')||t.includes('improved'));
  var resS=res?20:5; if(!res)fb.push('Quantify: latency reduction, cost savings, RPS, user impact.');
  return {situation:sitS,task:taskS,action:actS,result:resS,total:sitS+taskS+actS+resS,feedback:fb};
}
```
- Trigger on behavioral questions (tags: `behavioral`, `hr`, `leadership`, `levelwise`)
- Show star radar chart using IBX's existing SVG or simple bar display

#### C. Soft Skills Prosody Analyzer
**Effort:** Low | **Impact:** Medium  
**What:** After Whisper transcription — analyze WPM (words per minute), filler word ratio, pause patterns  
**IBX already has partial version in `spAnalyse()` — enhance it:**
```js
function prosodyAnalyze(text, durationSec) {
  var words=(text.match(/\S+/g)||[]).length;
  var wpm=durationSec>0?Math.round(words/(durationSec/60)):0;
  var FILLERS=/\b(um|uh|like|you know|basically|actually|literally|so|right|okay|hmm|err)\b/gi;
  var fillerCount=(text.match(FILLERS)||[]).length;
  var fillerRatio=words>0?Math.round(fillerCount/words*100):0;
  var rating=wpm>=120&&wpm<=160&&fillerRatio<5?'excellent':wpm>=100&&fillerRatio<10?'good':'needs work';
  return {
    wpm, words, fillerCount, fillerRatio,
    rating,
    advice: wpm<100?'Speak faster — aim for 120-160 WPM':wpm>180?'Slow down for clarity':
            fillerRatio>10?'Reduce fillers (um, uh, like) — pause instead':'Good pacing!'
  };
}
```
- Combine with Whisper `duration` (already returned by the improved server)

#### D. SystemPrompts — Interviewer Personas
**Effort:** Low | **Impact:** High  
**What:** Replace IBX's generic mock interviewer prompt with structured persona prompts  
**Source:** `SystemPrompts.ts` — adapt from Indian English to Pakistani English context

**Pakistani English persona (adapted from Bengaluru Tech Lead):**
```js
var INTERVIEWER_PROMPT = function(role, resume, company) {
  return 'You are a Senior Technical Interviewer at '+company+' in Lahore/Karachi/Islamabad '+
    'conducting a realistic mock interview for the role of '+role+'.\n\n'+
    'Candidate Resume:\n"""\n'+resume.slice(0,3000)+'\n"""\n\n'+
    'PAKISTANI TECH CONTEXT:\n'+
    '- Understand: BS-CS/BCS/MIT degrees, CGPA (4.0 scale), PITB/PASHA/P@SHA ecosystem\n'+
    '- Distinguish: IT services (Techlogix, NetSol, Systems Ltd) vs product (Airlift, Bazaar, Tajir)\n'+
    '- Understand: "done from" (graduated), "outstation" (outside city), PKR salary\n\n'+
    'RULES:\n'+
    '1. Ask ONE question at a time. Keep responses under 3 sentences.\n'+
    '2. No markdown — this may be spoken aloud.\n'+
    '3. Deep-dive into specific claims in the resume.\n'+
    '4. Acknowledge the previous answer briefly before the next question.';
};
```

#### E. 11 Coaching Strategies
**Effort:** Medium | **Impact:** High  
**What:** IBX's AI Coach sends a generic prompt. Map each question category to a specialized coaching strategy.  
**11 strategies from `AgentCoachingHarness.ts`:**

| Strategy | Trigger | What it does |
|----------|---------|-------------|
| `BehavioralLeadershipStrategy` | Tags: `behavioral`, `hr`, `leadership` | STAR framework, quantified outcomes, personal ownership |
| `EngineeringLeadershipStrategy` | Tags: `architecture`, `system-design` | Trade-off reasoning, scalability, reliability patterns |
| `AnalogicalTeachingStrategy` | When concept is abstract | Explains via real-world analogy |
| `EmotionalSupportStrategy` | Low score, repeated failures | Encouragement, reframe the learning |
| `HighScaleValidationStrategy` | Scale claims in answer | Validates throughput/latency numbers are realistic |
| `AiPlatformStrategy` | Tags: `ai`, `llm`, `ml` | RAG, fine-tuning, inference optimization |
| `ClientPerformanceStrategy` | Tags: `frontend`, `react`, `performance` | Core Web Vitals, bundle size, rendering |
| `ProjectDiscoveryStrategy` | Tags: `project-specific` | Deep-dive into past work, extract specifics |
| `StaffElevationStrategy` | User is senior+ | L6 framing, org impact, technical leadership |
| `RotatingCurriculumFallbackStrategy` | No specific match | Rotate through weak topics |
| `MascotLevelUpFallbackStrategy` | Any | Motivational — "You're getting better at X!" |

**How to wire into IBX's Coach view:**
```js
function pickCoachStrategy(q) {
  var t=q.t||[];
  if(t.some(function(x){return /behavioral|hr|leadership/.test(x)})) return 'behavioral';
  if(t.some(function(x){return /architecture|system|design/.test(x)})) return 'engineering';
  if(t.some(function(x){return /ai|llm|ml|agent/.test(x)})) return 'ai_platform';
  if(t.some(function(x){return /react|frontend|css|performance/.test(x)})) return 'client_perf';
  if(q.l==='s') return 'staff_elevation';
  return 'rotating_fallback';
}
```

#### F. Adaptive QBL Curriculum
**Effort:** High | **Impact:** High (long-term)  
**What:** Instead of random question selection, build a curriculum from weak skill gaps  
**Source:** `QBLEngine.ts` — tracks mastery per skill node, generates next question adaptively  
**How (simplified port):**
```js
// Skill mastery tracker (per tag)
function getSkillMastery(tag) {
  var m=JSON.parse(localStorage.getItem('ibx-mastery')||'{}');
  return m[tag]||{attempts:0,correct:0,lastSeen:0};
}
function updateSkillMastery(tag, correct) {
  var m=JSON.parse(localStorage.getItem('ibx-mastery')||'{}');
  var s=m[tag]||{attempts:0,correct:0,lastSeen:0};
  s.attempts++; if(correct)s.correct++; s.lastSeen=Date.now();
  m[tag]=s; localStorage.setItem('ibx-mastery',JSON.stringify(m));
}
// Pick next question from weakest skill
function qblPickNext() {
  var tags=Object.keys(TMAP);
  var weakest=tags.sort(function(a,b){
    var ma=getSkillMastery(a), mb=getSkillMastery(b);
    var ra=ma.attempts?ma.correct/ma.attempts:0, rb=mb.attempts?mb.correct/mb.attempts:0;
    return ra-rb; // lowest mastery ratio first
  })[0];
  var pool=QS.filter(function(q){return q.t.includes(weakest)&&!S.done[q.id]});
  return pool[Math.floor(Math.random()*pool.length)]||QS[Math.floor(Math.random()*QS.length)];
}
```

#### G. Voice Biometrics (Speaker Verification)
**Effort:** High | **Impact:** Low-Medium  
**What:** Enroll voice → verify speaker during mock interview (ensure it's the same person)  
**Source:** `VoiceBiometricsService.ts` — MFCC fingerprint + cosine similarity  
**Note:** Experimental. Useful for "cheat prevention" in self-assessment mode.

#### H. Agent Memory (Episodic + Semantic)
**Effort:** Medium | **Impact:** Medium  
**What:** IBX's Coach chat has no memory across sessions. Port `AgentMemoryRepository.ts` pattern.  
**Episodic memory:** Remember "last session, you struggled with Redis eviction"  
**Semantic memory:** Know "user is a Senior Laravel dev targeting PITB Senior SWE role"  
```js
// Simple agent memory in localStorage
var AGENT_MEM_KEY='ibx-agent-mem';
function agentMemLoad() { try{return JSON.parse(localStorage.getItem(AGENT_MEM_KEY)||'{}')}catch(e){return{}} }
function agentMemSave(m) { try{localStorage.setItem(AGENT_MEM_KEY,JSON.stringify(m))}catch(e){} }
function agentMemRecord(type, content) {
  var m=agentMemLoad();
  if(!m[type])m[type]=[];
  m[type].push({t:Date.now(),v:content});
  if(m[type].length>50)m[type]=m[type].slice(-50); // keep last 50
  agentMemSave(m);
}
```

---

## Priority Roadmap

### 🔴 High Impact, Low Effort — Do First
| # | Feature | Source | Effort | Where in IBX |
|---|---------|--------|--------|-------------|
| 1 | **MistakeClassifier** — answer diagnosis | Intervity | 2h | `spAnalyse()` output |
| 2 | **STAR Evaluator** — behavioral scoring | Intervity | 1h | `spAnalyse()` for behavioral Qs |
| 3 | **Auto-restart SpeechRecognition** | interview-skills mic-input.js | 1h | `spRec()` function |
| 4 | **SystemPrompts interviewer persona** (Pakistani) | Intervity | 1h | Mock interviewer `SAMPLE()` |
| 5 | **Reference answer + good/bad** | interview-skills reference-answer.js | 3h | Question cards |
| 6 | **Session export as Markdown** | interview-skills export-md.js | 2h | Mock/Progress views |
| 7 | **Prosody analyzer** (WPM/fillers) | Intervity | 1h | `spAnalyse()` + Whisper duration |

### 🟡 High Impact, Medium Effort
| # | Feature | Source | Effort | Where in IBX |
|---|---------|--------|--------|-------------|
| 8 | **Company interview style profiles** (PITB/Google/Amazon) | interview-skills PRD | 3h | JD prep view |
| 9 | **11 Coaching strategies** | Intervity AgentCoachingHarness | 4h | AI Coach view |
| 10 | **AI contextual lookup with cache** | Dictionariez ai-lookup.js | 3h | Question cards |
| 11 | **PDF resume parsing** | interview-skills pdf.min.js | 2h | JD prep view |
| 12 | **Adaptive QBL curriculum** | Intervity QBLEngine | 5h | Library/SRS view |

### 🟢 Medium Impact, Medium Effort
| # | Feature | Source | Effort | Where in IBX |
|---|---------|--------|--------|-------------|
| 13 | **Anki flashcard export** | Dictionariez ankiwindow.js | 2h | Question card actions |
| 14 | **Word hover dictionary** | Dictionariez plain-lookup.js | 4h | Question/answer text |
| 15 | **Agent memory** (cross-session) | Intervity AgentMemoryRepository | 3h | AI Coach view |
| 16 | **IndexedDB session storage** | interview-skills storage.js | 5h | Mock sessions |
| 17 | **Urdu/Arabic dictionary** | Dictionariez (extend) | 3h | Library Urdu mode |

### 🔵 Lower Priority
| # | Feature | Source | Effort |
|---|---------|--------|--------|
| 18 | TTS player web component | Dictionariez (397KB bundle) | 4h |
| 19 | BEI framework behavioral coaching | interview-skills bei-framework.md | 2h |
| 20 | Voice biometrics enrollment | Intervity VoiceBiometricsService | 8h |
| 21 | Full QBL question catalog port | Intervity QBLQuestionCatalog (125KB) | 6h |
| 22 | LLM model config UI | interview-skills model-config.js | 2h |
| 23 | Reliable lang detection (browser API) | Dictionariez detectLanguage.js | 1h |

---

## Integration Patterns

### Pattern 1: Port TypeScript to vanilla JS
Most Intervity files are pure logic with no React Native imports. Steps:
1. Copy the class body
2. Remove TypeScript types (`type`, `interface`, `: string`, `<T>`, etc.)
3. Convert `class Foo { method() {} }` → `var Foo = { method: function() {} }`
4. Replace `import` → inline into IBX `<script>`

### Pattern 2: Inject via patch script
All IBX JS changes use the patch pattern established in `patch-whisper-improvements.js`:
```js
// patch-something.js
const OLD = `function existingFn(...)`;
const NEW = `function existingFn(...) { /* improved */ }`;
h = h.replace(OLD, NEW);
fs.writeFileSync(HTML, h);
```

### Pattern 3: Add new function after existing one
To add a new function without touching existing code:
```js
const INJECT_AFTER = `function spAnalyse()`; // find the end of this function
// use the depth-counting pattern to find exact end
// then inject NEW_FN right after
```

### Pattern 4: Load large assets lazily
For big files (pdf.min.js, tts-player-webcomponent.bundle.js):
```js
function loadScript(src, cb) {
  if(document.querySelector('script[src="'+src+'"]')){ cb&&cb(); return; }
  var s=document.createElement('script'); s.src=src; s.onload=cb;
  document.head.appendChild(s);
}
// Usage: loadScript('/pdf.min.js', function() { parsePDF(file, cb); });
```

### Pattern 5: Cache-first AI calls
From Dictionariez `ai-lookup.js` + `localStorageCache.js`:
```js
function ibxCacheFactory(ns, max) {
  return {
    get: function(k){ var c=JSON.parse(localStorage.getItem(ns)||'{}'); return c[k]||null; },
    set: function(k,v){ var c=JSON.parse(localStorage.getItem(ns)||'{}');
      var keys=Object.keys(c); if(keys.length>=max)delete c[keys[0]];
      c[k]=v; try{localStorage.setItem(ns,JSON.stringify(c))}catch(e){} }
  };
}
```

---

## Future Integration Options

### From other open-source projects (to research)

| Project | What to integrate | Link |
|---------|-----------------|------|
| **AnkiConnect** | Export Q&A as flashcards to Anki desktop | github.com/FooSoft/anki-connect |
| **Web Speech API polyfill** | Fixes recognition on non-Chrome browsers | github.com/nicktindall/cyclon.p2p |
| **compromise.js** (NLP) | Better filler detection, sentence parsing | github.com/spencermountain/compromise |
| **Tesseract.js** | OCR — scan resume image → text | github.com/naptha/tesseract.js |
| **highlight.js** | Syntax highlighting for code in answers | highlightjs.org |
| **Marked.js** | Render Markdown in answer display | marked.js.org (already may be in IBX) |
| **Chart.js** | Progress charts, skill radar chart | chartjs.org |
| **Mermaid.js** | Render system design diagrams in answers | mermaid.js.org |
| **fuse.js** | Better fuzzy search in Library | fusejs.io |
| **idb** | Clean IndexedDB wrapper | github.com/jakearchibald/idb |

### Ideas not yet from any project

| Idea | Complexity | Notes |
|------|-----------|-------|
| **Screenshare interview mode** | High | Detect when user is screen-sharing → adjust UI to interviewer-friendly view |
| **Interview calendar** | Low | Set interview date → countdown timer + spaced repetition schedule |
| **Pair practice mode** | Medium | Two users on same localhost network practice together |
| **Answer template generator** | Low | Generate STAR/BLUF/PAR template for any question type |
| **Weak topic heatmap** | Medium | Visual heatmap of question tags by performance |
| **Voice stress analysis** | High | Detect nervousness from audio features (pitch variance, speech rate spikes) |
| **Custom question importer** | Low | Paste any text/URL → AI extracts Q&A pairs → adds to bank |
| **Interview debrief mode** | Medium | After mock session, AI plays back your worst answers with suggested improvements |
| **Timer presets per company** | Low | Google: 45min, PITB: 30min, phone screen: 20min |
| **Roman Urdu keyboard layout** | Low | Phonetic keyboard overlay for Urdu script input |

---

## Notes & Constraints

### What to avoid
- **Do not** add external CDN dependencies (breaks offline usage)
- **Do not** make the HTML > ~6MB (browser parse time becomes noticeable)
- **Do not** use `eval()` — IBX uses `Function()` constructor for dynamic bank parsing, keep that pattern
- **Do not** break the `<script id="bank">` JSON (2474 questions — always verify count after patches)
- **Do not** touch the backup/restore flow without testing (`localStorage.setItem(KEY, ...)`)

### File size budget
| File | Current | Budget |
|------|---------|--------|
| `interview-box.html` | 3.54 MB | < 6 MB |
| `whisper_server.py` | 14 KB | — |
| New script files (e.g. pdf.min.js) | — | Serve separately, load lazy |

### Ports confirmed working
- `merge-banks.js` — bank merge ✓
- `patch-whisper-improvements.js` — 11 patches ✓
- `patch-translation.js` — trGet fallback + urToRoman ✓

### Backup files present
```
interview-box.html.bak-20261020-182031       (original)
interview-box.html.bak-merge-2026-10-21...   (after bank merge)
interview-box.html.bak-patch-2026-10-21...   (after whisper patches)
```
Always create a new `.bak-*` before any patch.

---

## 4. urduify

**Location:** `./urduify/`  
**Status:** ✅ INTEGRATED (2026-10-21) — engine compiled into `ibx-transliteration.js`  
**What it is:** Roman Urdu ↔ Urdu script translator (Flask API + JS frontend, built at Folio3)

```
urduify/
  application/
    main.py           — Core translation logic: Roman_to_urdu(), urdutoroman(), urdu_lang_dict
    api.py            — Flask API: GET /translate?text=&from_lang=ru&to_lang=u
    dataset_1.txt     — 16,094 Roman-Urdu ↔ Urdu CSV word pairs (PRIMARY DICT)
    dataset_2.txt     — 584 parallel Roman/Urdu sentence pairs (word alignment source)
    roman_to_urdu.pickle — Pickled model (not needed, logic ported to JS)
    urdu_to_roman.pickle — Pickled model (not needed, logic ported to JS)
  preprocessing/
    data/
      English-Urdu-Roman.txt  — 501 English:Urdu:Roman interview vocabulary triples ⭐
      urdu roman.tsv          — 4,108 pairs with confidence scores (filtered ≥0.75)
      urdu roman.txt          — 584 parallel sentence pairs (same as dataset_2)
      UrduHighFreqList.xlsx   — High-frequency Urdu words
      neg.txt / pos.txt       — Sentiment datasets (not used in translation)
    preprocessing.ipynb       — Data preprocessing notebook
  user_interface/
    js/script.js      — Browser fetch to Flask API + exchange button
    js/languages.js   — Language codes: {ru: "Roman Urdu", u: "Urdu"}
```

### Key data extracted
- `urdu_lang_dict` from `main.py` — 42-char Urdu→Roman map with position-aware output (word-initial/medial/final)
- `dataset_1.txt` — 16,091 Roman→Urdu word pairs (largest dictionary source)
- `urdu roman.tsv` — 3,944 high-confidence pairs (confidence ≥ 0.75 filter applied)
- `English-Urdu-Roman.txt` — 501 interview tech vocabulary triples (News=خبر=khabar, Teacher=استاد=ustaad, etc.)

### What was integrated
All data compiled into `ibx-transliteration.js` (636KB). See next section for full details.

---

## 5. Transliteration-RomantoUrdu-And-ViceVersa

**Location:** `./Transliteration-RomantoUrdu-And-ViceVersa/`  
**Status:** ✅ INTEGRATED (2026-10-21) — character map compiled into `ibx-transliteration.js`  
**What it is:** Python notebook using `urduhack` + manual Unicode char map for Urdu↔Roman transliteration

```
Transliteration-RomantoUrdu-And-ViceVersa/
  main.ipynb        — Jupyter notebook with roman_urdu_Dict + roman2Urdu() + urdu2Roman()
  urdu roman.txt    — 584 parallel Roman/Urdu sentence pairs (same data as urduify)
  README.md         — Setup instructions for urduhack
```

### Key data extracted
- `roman_urdu_Dict` from `main.ipynb` — 48-entry Unicode char → Roman letter map  
  (e.g. `\u0627`→A, `\u0628`→B, `\u067E`→P, `\u0686`→CH, `\u062E`→KH, `\u0634`→SH, `\u063A`→GH)
- `roman2Urdu()` + `urdu2Roman()` functions — character-level bidirectional conversion
- Used as **fallback** in `ibx-transliteration.js` when word-level lookup fails

---

## 6. ibx-transliteration.js (built from projects 4 + 5)

**Location:** `./ibx-transliteration.js`  
**Status:** ✅ BUILT + INTEGRATED into interview-box.html  
**Size:** 636 KB  
**Served at:** `http://localhost:8765/ibx-transliteration.js` (loaded lazily)

### Dictionary sizes
| Source | Entries | Type |
|--------|---------|------|
| dataset_1.txt | 16,091 rows → 13,084 unique | Roman→Urdu word pairs |
| urdu roman.tsv (conf ≥ 0.75) | 3,944 rows | Urdu→Roman + English |
| English-Urdu-Roman.txt | 501 triples | English+Urdu+Roman interview vocab |
| urdu roman.txt (word-aligned) | 187 pairs | From 584 parallel sentences |
| **RU2UR total** | **13,084** | Roman Urdu → Urdu script |
| **UR2RU total** | **12,956** | Urdu script → Roman Urdu |
| **TECH_TERMS** | **501** | English ↔ Urdu ↔ Roman triples |

### Exported API (`window.IBX_TR`)
```js
IBX_TR.romanToUrdu(text)         // "aap kya kar rahe hain" → "آپ کیا کار رہے ہیں"
IBX_TR.urduToRoman(text)         // "ہے کیا" → "hai kya"
IBX_TR.lookupRoman(word)         // "hai" → "ہے"
IBX_TR.lookupUrdu(word)          // "ہے" → "hai"
IBX_TR.translateEnToUrdu(word)   // "Teacher" → {ur:"استاد", ru:"ustaad"}
IBX_TR.getTechTerms()            // full 501-entry array [{en,ur,ru}]
IBX_TR.findTechTerm(query)       // search by English/Roman/Urdu substring
IBX_TR.stats                     // {ru2ur:13084, ur2ru:12956, tech:501}
```

### How it's wired into interview-box.html (7 patches via patch-transliteration.js)

| Patch | Effect |
|-------|--------|
| `loadTranslit()` lazy loader | Loads 636KB engine only when first needed — no startup cost |
| `urToRoman()` upgraded | Was 80-word RU_HINTS stub → now 12,956-word IBX_TR dictionary |
| `romanToUrdu()` new function | New function added alongside urToRoman for reverse direction |
| `isUrduScript()` improved | Adds direct Unicode range check as backup to arabicShare() |
| `trGet()` auto-generate | When Roman Urdu translation is not cached, auto-generates it from Urdu via IBX_TR.urduToRoman() |
| `spAnalyse()` transliteration | After "Check my answer": if Roman Urdu answer → shows Urdu script version; if Urdu answer → shows Roman Urdu |
| Whisper `onFinal` enhanced | Whisper's `roman_hint` (server 80-word table) replaced with IBX_TR's full dictionary |
| `openExplain()` tech terms | When explaining a question, shows Urdu + Roman Urdu of matched tech terms |

### Algorithm: romanToUrdu(text)
1. Split text into words
2. For each word: **exact lookup** in RU2UR dict (13,084 entries)
3. If not found: try **variant spellings** (ee→i, oo→u, aa→a, ph→f, add trailing vowel)
4. If still not found: **character-level fallback** via RO_CHAR_MAP (digraph-aware: CH, KH, SH, GH, AA, AH)

### Algorithm: urduToRoman(text)
1. Split text into words
2. For each word: **exact lookup** in UR2RU dict (12,956 entries)
3. If not found: **character-level fallback** via UR_CHAR_MAP (position-aware: word-initial/medial/final)

### Sample results
| Roman Urdu | Urdu Script | Direction |
|------------|-------------|-----------|
| hai | ہے | R→U ✓ |
| kya | کیا | R→U ✓ |
| aap | آپ | R→U ✓ |
| matlab | مطلب | R→U ✓ |
| zaroorat | ضرورت | R→U ✓ |
| theek | ٹھیک | R→U ✓ |
| ہے | hai | U→R ✓ |
| کیا | kya | U→R ✓ |
| آپ | aap | U→R ✓ |
| مطلب | matlab | U→R ✓ |

### Future improvements for ibx-transliteration.js
- Add more variant spellings (aur/or, nahi/nai/nahin, hoon/hun)
- Add English tech loanword passthrough list (laravel, docker, redis → keep as-is, don't transliterate)
- Add diacritic normalization (strip ً ٍ ً from Urdu before lookup)
- Add Punjabi word pairs from `urduify/preprocessing/data/UrduHighFreqList.xlsx`
- Add sentence-level confidence scoring based on word hit rate
- Pre-load at startup (not lazy) if user has Roman Urdu mode selected

