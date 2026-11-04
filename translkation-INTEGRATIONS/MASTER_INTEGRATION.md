# Interview Box — Master Integration Reference
**Last updated:** 2026-10-21  
**System:** `interview-box.html` (3.55 MB · 2474 questions · localhost:8765)  
**Status:** Single source of truth — all 10 projects analyzed, integration paths defined, progress tracked

---

## Table of Contents
1. [What IBX Already Has](#1-what-ibx-already-has)
2. [The Big Picture — How All Projects Compose](#2-the-big-picture)
3. [Project Statuses at a Glance](#3-project-statuses-at-a-glance)
4. [Language Layer Projects](#4-language-layer)
   - 4.1 [urduify](#41-urduify--integrated)
   - 4.2 [Transliteration-RomantoUrdu-And-ViceVersa](#42-transliteration-romantourduu-and-viceversa--integrated)
   - 4.3 [ibx-transliteration.js](#43-ibx-transliterationjs--built--live)
   - 4.4 [roman-urdu-translator](#44-roman-urdu-translator--pending-merge)
   - 4.5 [urduhack](#45-urduhack--pending-port)
   - 4.6 [Urdu-English-Word-Frequency-Analyzer](#46-urdu-english-word-frequency-analyzer--pending-port)
   - 4.7 [UTRNet — Urdu OCR](#47-utrnet--optional-service)
5. [Interview Intelligence Projects](#5-interview-intelligence-layer)
   - 5.1 [Intervity](#51-intervity--pending-integration)
   - 5.2 [interview-skills](#52-interview-skills--pending-integration)
   - 5.3 [dictionariez](#53-dictionariez--pending-integration)
6. [Knowledge Base Projects](#6-knowledge-base-layer)
   - 6.1 [PAKGOV-RAG-project](#61-pakgov-rag-project--pending-integration)
7. [Master Priority Roadmap](#7-master-priority-roadmap)
8. [Integration Patterns (How-To)](#8-integration-patterns)
9. [Data Flows — End to End](#9-data-flows)
10. [File Inventory](#10-complete-file-inventory)
11. [Future Ideas](#11-future-ideas)
12. [Architecture Constraints & Rules](#12-architecture-constraints--rules)

---

## 1. What IBX Already Has

### interview-box.html — Current Features
| Feature | Implementation | Status |
|---------|---------------|--------|
| Question bank | 2474 questions in `<script id="bank">` JSON | ✅ |
| AI abstraction | `SAMPLE()` — OpenRouter, Puter, Groq, Gemini, Mistral, Ollama, xAI, Fireworks | ✅ |
| State persistence | `localStorage` key `ibx` + IndexedDB translation cache | ✅ |
| TTS/Audio | `speechSynthesis` via `speakSeg()`, `pickVoice()`, `startPlayer()` | ✅ |
| STT (browser) | `SpeechRecognition` in Chrome | ✅ |
| STT (offline) | Whisper Flask server port 5051 — auto-enable, Roman Urdu post-proc | ✅ |
| Language support | English, Urdu RTL (Nastaliq), Hindi, Roman Urdu, Punjabi | ✅ |
| Mock interviewer | Timer, scorecard, cross-questions, AI feedback | ✅ |
| Speaking coach | Voice practice, `spAnalyse()`, WPM, fillers | ✅ |
| Translation | `trGet()`/`trSave()` with fallback chain ru→ur→hi, auto-gen via IBX_TR | ✅ |
| Transliteration | `ibx-transliteration.js` — 13K Roman↔Urdu dict (lazy-loaded) | ✅ |
| JD prep | JD parser, tech stack extraction, question prediction | ✅ |
| SQL Lab | Interactive SQLite practice | ✅ |
| Spaced repetition | `srsDue()` scheduling | ✅ |
| Export/backup | JSON backup/restore | ✅ |

### Whisper Server (whisper_server.py v2.0) — Current Features
| Feature | Status |
|---------|--------|
| Offline STT via OpenAI Whisper | ✅ |
| WAV conversion via ffmpeg | ✅ |
| Roman Urdu post-processing (80-word table) | ✅ (needs upgrade to IBX_TR) |
| `/progress`, `/health`, `/models`, `/languages` endpoints | ✅ |
| Confidence score + duration in response | ✅ |
| Threaded mode (concurrent requests) | ✅ |

---

## 2. The Big Picture

All 10 external projects fill **4 distinct layers** — none overlap, they compose:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    INTERVIEW BOX (localhost:8765)                    │
│                                                                      │
│  Library (2474 Qs) │ Speaking Coach │ Mock Interview │ AI Coach     │
└─────────┬──────────┴───────┬─────────┴──────┬─────────┴──────┬──────┘
          │                  │                │                │
          ▼                  ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: LANGUAGE (Urdu NLP pipeline)                              │
│                                                                     │
│  ibx-transliteration.js (636KB, lazy)                              │
│  ├── urduify:       13,084 Roman→Urdu words                        │
│  ├── Transliteration: 48-char Unicode map                           │
│  ├── roman-urdu-translator: +30,888 Urdu→Roman ← MERGE NEEDED      │
│  └── urduhack:      71-char normalization  ← PORT NEEDED           │
│                                                                     │
│  Whisper (port 5051) + roman-urdu-translator ONNX (browser, 84MB) │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                │                │
          ▼                  ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: INTERVIEW INTELLIGENCE                                    │
│                                                                     │
│  Intervity (port to JS):                                           │
│  ├── MistakeClassifier  → spAnalyse() ← PENDING                   │
│  ├── STAR Evaluator     → spAnalyse() ← PENDING                   │
│  ├── Prosody Analyzer   → spAnalyse() ← PENDING                   │
│  └── Pakistani persona  → Mock SAMPLE() ← PENDING                 │
│                                                                     │
│  interview-skills (port to JS):                                    │
│  ├── Auto-restart STT   → spRec() ← PENDING                       │
│  ├── Reference answers  → question cards ← PENDING                │
│  ├── Session MD export  → Mock/Progress ← PENDING                 │
│  └── Company profiles   → JD prep ← PENDING                       │
│                                                                     │
│  dictionariez (port to JS):                                        │
│  ├── AI lookup cache    → question cards ← PENDING                │
│  └── Anki export        → question actions ← PENDING              │
└─────────────────────────────────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: KNOWLEDGE BASE                                            │
│                                                                     │
│  PAKGOV-RAG (port 8501, optional Streamlit service):               │
│  ├── 6,711 Pakistan govt document chunks (R@5 = 74%)               │
│  ├── Constitution + PPC + CrPC + ESTACODE + Senate rules           │
│  ├── Bilingual English+Urdu retrieval (similarity 0.837)           │
│  └── 50 verified Q&A → import to IBX bank ← QUICK WIN             │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: INPUT / OCR (optional)                                    │
│                                                                     │
│  UTRNet OCR (port 5052, optional PyTorch service):                 │
│  └── Read Urdu text from scanned images/PDFs                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Statuses at a Glance

| # | Project | Status | Key Asset | Impact |
|---|---------|--------|-----------|--------|
| 1 | **urduify** | ✅ Integrated | 16K Roman→Urdu dict | Language |
| 2 | **Transliteration-*** | ✅ Integrated | 48-char Unicode map | Language |
| 3 | **ibx-transliteration.js** | ✅ Built + Live | 13K dict, `window.IBX_TR` | Language |
| 4 | **roman-urdu-translator** | ⏳ Merge data | 30,888 Urdu→Roman map + ONNX model | Language ⭐ |
| 5 | **urduhack** | ⏳ Port 71 mappings | Arabic-variant normalization | Language ⭐ |
| 6 | **Urdu-English-Word-Freq** | ⏳ Port 20 lines | Word frequency counter | Analytics |
| 7 | **UTRNet** | 🔵 Optional service | Urdu OCR (180 glyphs) | Input |
| 8 | **Intervity** | ⏳ Port to JS | MistakeClassifier + STAR + Prosody | Analytics ⭐ |
| 9 | **interview-skills** | ⏳ Port to JS | Auto-restart STT + Ref answers + MD export | UX ⭐ |
| 10 | **dictionariez** | ⏳ Port patterns | AI lookup cache + Anki export | UX |
| 11 | **PAKGOV-RAG** | ⏳ Import data / service | 6,711 Pakistan law chunks | Knowledge ⭐ |

**Legend:** ✅ Done · ⏳ Next · 🔵 Optional/later · ⭐ High priority

---

## 4. Language Layer

---

### 4.1 urduify ✅ INTEGRATED

**Location:** `./urduify/`  
**What it is:** Roman Urdu ↔ Urdu script translator (Flask API + JS frontend, built at Folio3)

```
urduify/application/
  main.py           — Roman_to_urdu(), urdutoroman(), urdu_lang_dict (42 chars, position-aware)
  api.py            — Flask: GET /translate?text=&from_lang=ru&to_lang=u
  dataset_1.txt     — 16,094 Roman↔Urdu CSV word pairs  ← PRIMARY DICT SOURCE
  dataset_2.txt     — 584 parallel Roman/Urdu sentence pairs
urduify/preprocessing/data/
  English-Urdu-Roman.txt  — 501 English:Urdu:Roman interview vocabulary triples ⭐
  urdu roman.tsv          — 4,108 pairs with confidence scores (filtered ≥0.75)
  urdu roman.txt          — 584 parallel sentence pairs
  UrduHighFreqList.xlsx   — High-frequency Urdu words (Punjabi pairs inside too)
```

**What was extracted into ibx-transliteration.js:**
- 16,091 CSV word pairs → 13,084 unique entries in RU2UR dict
- 3,944 TSV pairs (confidence ≥ 0.75) → merged into UR2RU dict
- 501 English+Urdu+Roman triples → TECH_TERMS array
- 42-char urdu_lang_dict → UR_CHAR_MAP (position-aware: initial/medial/final)

**Still to do:**
- Extract Punjabi pairs from `UrduHighFreqList.xlsx` and add to dict

---

### 4.2 Transliteration-RomantoUrdu-And-ViceVersa ✅ INTEGRATED

**Location:** `./Transliteration-RomantoUrdu-And-ViceVersa/`  
**What it is:** Python notebook using `urduhack` + manual Unicode char map

```
main.ipynb    — roman_urdu_Dict (48 Unicode chars → Roman), roman2Urdu(), urdu2Roman()
urdu roman.txt — 584 parallel sentences (same data as urduify)
```

**What was extracted:** 48-entry `roman_urdu_Dict` → `RO_CHAR_MAP` in `ibx-transliteration.js`  
**Role:** Character-level fallback when word lookup fails

---

### 4.3 ibx-transliteration.js ✅ BUILT + LIVE

**Location:** `./ibx-transliteration.js`  
**Size:** 636 KB  
**Served at:** `http://localhost:8765/ibx-transliteration.js` (lazy-loaded via `loadTranslit()`)

#### Dictionary sizes
| Source | Entries | Type |
|--------|---------|------|
| urduify dataset_1.txt | 16,091 → 13,084 unique | Roman Urdu → Urdu script |
| urduify urdu roman.tsv (conf ≥ 0.75) | 3,944 | Urdu → Roman |
| urduify English-Urdu-Roman.txt | 501 | English+Urdu+Roman triples |
| Sentence word-alignment | 187 | Extracted from 584 parallel sentences |
| **RU2UR total** | **13,084** | Roman Urdu → Urdu script |
| **UR2RU total** | **12,956** | Urdu script → Roman Urdu |
| **TECH_TERMS** | **501** | English ↔ Urdu ↔ Roman interview vocab |

#### Exported API (`window.IBX_TR`)
```js
IBX_TR.romanToUrdu(text)          // "aap kya kar rahe hain" → "آپ کیا کار رہے ہیں"
IBX_TR.urduToRoman(text)          // "مطلب" → "matlab"
IBX_TR.lookupRoman(word)          // "hai" → "ہے"
IBX_TR.lookupUrdu(word)           // "ہے" → "hai"
IBX_TR.translateEnToUrdu(word)    // "Teacher" → {ur:"استاد", ru:"ustaad"}
IBX_TR.getTechTerms()             // [{en,ur,ru}] × 501
IBX_TR.findTechTerm(query)        // search by English / Roman / Urdu substring
IBX_TR.stats                      // {ru2ur:13084, ur2ru:12956, tech:501}
```

#### How it's wired into interview-box.html (7 patches)
| Patch | Effect |
|-------|--------|
| `loadTranslit()` lazy loader | 636KB loads only on first use |
| `urToRoman()` upgraded | Was 80-word stub → now 12,956-word dict |
| `romanToUrdu()` new function | Reverse direction added |
| `isUrduScript()` improved | Unicode range check + arabicShare() |
| `trGet()` auto-generate | Auto-generates Roman Urdu from cached Urdu via IBX_TR |
| `spAnalyse()` transliteration | Roman Urdu answer → shows Urdu script; Urdu → Roman |
| Whisper `onFinal` enhanced | Server 80-word hint → IBX_TR full dictionary |

#### Algorithm
**romanToUrdu:** word exact lookup → variant spellings (ee→i, oo→u, ph→f) → char-level digraph fallback (CH/KH/SH/GH/AA)  
**urduToRoman:** word exact lookup → position-aware char-level fallback (initial/medial/final)

#### Verified sample results
| Input | Output | Direction |
|-------|--------|-----------|
| hai | ہے | R→U ✓ |
| kya | کیا | R→U ✓ |
| matlab | مطلب | R→U ✓ |
| zaroorat | ضرورت | R→U ✓ |
| theek | ٹھیک | R→U ✓ |
| ہے | hai | U→R ✓ |
| مطلب | matlab | U→R ✓ |

---

### 4.4 roman-urdu-translator ⏳ PENDING MERGE

**Location:** `./roman-urdu-translator/`  
**What it is:** A from-scratch Transformer (81M params, ONNX-exported) trained on **1.81M sentence pairs** for bidirectional English ↔ Roman Urdu translation. Runs 100% in browser via ONNX Runtime Web.

```
roman-urdu-translator/
  roman_urdu_map.json (744KB) — 30,888 Urdu word → Roman Urdu (mined, not handcrafted) ⭐
  tokenizer_joint.json (1.67MB) — 24,000 BPE vocab + 23,738 merge rules
  web/
    urdu.js     — Transliterator class: NFC normalize → diacritic strip → run-level lookup → char fallback
    tokenizer.js — Full byte-level BPE tokenizer in pure JS (no deps)
    translator.js — ONNX greedy decoder (encoder once, decoder per token)
  model.py      — PyTorch model definition (training, not needed at runtime)
  corpus.py     — Corpus builder (training)
  config.py     — Model hyperparameters
```

**Key facts:**
- BLEU: 23.2 en→Roman Urdu, 30.7 Roman Urdu→en (Tatoeba held-out)
- `roman_urdu_map.json` has **30,888 entries** vs ibx-transliteration.js's 12,956 — 2.4× more
- `urdu.js` Transliterator uses run-level matching (handles attached punctuation correctly: "ہیں?" matches ہیں, passes ? through)
- ONNX weights: ~84MB — download once, cached in browser, fully offline after

**What it adds to IBX:**

| Gap in IBX | What roman-urdu-translator provides |
|-----------|-------------------------------------|
| UR2RU dict has 12,956 entries | `roman_urdu_map.json` has **30,888** entries — 2.4× more coverage |
| `urToRoman()` can fail on unseen words | Neural model handles unseen words via BPE subword tokenization |
| No English → Roman Urdu sentence translation | Full bidirectional neural translation |
| Urdu normalization: NFC only | `urdu.js` adds diacritic strip + zero-width char removal + codepoint folding |
| Punctuation detached from Urdu runs | Run-level matching keeps "ہیں?" intact |

**Integration steps:**

**Step 1 — Merge roman_urdu_map.json into ibx-transliteration.js (Easy, no new server):**
```js
// In rebuild-translit.js (build script, not runtime)
const newMap = JSON.parse(fs.readFileSync('roman-urdu-translator/roman_urdu_map.json'));
// Merge: new entries extend UR2RU, existing entries are kept
Object.keys(newMap).forEach(function(k){ if(!UR2RU[k]) UR2RU[k]=newMap[k]; });
// Result: ~32,000+ unique Urdu→Roman entries
```

**Step 2 — Port `urdu.js` normalize() into ibx-transliteration.js:**
```js
function normalizeUrdu(text) {
  return text.normalize('NFC')
    // strip diacritics (ً ٍ ٌ ُ ِ َ ّ ْ ٓ ٔ ٕ)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // strip zero-width chars
    .replace(/\u200C|\u200D|\u200B|\uFEFF/g, '')
    .replace(/\s+/g, ' ').trim();
}
// Call before every UR2RU lookup:
// text = normalizeUrdu(text); → then word lookup
```

**Step 3 — Load ONNX model for full sentence translation (Optional, 84MB download):**
```js
// Lazy-load when user wants full sentence translation
function loadNeuralTranslator(cb) {
  if(window._ibxTranslator){ cb(window._ibxTranslator); return; }
  Promise.all([
    import('/roman-urdu-translator/web/tokenizer.js'),
    import('/roman-urdu-translator/web/translator.js'),
    import('/roman-urdu-translator/web/urdu.js')
  ]).then(function(mods) {
    mods[1].Translator.load({
      base: '/roman-urdu-translator/model',
      onProgress: function(p){ toast('Loading translator: '+Math.round(p.received/p.total*100)+'%'); }
    }).then(function(t){ window._ibxTranslator=t; cb(t); });
  });
}
```

---

### 4.5 urduhack ⏳ PENDING PORT

**Location:** `./urduhack/`  
**What it is:** Production-grade Python NLP library for Urdu (normalization, tokenization, POS tagging, NER, lemmatization)

```
urduhack/urduhack/
  normalization/
    character.py   — 71-char mapping: Arabic lookalike chars → correct Urdu (CRITICAL) ⭐
    regexes.py     — Compiled regex patterns for Urdu punctuation spacing
  preprocessing/
    util.py        — remove_diacritics(), normalize_whitespace(), strip_html()
    character.py   — Character-level preprocessing
  tokenization/
    words.py (228KB) — Large Urdu word list + tokenization rules
    tokenizer.py   — Tokenizer implementation
  stop_words.py    — Urdu stop words list
```

**The critical piece — `_CORRECT_URDU_CHARACTERS_MAPPING` (normalization/character.py):**
This maps **Arabic-script lookalike characters** to canonical Urdu Unicode. Without this, many real-world Urdu texts fail dictionary lookup in `ibx-transliteration.js` because the char codes don't match.

Examples of what gets fixed:
```
ک  has 6 variants: ﮎ ﮏ ﮐ ﮑ ﻛ ك  → all become ک (U+06A9)
ی  has 9 variants: ﯼ ى ﯽ ﻰ ﻱ ﻲ ﯾ ﯿ ي → all become ی (U+06CC)
ہ  has 7 variants: ﻩ ﮦ ﻪ ﮧ ﮩ ﮨ ه  → all become ہ (U+06C1)
```
71 total character mappings, hundreds of variant→canonical pairs.

**Integration — port `_CORRECT_URDU_CHARACTERS_MAPPING` to JS:**
```js
// Add to ibx-transliteration.js
var URDU_CHAR_NORM = {
  // ک (U+06A9) — 6 variants
  '\uFE8E':'\u06A9','\uFE8F':'\u06A9','\uFE90':'\u06A9','\uFE91':'\u06A9','\uFB4B':'\u06A9','\u0643':'\u06A9',
  // ی (U+06CC) — 9 variants
  '\uFBFC':'\u06CC','\u0649':'\u06CC','\uFBFD':'\u06CC','\uFEF0':'\u06CC','\uFEF1':'\u06CC',
  '\uFEF2':'\u06CC','\uFBFE':'\u06CC','\uFBFF':'\u06CC','\u064A':'\u06CC',
  // ہ (U+06C1) — 7 variants
  '\uFEE9':'\u06C1','\uFBA6':'\u06C1','\uFEEA':'\u06C1','\uFBA7':'\u06C1',
  '\uFBA9':'\u06C1','\uFBA8':'\u06C1','\u0647':'\u06C1',
  // گ (U+06AF) — 4 variants
  '\uFB92':'\u06AF','\uFB93':'\u06AF','\uFB94':'\u06AF','\uFB95':'\u06AF',
  // ن (U+0646) — 4 variants
  '\uFEE5':'\u0646','\uFEE6':'\u0646','\uFEE7':'\u0646','\uFEE8':'\u0646',
  // ... (all 71 chars from character.py)
};
function normalizeUrduChars(text) {
  return text.split('').map(function(c){ return URDU_CHAR_NORM[c]||c; }).join('');
}
// Upgrade urduToRoman() to call this first:
function urduToRoman(text) {
  text = normalizeUrduChars(text); // FIX: Arabic variants → canonical Urdu
  text = removeDiacritics(text);   // FIX: strip ً ٍ ٌ ُ ِ َ ّ before lookup
  // ... existing word lookup + char fallback
}
```

**What this fixes:** Currently, Urdu text copied from WhatsApp, websites, or typed on phones often uses Arabic-range characters that look identical but have different Unicode codepoints. `ibx-transliteration.js` fails silently on these. After this fix, all Urdu text sources will work.

---

### 4.6 Urdu-English-Word-Frequency-Analyzer ⏳ PENDING PORT

**Location:** `./Urdu-English-Word-Frequency-Analyzer/`  
**What it is:** CS50P project — reads text, counts word frequency, exports CSV. Works for English and Roman Urdu.

```
analyzer.py     — get_top_words(text, top_n), save_to_csv()
sample_urdu.txt — "mein school ja raha hun / tum kya kar rahe ho" (Roman Urdu)
results.csv     — {"mein":2, "school":2, "raha":2, ...}
```

**Integration — port `get_top_words()` to JS (20 lines):**
```js
function wordFrequency(text, topN) {
  topN = topN || 10;
  var words = text.toLowerCase().match(/[a-zA-Z0-9']+/g) || [];
  var counts = {};
  words.forEach(function(w){ counts[w] = (counts[w]||0) + 1; });
  return Object.entries(counts)
    .sort(function(a,b){ return b[1]-a[1]; })
    .slice(0, topN)
    .map(function(e){ return {word:e[0], count:e[1]}; });
}

function answerVocabStats(text) {
  var freq = wordFrequency(text, 20);
  var FILLERS = new Set(['um','uh','like','basically','actually','you','know','so','right','okay']);
  var fillerHits = freq.filter(function(e){ return FILLERS.has(e.word); });
  var unique = new Set((text.toLowerCase().match(/[a-z]+/g)||[])).size;
  var total = (text.match(/\S+/g)||[]).length;
  return {
    topWords:   freq.slice(0,5),
    fillerWords: fillerHits,
    uniqueRatio: total ? Math.round(unique/total*100) : 0,
    diversity:   unique>40 ? 'Rich vocabulary' : unique>20 ? 'Average' : 'Limited vocabulary'
  };
}
```
**Use in:** `spAnalyse()` — show top repeated words + vocabulary diversity score

---

### 4.7 UTRNet ⭐ OPTIONAL SERVICE

**Location:** `./UTRNet-High-Resolution-Urdu-Text-Recognition/`  
**What it is:** Deep learning model (HRNet + DBiLSTM + CTC) for OCR of **printed Urdu text** in images/PDFs. Published in Springer ICDAR 2023.

```
model.py          — HRNet+DBiLSTM+CTC model definition
train.py          — Training script
test.py           — Evaluation script
UrduGlyphs.txt    — 180 supported Urdu character forms
modules/
  feature_extraction.py — HRNet feature extractor
  sequence_modeling.py  — DBiLSTM
  prediction.py         — CTC decoder
  cnn/hrnet.py          — High-Resolution Network backbone
```

**Integration plan — run as microservice alongside Whisper:**
```python
# Add to whisper_server.py OR create separate ocr_server.py on port 5052
@app.route('/ocr', methods=['POST'])
def ocr_urdu():
    image_file = request.files['image']
    # ... UTRNet inference (requires model weights from HuggingFace) ...
    return jsonify({'text': extracted_text, 'glyphs': glyph_list})
```

In IBX:
```js
function scanUrduImage(file, cb) {
  var fd = new FormData();
  fd.append('image', file);
  fetch('http://127.0.0.1:5052/ocr', {method:'POST', body:fd})
    .then(r=>r.json()).then(function(j){ cb(j.text); });
}
// Add "📷 Scan Urdu" button to resume upload section
```

**Use cases:**
- Scan Urdu resume images → extract text for JD↔CV match
- Process PAKGOV's 2 scanned PDFs (Parliament Joint Sittings Rules, Senate Finance Committee Rules) that have 0 extractable text currently
- Read Urdu text from photos of whiteboards/notes

**Note:** Model weights must be downloaded from the paper's HuggingFace repo.

---

## 5. Interview Intelligence Layer

---

### 5.1 Intervity ⏳ PENDING INTEGRATION

**Location:** `./Intervity/src/`  
**What it is:** React Native 0.76.5 offline AI mock interview app. The analytics + prompts are pure TypeScript — portable to vanilla JS.

```
Intervity/src/analytics/
  MistakeClassifier.ts (4.9KB)      — 4 mistake tiers: CONCEPTUAL/L4_CEILING/VAGUE/STRUCTURAL ⭐
  StarMethodEvaluator.ts (2.4KB)    — STAR score: Situation 15% + Task 15% + Action 50% + Result 20% ⭐
  SoftSkillsProsodyAnalyzer.ts      — WPM, pause detection, filler ratio
Intervity/src/core/llm/
  SystemPrompts.ts (9KB)            — Pakistani/Indian interviewer persona templates ⭐
Intervity/src/core/agent/
  AgentCoachingHarness.ts (24KB)    — 11 coaching strategy dispatcher
  strategies/
    BehavioralLeadershipStrategy.ts   — STAR framework coaching
    EngineeringLeadershipStrategy.ts  — System design / architecture coaching
    AnalogicalTeachingStrategy.ts     — Explain via real-world analogy
    EmotionalSupportStrategy.ts       — Handle stress / repeated failures
    HighScaleValidationStrategy.ts    — Validate scale claims in answers
    AiPlatformStrategy.ts             — RAG / fine-tuning / AI coaching
    ClientPerformanceStrategy.ts      — Frontend / Core Web Vitals coaching
    ProjectDiscoveryStrategy.ts       — Project deep-dive
    StaffElevationStrategy.ts         — L6+ / Staff level framing
    RotatingCurriculumFallbackStrategy.ts — Fallback: rotate weak topics
    MascotLevelUpFallbackStrategy.ts  — Motivational fallback
Intervity/src/core/qbl/
  QBLEngine.ts (33KB)               — Adaptive curriculum: tracks mastery per skill
  QBLCurriculumGenerator.ts (40KB)  — Curriculum from skill gaps
  QBLQuestionCatalog.ts (125KB)     — Full question catalog with metadata
Intervity/src/core/resume/
  OfflineResumeParser.ts            — Regex resume parser
Intervity/src/database/
  AgentMemoryRepository.ts          — Episodic + semantic agent memory
```

#### A. MistakeClassifier — Answer Diagnosis ⭐
**Wire into:** `spAnalyse()` output  
**4 tiers + colors:** CONCEPTUAL=red · L4_CEILING=orange · VAGUE=yellow · STRUCTURAL=blue
```js
function classifyMistake(answer) {
  var t = answer.toLowerCase();
  if(t.includes('threads without locks')||t.includes('directly on gpu'))
    return {cat:'CONCEPTUAL', color:'#B3261E',
      critique:'Fundamental misunderstanding of runtime/architecture.',
      golden:'Explain the actual mechanism (JSI, memory ownership, thread boundaries).',
      model:'Ground explanations in memory ownership and thread safety.'};

  if(t.includes('redis')&&!t.includes('stampede')&&!t.includes('eviction')&&!t.includes('lock'))
    return {cat:'L4_CEILING', color:'#E65100',
      critique:'Technically correct but missing senior-level failure modes.',
      golden:'Add: cache stampede mitigation, eviction policies, write storm handling.',
      model:'Never stop at "faster reads" — explain invalidation, concurrency, eviction.'};

  if(t.length<80||(!t.includes('ms')&&!t.includes('%')&&!t.includes('per second')&&!t.includes('qps')))
    return {cat:'VAGUE', color:'#F4D83D',
      critique:'Too vague — no mechanics, numbers, or trade-off reasoning.',
      golden:'Add: latency numbers, throughput, why this approach vs alternatives.',
      model:'Never state the technology without quantifying the outcome.'};

  if(!t.includes(' i ')&&!t.includes('latency')&&!t.includes('percent')&&!t.includes('reduced'))
    return {cat:'STRUCTURAL', color:'#1565C0',
      critique:'Missing personal ownership and measurable outcomes.',
      golden:'Use "I designed/implemented" + p99 latency, %, cost savings, user impact.',
      model:'BLUF: Bottom Line Up Front. Close with measurable business impact.'};

  return null; // answer is solid
}
```

#### B. STAR Method Evaluator ⭐
**Wire into:** `spAnalyse()` for behavioral/HR questions (tags: `behavioral`, `hr`, `leadership`)  
**Score:** Situation (15%) + Task (15%) + Action (50%) + Result (20%) = 100
```js
function starEval(answer) {
  var t=answer.toLowerCase(), fb=[];
  var sit=(t.includes('when')||t.includes('project')||t.includes('team')||t.includes('while'));
  var sitS=sit?15:5; if(!sit)fb.push('Set the business context or project scope at the start.');
  var task=(t.includes('goal')||t.includes('needed to')||t.includes('problem')||t.includes('challenge'));
  var taskS=task?15:5; if(!task)fb.push('State the SLA, deadline, or engineering hurdle.');
  var acts=(t.match(/\b(i implemented|i designed|i built|i led|i solved|i debugged|i refactored)\b/g)||[]).length;
  var actS=acts>=2?50:acts>=1?35:20;
  if(acts<1)fb.push('Take ownership: "I designed/implemented" not "we".');
  var res=(/\b(\d+%|\d+ms|\d+\s*s|\$\d+|\d+k|\d+\s*qps|\d+\s*rps)\b/i.test(t)||
           t.includes('reduced')||t.includes('improved')||t.includes('increased'));
  var resS=res?20:5; if(!res)fb.push('Quantify: latency reduction, cost savings, RPS, users.');
  return {situation:sitS, task:taskS, action:actS, result:resS,
          total:sitS+taskS+actS+resS, feedback:fb};
}
```

#### C. Soft Skills Prosody Analyzer
**Wire into:** `spAnalyse()` + Whisper `duration` field (already returned by whisper_server.py v2.0)
```js
function prosodyAnalyze(text, durationSec) {
  var words=(text.match(/\S+/g)||[]).length;
  var wpm=durationSec>0?Math.round(words/(durationSec/60)):0;
  var FILLERS=/\b(um|uh|like|you know|basically|actually|literally|so|right|okay|hmm|err|kind of|sort of)\b/gi;
  var fillerCount=(text.match(FILLERS)||[]).length;
  var fillerRatio=words>0?Math.round(fillerCount/words*100):0;
  return {
    wpm, words, fillerCount, fillerRatio,
    rating: wpm>=120&&wpm<=160&&fillerRatio<5?'excellent':wpm>=100&&fillerRatio<10?'good':'needs work',
    advice: wpm<100?'Speak faster — aim for 120–160 WPM':
            wpm>180?'Slow down — clarity over speed':
            fillerRatio>10?'Reduce fillers (um, uh, like) — pause instead':'Good pacing!'
  };
}
```

#### D. Pakistani Interviewer Persona ⭐
**Wire into:** Mock interview `SAMPLE()` system prompt
```js
var INTERVIEWER_PROMPT = function(role, resume, company) {
  return 'You are a Senior Technical Interviewer at '+company+
    ' in Lahore/Karachi/Islamabad conducting a realistic mock interview for: '+role+'.\n\n'+
    'Candidate Resume:\n"""\n'+resume.slice(0,3000)+'\n"""\n\n'+
    'PAKISTANI TECH CONTEXT:\n'+
    '- Understand: BS-CS/BCS/MIT degrees, CGPA (4.0 scale), PITB/PASHA/P@SHA ecosystem\n'+
    '- Know: IT services (Techlogix, NetSol, Systems Ltd) vs product (Airlift, Bazaar, Tajir)\n'+
    '- Terms: "done from" (graduated), "outstation", "CTC in PKR", NUST/LUMS/FAST colleges\n\n'+
    'RULES:\n'+
    '1. ONE question at a time. Max 3 sentences per response.\n'+
    '2. No markdown — response may be spoken aloud via TTS.\n'+
    '3. Deep-dive into specific resume claims.\n'+
    '4. Acknowledge previous answer briefly before next question.';
};
```

#### E. 11 Coaching Strategies
**Wire into:** AI Coach view — pick strategy based on question category
```js
var COACH_STRATEGIES = {
  behavioral:    'Use STAR (Situation→Task→Action→Result). Ask for "I" ownership and specific numbers.',
  engineering:   'Probe trade-offs: scalability, reliability, cost. Ask about failure modes.',
  ai_platform:   'Ask about RAG pipeline, embedding choice, fine-tuning vs prompting, eval metrics.',
  client_perf:   'Ask about Core Web Vitals, bundle size, rendering pipeline, caching strategy.',
  staff_elevation:'Frame org impact: how many engineers, cross-team influence, architectural decisions.',
  rotating_fallback:'Focus on this question\'s weakest tag. Build from fundamentals up.',
  motivational:  'Positive — note improvement. Redirect: "Let\'s try a different angle..."'
};

function pickCoachStrategy(q) {
  var t = (q.t||[]).join(' ');
  if(/behavioral|hr|leadership|levelwise/.test(t)) return 'behavioral';
  if(/architecture|system.design|microservice/.test(t)) return 'engineering';
  if(/ai|llm|ml|rag|agent/.test(t))  return 'ai_platform';
  if(/react|frontend|css|performance|core.web/.test(t)) return 'client_perf';
  if(q.l==='s') return 'staff_elevation';
  return 'rotating_fallback';
}
```

#### F. Adaptive QBL Curriculum
**Wire into:** Library question picker — replace random with mastery-based
```js
function getSkillMastery(tag) {
  var m = JSON.parse(localStorage.getItem('ibx-mastery')||'{}');
  return m[tag] || {attempts:0, correct:0, lastSeen:0};
}
function updateSkillMastery(tag, correct) {
  var m = JSON.parse(localStorage.getItem('ibx-mastery')||'{}');
  var s = m[tag] || {attempts:0, correct:0, lastSeen:0};
  s.attempts++; if(correct) s.correct++; s.lastSeen = Date.now();
  m[tag] = s; localStorage.setItem('ibx-mastery', JSON.stringify(m));
}
function qblPickNext() {
  var tags = Object.keys(TMAP);
  var weakest = tags.sort(function(a,b) {
    var ra = (function(t){ var m=getSkillMastery(t); return m.attempts?m.correct/m.attempts:0; })(a);
    var rb = (function(t){ var m=getSkillMastery(t); return m.attempts?m.correct/m.attempts:0; })(b);
    return ra - rb;
  })[0];
  var pool = QS.filter(function(q){ return q.t.includes(weakest) && !S.done[q.id]; });
  return pool[Math.floor(Math.random()*pool.length)] || QS[Math.floor(Math.random()*QS.length)];
}
```

#### G. Agent Memory (Cross-session coaching context)
```js
var AGENT_MEM_KEY = 'ibx-agent-mem';
function agentMemLoad() { try{return JSON.parse(localStorage.getItem(AGENT_MEM_KEY)||'{}')}catch(e){return{}} }
function agentMemSave(m) { try{localStorage.setItem(AGENT_MEM_KEY,JSON.stringify(m))}catch(e){} }
function agentMemRecord(type, content) {
  var m = agentMemLoad();
  if(!m[type]) m[type] = [];
  m[type].push({t:Date.now(), v:content});
  if(m[type].length>50) m[type] = m[type].slice(-50);
  agentMemSave(m);
}
// Usage: agentMemRecord('weakness', 'Redis eviction policies');
//        agentMemRecord('profile', 'Senior Laravel dev, targeting PITB');
```

---

### 5.2 interview-skills ⏳ PENDING INTEGRATION

**Location:** `./interview-skills/`  
**What it is:** Chinese AI mock interview web app (EasyClaw Skill) — source code for extraction

```
interview-skills/
  ui/
    app.js (118KB)         — Full vanilla JS app
    storage.js (7KB)       — IndexedDB 3-store: sessions / preferences / credentials
    lib/
      pdf.min.js (377KB)   — PDF.js for resume parsing
      pdf.worker.min.js (1.1MB) — PDF.js worker
  extensions/
    mic-input/
      mic-input.js (12KB)  — Continuous SpeechRecognition + auto-restart + AI correction ⭐
    reference-answer/
      reference-answer.js (15KB) — Per-question reference answer + good vs bad ⭐
    export-md/
      export-md.js (13KB)  — Markdown session export ⭐
    storage-sync/
      storage-sync.js (6KB) — Cross-tab storage sync
    model-config/
      model-config.js (5KB) — LLM model selector UI
  references/
    company-profiles.md    — Interview styles: Alibaba/ByteDance/Google/Amazon/Meta/Huawei/Didi ⭐
    bei-framework.md       — BEI behavioral interview framework
    resume-parser.md       — Resume parsing patterns
    question-design.md     — Question design principles
    chatbox-senior-ai-chatbot.md (55KB) — Senior AI chatbot reference design
  PRD.md                   — Full product spec: JD parser, 10Q generator, good/bad answers
```

#### A. Auto-Restart SpeechRecognition ⭐
**Wire into:** `spRec()` — fixes 60-second cutoff bug
```js
// Current bug: browser stops SpeechRecognition after ~60s silence
// Fix from mic-input.js:
var _srShouldRestart = false;
var _srUtteranceFinal = '';
var _srOriginalValue = '';

// In spRec() — add to recognition.onend:
recognition.onend = function() {
  if(_srShouldRestart && textarea && textarea.isConnected) {
    var next = makeRecognition();
    if(next){ currentRec=next; try{next.start()}catch(e){stopSpRec()} }
  } else { stopSpRec(); }
};

// Accumulate finals across restarts:
recognition.onresult = function(e) {
  var interim = '';
  for(var i=e.resultIndex; i<e.results.length; i++){
    var t = e.results[i][0].transcript;
    if(e.results[i].isFinal) _srUtteranceFinal += (_srUtteranceFinal?' ':'')+t;
    else interim += t;
  }
  textarea.value = _srOriginalValue+(_srUtteranceFinal?' ':'')+_srUtteranceFinal+interim;
};
```

#### B. Reference Answer + Good vs Bad ⭐
**Wire into:** Question cards — add `💡 Reference` button
```js
var REF_CACHE = 'ibx-ref-answers';
function refGet(qid){ try{return JSON.parse(localStorage.getItem(REF_CACHE)||'{}')[qid]||''}catch(e){return''} }
function refSet(qid,text){ var c=JSON.parse(localStorage.getItem(REF_CACHE)||'{}'); c[qid]=text; try{localStorage.setItem(REF_CACHE,JSON.stringify(c))}catch(e){} }

function openRef(qid, mode) {
  var q=QMAP[qid]; if(!q)return;
  mode = mode||'single'; // 'single' | 'compare'
  var cached=refGet(qid);
  if(cached&&mode==='single'){ showRefSheet(cached); return; }
  var prompt = mode==='compare'
    ? 'Give a HIGH-SCORE answer then a LOW-SCORE answer for this interview question. Explain what makes each good or bad:\n\n'+q.q
    : 'You are a senior interviewer. Give a concise model answer for:\n\n'+q.q;
  SAMPLE([{role:'system',content:'Be direct and specific. Use concrete examples.'},
          {role:'user',content:prompt}],
    function(ans){ refSet(qid,ans); showRefSheet(ans); });
}
```

#### C. Session Export as Markdown ⭐
**Wire into:** Mock interview completion screen
```js
function exportSessionMD(session) {
  var lines = ['# Mock Interview Record', '**Date:** '+new Date().toLocaleDateString(), ''];
  if(session.company) lines.push('**Company:** '+session.company, '');
  lines.push('---', '');
  (session.qs||[]).forEach(function(q,i){
    lines.push('### Q'+(i+1)+' — '+q.q.slice(0,60)+(q.q.length>60?'…':''), '');
    lines.push('**Question:** '+q.q, '');
    var ans = session.ans&&session.ans[q.id];
    if(ans) lines.push('**Your answer:** '+ans, '');
    var ref = refGet(q.id);
    if(ref) lines.push('> **Reference answer:** '+ref, '');
    var score = session.scores&&session.scores[q.id];
    if(score) lines.push('**Score:** '+score+'/5', '');
    lines.push('---', '');
  });
  saveFile('mock-interview-'+Date.now()+'.md', lines.join('\n'));
}
```

#### D. Company Interview Style Profiles ⭐
**Wire into:** JD prep view — detect company name and adjust mock interview prompt
```js
var COMPANY_STYLES = {
  'google':     {focus:'system design + coding clarity + trade-off reasoning', time:'45+45 min', style:'collaborative'},
  'amazon':     {focus:'Leadership Principles (LP) + Dive Deep + measurable impact', time:'60 min', style:'LP-first'},
  'meta':       {focus:'coding speed + scale problems + data-driven decisions', time:'45 min', style:'fast-paced'},
  'microsoft':  {focus:'problem-solving + collaboration + growth mindset', time:'45 min', style:'conversational'},
  'pitb':       {focus:'Laravel/PHP + delivery track record + govt digital systems', time:'30 min', style:'practical'},
  'nadra':      {focus:'database systems + security + national-scale systems', time:'30 min', style:'technical'},
  'arbisoft':   {focus:'full-stack + agile + client communication', time:'45 min', style:'cultural fit heavy'},
  'netsol':     {focus:'enterprise software + ERP + team leadership', time:'45 min', style:'formal'},
  'systems':    {focus:'SAP/ERP + large team + enterprise delivery', time:'30 min', style:'experienced'},
  'bytedance':  {focus:'algorithms + business impact + data scale', time:'45 min', style:'intensive'},
  'bytedance':  {focus:'algorithms + business impact + data scale', time:'45 min', style:'intensive'},
  'tencent':    {focus:'gaming + social + performance optimization', time:'45 min', style:'technical-deep'},
};
function companyStyle(name) {
  var k=(name||'').toLowerCase();
  for(var c in COMPANY_STYLES) if(k.includes(c)) return COMPANY_STYLES[c];
  return null;
}
```

#### E. PDF Resume Parsing
**Wire into:** JD prep view — "Upload Resume PDF" button
```js
function parsePDF(file, cb) {
  if(!window.pdfjsLib){
    var s=document.createElement('script'); s.src='/pdf.min.js';
    s.onload=function(){parsePDF(file,cb)}; document.head.appendChild(s); return;
  }
  pdfjsLib.workerSrc='/pdf.worker.min.js';
  var reader=new FileReader();
  reader.onload=function(e){
    pdfjsLib.getDocument({data:e.target.result}).promise.then(function(pdf){
      var pages=[],i=0;
      function next(){
        if(i>=pdf.numPages){cb(pages.join('\n'));return;}
        pdf.getPage(++i).then(function(p){
          p.getTextContent().then(function(tc){
            pages.push(tc.items.map(function(item){return item.str}).join(' '));
            next();
          });
        });
      }
      next();
    });
  };
  reader.readAsArrayBuffer(file);
}
```
**Note:** Copy `pdf.min.js` (377KB) + `pdf.worker.min.js` (1.1MB) from `interview-skills/ui/lib/` to IBX server root.

#### F. IndexedDB 3-Store Storage (Future-proofing)
**Wire into:** Mock session history — prevents localStorage 5MB overflow
```js
function ibxOpenDB() {
  return new Promise(function(res,rej){
    var r=indexedDB.open('ibx',1);
    r.onupgradeneeded=function(e){
      var db=e.target.result;
      if(!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions',{keyPath:'id'});
      if(!db.objectStoreNames.contains('prefs'))    db.createObjectStore('prefs',{keyPath:'id'});
      if(!db.objectStoreNames.contains('creds'))    db.createObjectStore('creds',{keyPath:'id'});
    };
    r.onsuccess=function(){res(r.result)};
    r.onerror=function(){rej(r.error)};
  });
}
```

---

### 5.3 dictionariez ⏳ PENDING INTEGRATION

**Location:** `./dictionariez/`  
**What it is:** Browser extension for multi-dictionary word lookup (Chrome/Firefox/Edge)

```
dictionariez/src/background/
  ai-lookup.js         — AI lookup: queue + dual cache (in-memory + localStorage) ⭐
  localStorageCache.js — Cache factory: max N items, FIFO eviction ⭐
  ankiwindow.js        — Anki flashcard export via AnkiConnect HTTP API (port 6006) ⭐
  plain-lookup.js      — Structured word lookup: pronunciation US/UK, definitions, examples
  translate.js         — Google Translate bridge
dictionariez/src/content/
  tts-player-webcomponent.bundle.js (397KB) — Full audio player web component
  detect-language.js   — Browser i18n.detectLanguage API + DOM node fallback
dictionariez/src/shared-readonly/
  dictionaries.js      — Registry of 50+ dictionaries
  langs.json           — Language config: synthesis voice mapping, script ranges
```

#### A. AI Contextual Lookup with Cache ⭐
**Wire into:** Question cards — "🔍 Explain" button
```js
var _aiLookupCache = {}, _aiLookupLast = {k:null,r:null}, _aiLookupQ = [], _aiLookupBusy = false;

function aiLookup(word, context, cb) {
  var key = word+'|'+context.slice(0,50);
  if(_aiLookupLast.k===key){ cb(_aiLookupLast.r); return; }
  if(_aiLookupCache[key]){ cb(_aiLookupCache[key]); return; }
  _aiLookupQ.push({key,word,context,cb});
  if(!_aiLookupBusy) _processAiLookupQ();
}

function _processAiLookupQ() {
  if(!_aiLookupQ.length){ _aiLookupBusy=false; return; }
  _aiLookupBusy=true;
  var item = _aiLookupQ.shift();
  SAMPLE([{role:'system',content:'Explain this technical term as a senior interviewer would. Be concise.'},
          {role:'user',content:'Term: '+item.word+'\nContext: '+item.context}],
    function(res){
      _aiLookupLast={k:item.key,r:res};
      _aiLookupCache[item.key]=res;
      item.cb(res);
      _processAiLookupQ();
    });
}
```

#### B. Anki Flashcard Export ⭐
**Wire into:** Question card actions — "🃏 Anki" button
```js
function ankiAdd(front, back, deck, cb) {
  fetch('http://localhost:6006', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      action:'addNote', version:6,
      params:{note:{
        deckName: deck||'Interview Box',
        modelName:'Basic',
        fields:{Front:front, Back:back},
        options:{allowDuplicate:false}
      }}
    })
  }).then(r=>r.json()).then(function(j){
    toast(j.error?'Anki error: '+j.error:'✓ Card added to Anki');
    cb&&cb(!j.error);
  }).catch(function(){
    toast('Anki not running — open Anki + install AnkiConnect add-on');
  });
}
```

#### C. Generic localStorage Cache Factory
**Use for:** Any repeating AI calls (dict lookups, reference answers, explain terms)
```js
function ibxCacheFactory(ns, max) {
  return {
    get: function(k){
      var c=JSON.parse(localStorage.getItem(ns)||'{}');
      return c[k]||null;
    },
    set: function(k,v){
      var c=JSON.parse(localStorage.getItem(ns)||'{}');
      var keys=Object.keys(c);
      if(keys.length>=max) delete c[keys[0]]; // FIFO evict oldest
      c[k]=v;
      try{localStorage.setItem(ns,JSON.stringify(c))}catch(e){}
    }
  };
}
// Usage:
var EXPLAIN_CACHE = ibxCacheFactory('ibx-explain', 100);
var DICT_CACHE    = ibxCacheFactory('ibx-dict',    200);
var REF_CACHE     = ibxCacheFactory('ibx-refs',    500);
```

#### D. Word Hover Dictionary (Inline Definitions)
**Wire into:** Question/answer text — double-click selects word → tooltip
```js
document.addEventListener('dblclick', function(e) {
  var sel = window.getSelection().toString().trim();
  if(!sel||sel.length>30||!e.target.closest('.ans,.qh')) return;
  showWordTooltip(sel, e.clientX, e.clientY);
});

function showWordTooltip(word, x, y) {
  var cached = DICT_CACHE.get(word);
  if(cached){ renderWordTooltip(word, cached, x, y); return; }
  fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word))
    .then(r=>r.json()).then(function(data){
      var def = data[0]&&data[0].meanings[0]&&data[0].meanings[0].definitions[0];
      var result = def ? def.definition : 'No definition found';
      DICT_CACHE.set(word, result);
      renderWordTooltip(word, result, x, y);
    }).catch(function(){ renderWordTooltip(word, 'Could not fetch definition', x, y); });
}
```

---

## 6. Knowledge Base Layer

---

### 6.1 PAKGOV-RAG-project ⏳ PENDING INTEGRATION

**Location:** `./PAKGOV-RAG-project/`  
**What it is:** RAG system over Pakistani government legal documents — Constitution, PPC, CrPC, ESTACODE, Senate Rules (10 PDFs, 6,711 chunks).

```
PAKGOV-RAG-project/
  data/
    eval/verified_qa_50.jsonl      — 50 human-verified Q&A (15 en, 15 ur, 20 mixed) ⭐
    interim/senate_raw.jsonl        — Raw Senate PDF text (887KB)
    processed/senate_chunks.jsonl  — 1,080 chunked Senate passages
    processed/senate_faiss/
      index.faiss                  — 1,080 vector embeddings (ready to use)
      chunks.jsonl                 — Chunk text + metadata
  app/
    demo/app.py                    — Streamlit demo (localhost:8501) ⭐
    api/main.py                    — FastAPI query endpoint
    api/query.py                   — Retrieval + generation logic
  docs/
    source-registry.csv            — 6 official Pakistani government document sources
    experiment-log.md              — Full evaluation results log
  evaluation/retrieval/
    FINAL_RESULTS.md               — Retrieval comparison: BM25 vs Dense vs Hybrid RRF
    hybrid_rrf_metrics.json        — R@5=0.740, MRR=0.605 (best results)
    failure_analysis_50.md         — 13/50 failure cases analyzed
```

**Data sources (official Pakistani government PDFs):**
| Document | Source | Pages |
|----------|--------|-------|
| Constitution of Pakistan 2025 | Ministry of Law, pakistancode.gov.pk | 176 |
| Pakistan Penal Code 1860 | Ministry of Law | 179 |
| Code of Criminal Procedure 1898 | Ministry of Law | — |
| Code of Civil Procedure 1908 | Ministry of Law | — |
| Rules of Business 1973 | Ministry of Law | 87 |
| ESTACODE 2021 | Establishment Division | 1,044 |
| Senate Rules + Acts (10 PDFs) | senate.gov.pk | 111–176 |

**Retrieval results (50 verified Q&A):**
| Retriever | R@1 | R@3 | R@5 | R@10 | MRR |
|-----------|-----|-----|-----|------|-----|
| BM25 (baseline) | 0.360 | 0.580 | 0.640 | 0.680 | 0.469 |
| Dense multilingual MiniLM | 0.440 | 0.600 | 0.620 | 0.740 | 0.535 |
| **Hybrid RRF k=60** | **0.500** | **0.660** | **0.740** | **0.820** | **0.605** |

- Urdu–English cross-lingual similarity: **0.8370** (queries in either language work)
- Grounded answers: 37/50 with citations, 13/50 "insufficient evidence" (honest refusal)

#### Integration Level 1 — Quick Win: Import Q&A to bank
```js
// 50 verified Q&A → new question bank category "Pakistan Governance & Law"
// node add-pakgov-bank.js
// Format: {id, q, a, t:['constitution','pakistan','law','governance'], lvl:'s', s:'n', src:'PAKGOV', priority:3}
```

#### Integration Level 2 — Run RAG service alongside IBX
```bash
# Terminal 1: IBX server
bash start-interview-box-linux.sh

# Terminal 2: PAKGOV RAG (port 8501)
cd PAKGOV-RAG-project
pip install streamlit sentence-transformers faiss-cpu rank_bm25
streamlit run app/demo/app.py --server.port 8501
```

#### Integration Level 3 — Wire into AI Coach
```js
function coachWithPAKGOV(question, cb) {
  fetch('http://localhost:8501/api/query', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({query: question, top_k: 3, lang: detectLang(question)})
  }).then(r=>r.json()).then(function(rag){
    var context = (rag.passages||[]).map(function(p){
      return '[Source: '+p.source+' p.'+p.page+']\n'+p.text;
    }).join('\n\n');
    if(!context){ cb(null); return; }
    SAMPLE([
      {role:'system', content:'Answer using ONLY the provided context. If context is insufficient, say so. Cite sources.'},
      {role:'user',   content:'Context:\n'+context+'\n\nQuestion: '+question}
    ], cb);
  }).catch(function(){ cb(null); }); // graceful fallback — PAKGOV not running
}
```

---

## 7. Master Priority Roadmap

### 🔴 Immediate — No new servers, pure JS ports

| # | Feature | Source File | Effort | Wire Into |
|---|---------|-------------|--------|-----------|
| 1 | **MistakeClassifier** (4 tiers + golden response) | Intervity `MistakeClassifier.ts` | 1h | `spAnalyse()` |
| 2 | **STAR Evaluator** (behavioral scoring) | Intervity `StarMethodEvaluator.ts` | 1h | `spAnalyse()` for behavioral Qs |
| 3 | **Prosody Analyzer** (WPM + fillers + diversity) | Intervity + Word-Freq-Analyzer | 1h | `spAnalyse()` + Whisper duration |
| 4 | **Pakistani interviewer persona** | Intervity `SystemPrompts.ts` | 30min | Mock `SAMPLE()` |
| 5 | **Auto-restart SpeechRecognition** | interview-skills `mic-input.js` | 1h | `spRec()` |
| 6 | **Reference answer + Good vs Bad** | interview-skills `reference-answer.js` | 2h | Question cards |
| 7 | **Session export as Markdown** | interview-skills `export-md.js` | 1h | Mock completion |
| 8 | **Company style profiles** (PITB/Google/Amazon/etc) | interview-skills `company-profiles.md` | 1h | JD prep view |
| 9 | **AI lookup cache factory** | Dictionariez `localStorageCache.js` | 30min | Any AI call |
| 10 | **PAKGOV Q&A → question bank** | PAKGOV `verified_qa_50.jsonl` | 30min | Bank import |

### 🟡 Short-term — Data merges and rebuilds

| # | Feature | Source | Effort | Effect |
|---|---------|--------|--------|--------|
| 11 | **Merge roman_urdu_map.json** (30,888 entries) | roman-urdu-translator | 1h | UR2RU: 12K→32K entries |
| 12 | **Port urduhack char normalization** (71 mappings) | urduhack `character.py` | 2h | Fix Arabic-variant lookup failures |
| 13 | **Add Urdu normalize + diacritic strip** | roman-urdu-translator `urdu.js` + urduhack | 1h | Reliable Urdu input from any source |
| 14 | **Anki flashcard export** | Dictionariez `ankiwindow.js` | 1h | Q&A → Anki one-click |
| 15 | **Word hover dictionary** | Dictionariez + Free Dictionary API | 2h | Inline tech term definitions |
| 16 | **11 Coaching strategies** | Intervity `AgentCoachingHarness.ts` | 3h | AI Coach targeted by question type |
| 17 | **PDF resume parsing** | interview-skills `pdf.min.js` | 2h | Upload resume PDF → JD prep |

### 🟢 Medium-term — Optional services

| # | Feature | Service | Port | Effort |
|---|---------|---------|------|--------|
| 18 | **PAKGOV RAG** (Pakistan law Q&A) | Streamlit + FAISS | 8501 | 30min setup |
| 19 | **Neural sentence translation** (ONNX) | roman-urdu-translator model | browser | 1h integrate |
| 20 | **Agent memory** (cross-session coaching) | Intervity pattern | localStorage | 2h |
| 21 | **IndexedDB session storage** | interview-skills `storage.js` | — | 4h |
| 22 | **Adaptive QBL curriculum** | Intervity `QBLEngine.ts` | — | 4h |

### 🔵 Optional / Long-term

| # | Feature | Source | Notes |
|---|---------|--------|-------|
| 23 | UTRNet Urdu OCR service | UTRNet | Needs PyTorch + model weights |
| 24 | TTS player web component | Dictionariez (397KB) | Replaces speechSynthesis |
| 25 | Voice biometrics | Intervity `VoiceBiometricsService.ts` | Experimental |
| 26 | BEI behavioral framework | interview-skills `bei-framework.md` | Prompt template |
| 27 | Full QBL catalog | Intervity `QBLQuestionCatalog.ts` | 125KB additional questions |

---

## 8. Integration Patterns

### Pattern 1 — Port TypeScript to vanilla JS
```js
// Step 1: Remove types
// "function foo(text: string): number {" → "function foo(text) {"
// "interface Bar {" → deleted
// "import { X } from './y'" → deleted (inline code instead)

// Step 2: Convert classes
// "class MistakeClassifier { static classify(a: string) {} }"
// → "var MistakeClassifier = { classify: function(a) {} };"
// OR just use the function directly without the class wrapper
```

### Pattern 2 — Patch interview-box.html via Node script
```js
// patch-something.js
const fs   = require('fs');
const HTML = require('path').join(__dirname, 'interview-box.html');
const BAK  = HTML + '.bak-' + Date.now();
let h      = fs.readFileSync(HTML, 'utf-8');

fs.copyFileSync(HTML, BAK); // always backup first

h = h.replace(
  `function existingFn(`,         // exact old text
  `function existingFn(`          // new text
);

fs.writeFileSync(HTML, h);
console.log('Patched. Size:', fs.statSync(HTML).size);
```

### Pattern 3 — Lazy-load large external JS files
```js
function loadScript(src, cb) {
  if(document.querySelector('script[src="'+src+'"]')){ cb&&cb(); return; }
  var s = document.createElement('script');
  s.src = src;
  s.onload = cb;
  s.onerror = function(){ console.warn('Failed to load: '+src); cb&&cb(); };
  document.head.appendChild(s);
}
// Usage: loadScript('/pdf.min.js', function() { parsePDF(file, cb); });
// Usage: loadScript('/ibx-transliteration.js', function() { IBX_TR.romanToUrdu(t); });
```

### Pattern 4 — Cache-first AI calls (prevents duplicate requests)
```js
function ibxCacheFactory(ns, max) {
  return {
    get: function(k){ var c=JSON.parse(localStorage.getItem(ns)||'{}'); return c[k]||null; },
    set: function(k,v){
      var c=JSON.parse(localStorage.getItem(ns)||'{}');
      var keys=Object.keys(c);
      if(keys.length>=max) delete c[keys[0]];
      c[k]=v; try{localStorage.setItem(ns,JSON.stringify(c))}catch(e){}
    }
  };
}
```

### Pattern 5 — Find function boundaries (for patch scripts)
```js
function extractFn(html, fnName) {
  var i = html.indexOf('function '+fnName+'(');
  if(i<0) return null;
  var depth=0, j=i;
  while(j<html.length){
    if(html[j]==='{') depth++;
    else if(html[j]==='}'){depth--;if(depth===0){j++;break;}}
    j++;
  }
  return html.slice(i, j);
}
```

---

## 9. Data Flows

### Flow A — Speak Roman Urdu → Full Analysis
```
1. User speaks: "mein ne laravel main queue ka kaam kiya"
   ↓
2. Whisper (port 5051) → transcribes → Roman Urdu text
   ibx-transliteration.js enhances roman_hint (12K→32K after merge)
   ↓
3. spAnalyse() runs:
   a. wordFrequency()     [Word-Freq-Analyzer port — word count + diversity]
   b. prosodyAnalyze()    [Intervity SoftSkillsProsodyAnalyzer port — WPM/fillers]
   c. classifyMistake()   [Intervity MistakeClassifier — L4_CEILING/VAGUE/etc]
   d. starEval()          [Intervity STAR Evaluator — if behavioral question]
   ↓
4. IBX_TR.romanToUrdu("mein ne laravel...") → "میں نے لاریول..."
   Shown in RTL Nastaliq block below the answer
   ↓
5. AI feedback via SAMPLE() with Pakistani persona [Intervity SystemPrompts]
   + Company style if JD has company name [interview-skills company-profiles]
   ↓
6. Output:
   ★ MistakeClassifier: "L4_CEILING — add failure modes"
   ★ STAR: Action=35/50, needs more quantification
   ★ WPM: 130, fillers: 2 (good)
   ★ Urdu script: "میں نے لاریول میں کیو کا کام کیا"
   💡 Reference answer button [interview-skills reference-answer.js]
   📄 Export MD button [interview-skills export-md.js]
```

### Flow B — Ask a Pakistan Law Question to AI Coach
```
1. User types: "PITB ke liye kya compliance requirements hain?"
   ↓
2. IBX_TR.romanToUrdu() → "PITB کے لیے کیا compliance requirements ہیں؟"
   ↓
3. pickCoachStrategy() → detects 'pitb' tag → 'engineering' strategy
   ↓
4. coachWithPAKGOV() queries PAKGOV RAG (port 8501):
   Hybrid RRF → Top 3 chunks from ESTACODE/Punjab IT Board Act
   ↓
5. SAMPLE() with retrieved context + citation
   → "According to [ESTACODE p.XX], PITB is required to..."
   ↓
6. Agent memory records this topic for future sessions
```

### Flow C — Upload Urdu Resume PDF
```
1. User uploads resume.pdf
   ↓
2. parsePDF() via pdf.min.js (lazy-loaded) → extract all text pages
   ↓
3. If scanned Urdu text: send to UTRNet OCR (port 5052, optional)
   → extract Urdu glyphs → text
   ↓
4. OfflineResumeParser logic (Intervity port):
   extract: skills[], experience[], education, years
   ↓
5. Feed into JD prep AI prompt with Pakistani tech context
   + company style profile [interview-skills]
   ↓
6. Generate 10 targeted interview questions
```

---

## 10. Complete File Inventory

| File / Project | Size | Status | Role |
|---------------|------|--------|------|
| `interview-box.html` | 3.55MB | ✅ Active | Main app |
| `whisper_server.py` | 14KB | ✅ Active (port 5051) | Offline STT |
| `ibx-transliteration.js` | 636KB | ✅ Active (port 8765) | Urdu↔Roman dict |
| `merge-banks.js` | 7KB | ✅ Done | Bank merge script |
| `patch-whisper-improvements.js` | 14KB | ✅ Done | 11 whisper patches |
| `patch-translation.js` | 3KB | ✅ Done | trGet + urToRoman |
| `patch-transliteration.js` | 9KB | ✅ Done | 7 translit patches |
| `INTEGRATION_GUIDE.md` | 940 lines | 🗑 Superseded | → use MASTER_INTEGRATION.md |
| `INTEGRATION_ANALYSIS.md` | 580 lines | 🗑 Superseded | → use MASTER_INTEGRATION.md |
| **`MASTER_INTEGRATION.md`** | **this file** | ✅ Active | Single source of truth |
| `roman-urdu-translator/roman_urdu_map.json` | 744KB | ⏳ Merge to translit.js | +30,888 entries |
| `roman-urdu-translator/web/urdu.js` | 2.8KB | ⏳ Port normalize() | Better normalization |
| `roman-urdu-translator/web/tokenizer.js` | 7.4KB | 🔵 Optional | BPE tokenizer |
| `roman-urdu-translator/web/translator.js` | 7.1KB | 🔵 Optional | ONNX neural translation |
| `urduhack/normalization/character.py` | 13KB | ⏳ Port 71 mappings | Arabic-variant fix |
| `urduhack/preprocessing/util.py` | 9.7KB | ⏳ Port remove_diacritics | Text cleaning |
| `Urdu-English-Word-Frequency-Analyzer/analyzer.py` | 2KB | ⏳ Port 20 lines | Word frequency |
| `PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl` | 23KB | ⏳ Import to bank | 50 law Q&A |
| `PAKGOV-RAG-project/app/demo/app.py` | 4KB | ⏳ Optional service | RAG Streamlit |
| `interview-skills/extensions/mic-input/mic-input.js` | 12KB | ⏳ Port to spRec() | Auto-restart STT |
| `interview-skills/extensions/reference-answer/reference-answer.js` | 15KB | ⏳ Port | Ref answers |
| `interview-skills/extensions/export-md/export-md.js` | 13KB | ⏳ Port | MD export |
| `interview-skills/references/company-profiles.md` | 12KB | ⏳ Extract | Company styles |
| `interview-skills/ui/lib/pdf.min.js` | 377KB | 🔵 Copy to server | PDF parsing |
| `Intervity/src/analytics/MistakeClassifier.ts` | 5KB | ⏳ Port to JS | Answer diagnosis |
| `Intervity/src/analytics/StarMethodEvaluator.ts` | 2.4KB | ⏳ Port to JS | STAR scoring |
| `Intervity/src/analytics/SoftSkillsProsodyAnalyzer.ts` | 2KB | ⏳ Port to JS | WPM/fillers |
| `Intervity/src/core/llm/SystemPrompts.ts` | 9KB | ⏳ Port prompts | Pak persona |
| `Intervity/src/core/agent/AgentCoachingHarness.ts` | 24KB | ⏳ Port strategies | 11 strategies |
| `dictionariez/src/background/ai-lookup.js` | 4.4KB | ⏳ Port pattern | AI lookup cache |
| `dictionariez/src/background/localStorageCache.js` | 3.6KB | ⏳ Port | Cache factory |
| `dictionariez/src/background/ankiwindow.js` | 6KB | ⏳ Port | Anki export |
| `UTRNet/` | ~50MB code | 🔵 Optional service | Urdu OCR |

**Legend:** ✅ Done · ⏳ Next · 🔵 Optional · 🗑 Superseded

---

## 11. Future Ideas

### From open-source projects (research)
| Project | What to integrate |
|---------|-----------------|
| **AnkiConnect** | Anki flashcard export API (port 6006) |
| **compromise.js** | Better filler detection, sentence parsing |
| **Tesseract.js** | Browser-side OCR (instead of UTRNet Python service) |
| **highlight.js** | Syntax highlighting for code answers |
| **Chart.js** | Progress radar charts, skill heatmap |
| **Mermaid.js** | System design diagrams in answers |
| **fuse.js** | Better fuzzy search in Library |
| **idb** | Clean IndexedDB wrapper |

### Original ideas
| Idea | Complexity |
|------|-----------|
| Interview countdown calendar + daily schedule | Low |
| Answer template generator (STAR/BLUF/PAR) | Low |
| Timer presets per company (Google 45min, PITB 30min) | Low |
| Custom question importer (paste URL/text → AI extracts Q&A) | Low |
| Interview debrief mode (replay worst answers after session) | Medium |
| Weak topic heatmap (visual tags by performance) | Medium |
| Pair practice mode (two users on localhost network) | Medium |
| Voice stress analysis (pitch variance → nervousness indicator) | High |
| Screenshare interview mode (adjust UI for being watched) | High |
| Roman Urdu phonetic keyboard overlay | Low |

---

## 12. Architecture Constraints & Rules

### Hard rules
- **Single HTML file** — all JS/CSS inlined, no bundler, no npm at runtime
- **File size limit** — `interview-box.html` must stay under 6MB (current: 3.55MB, budget: 2.45MB remaining)
- **No CDN dependencies** — breaks offline usage; all external files serve from localhost:8765
- **No `eval()`** — IBX uses `Function()` constructor pattern; keep it
- **Never break `<script id="bank">`** — always verify question count = 2474 after any patch
- **Always backup** — `fs.copyFileSync(HTML, HTML+'.bak-'+Date.now())` before every patch
- **No direct main/master push** — use patch scripts on a backup, verify, then replace

### File size budget
| File | Current | Budget/Notes |
|------|---------|-------------|
| `interview-box.html` | 3.55 MB | Max 6 MB |
| `ibx-transliteration.js` | 636 KB | After roman_urdu_map.json merge → ~800KB |
| `pdf.min.js` | 377 KB | Serve separately, load lazy |
| `pdf.worker.min.js` | 1.1 MB | Serve separately, load lazy |
| ONNX model (neural translator) | 84 MB | Download once, cached in browser |

### Port assignments
| Service | Port | Notes |
|---------|------|-------|
| IBX HTTP server | 8765 | Python `http.server` or PowerShell |
| Whisper STT | 5051 | `python3 whisper_server.py` |
| PAKGOV RAG | 8501 | `streamlit run app/demo/app.py` |
| UTRNet OCR | 5052 | Optional separate service |
| AnkiConnect | 6006 | Anki desktop add-on |

### Confirmed working patch scripts
```
merge-banks.js              — merged 1950 legacy + 531 PITB → 2474 questions ✓
patch-whisper-improvements.js — 11 patches (WS state, auto-enable, retry, mic, UI) ✓
patch-translation.js         — trGet fallback chain + urToRoman + urToRoman helper ✓
patch-transliteration.js     — 7 patches (loadTranslit, romanToUrdu, isUrduScript, etc.) ✓
```

### Backup chain
```
interview-box.html.bak-20261020-182031      — original before any changes
interview-box.html.bak-merge-*             — after bank merge (2474 questions)
interview-box.html.bak-patch-*             — after whisper patches
interview-box.html.bak-translit-*          — after transliteration patches
```
