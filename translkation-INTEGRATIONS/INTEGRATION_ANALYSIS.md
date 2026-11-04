# Interview Box — Complete Integration Analysis
**Date:** 2026-10-21  
**System:** `interview-box.html` (3.55 MB, 2474 questions, localhost:8765)  
**Status:** Living master document — all projects analyzed, integration paths defined

---

## The Big Picture

You have **10 external projects** sitting alongside your main system. Together they form a complete stack for:

```
SPEECH INPUT  →  URDU NLP  →  ANSWER ANALYSIS  →  KNOWLEDGE RETRIEVAL  →  OUTPUT
─────────────────────────────────────────────────────────────────────────────────
Whisper (STT)    urduhack      Intervity         PAKGOV-RAG             dictionariez
roman-urdu-tr    urduify       interview-skills  (Constitution QA)      TTS playback
mic-input.js     Translit.     MistakeClassifier                        Anki export
UTRNet (OCR)     Word-Freq     STAR Evaluator
```

Every project fills a specific gap in your system. None overlap — they compose.

---

## Project-by-Project Analysis

---

### 1. `roman-urdu-translator` ⭐ HIGHEST VALUE

**What it is:** A from-scratch Transformer (81M params, ONNX-exported) trained on **1.81M sentence pairs** for bidirectional English ↔ Roman Urdu translation. The model runs **100% in the browser** via ONNX Runtime Web — no server, no API key. Weights are ~84MB, downloaded once, then cached.

**Key technical facts:**
- BLEU scores: 23.2 (en→ur), 30.7 (ur→en) on Tatoeba held-out set
- 24,000 joint BPE vocabulary (shared English+Roman Urdu)
- `roman_urdu_map.json` — **30,888 Urdu word → Roman Urdu** mappings (mined, not handcrafted)
- `tokenizer_joint.json` — 24,000 vocab + 23,738 BPE merge rules
- `web/urdu.js` — `Transliterator` class: NFC normalize → diacritic strip → run-level word lookup → char-level fallback
- `web/tokenizer.js` — Full byte-level BPE tokenizer port in pure JS (no dependencies)
- `web/translator.js` — ONNX greedy decoder, encoder runs once, decoder runs per token
- Direction auto-detection from a mined set of Roman Urdu marker words

**What it gives Interview Box:**

| Gap in IBX | What roman-urdu-translator provides |
|-----------|-----------------------------------|
| `ibx-transliteration.js` has 13,084 word dict | `roman_urdu_map.json` has **30,888** — 2.4× more coverage |
| `urToRoman()` is dictionary lookup only | Full neural translation: handles unseen words, context, grammar |
| No English → Roman Urdu path | Full translation: "What is a database?" → "database kya hoti hai?" |
| No Urdu normalization | `urdu.js` does NFC + diacritic strip + codepoint folding before lookup |

**Integration plan:**
1. **Merge `roman_urdu_map.json` (30,888 entries) into `ibx-transliteration.js`** — simple: load the JSON, merge with existing RU2UR dict, new entries win (larger coverage)
2. **Port `urdu.js` `Transliterator` class** into `ibx-transliteration.js` — replaces the existing UR_CHAR_MAP with the NFC+normalize+run-level approach (more accurate)
3. **Load ONNX model lazily** for full sentence translation — when user wants to translate a full interview answer between English and Roman Urdu (not just word lookup)

```js
// Step 1: merge roman_urdu_map.json into ibx-transliteration.js at build time
// In the generation script:
const newMap = JSON.parse(fs.readFileSync('roman-urdu-translator/roman_urdu_map.json'));
Object.assign(UR2RU, newMap); // 30,888 entries override/extend 12,956 existing
// Result: ~32,000+ unique Urdu→Roman entries

// Step 2: improved normalize() from urdu.js
function normalizeUrdu(text) {
  return text.normalize('NFC')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '') // diacritics
    .replace(/\u200C|\u200D|\u200B|\uFEFF/g, '') // zero-width
    .replace(/\s+/g, ' ').trim();
}
```

---

### 2. `urduhack` ⭐ HIGH VALUE

**What it is:** A production-grade Python NLP library for Urdu. The key value here is NOT the Python library itself but its **data and logic that can be ported to JS**.

**Key extractable assets:**

| File | What it contains | Size |
|------|----------------|------|
| `normalization/character.py` | **71 Urdu character normalization mappings** — Arabic lookalike chars → correct Urdu chars | 13KB |
| `tokenization/words.py` | **Large word list / tokenization rules** | 228KB (3,391 lines) |
| `stop_words.py` | Urdu stop words list | 4KB |
| `preprocessing/util.py` | `remove_diacritics()`, `normalize_whitespace()`, `strip_html()`, text cleaning | 9KB |
| `preprocessing/regexes.py` | Compiled regex patterns for Urdu preprocessing | 1.4KB |

**The critical piece — `_CORRECT_URDU_CHARACTERS_MAPPING`:**
```
'ک' maps from: ['ﮎ', 'ﮏ', 'ﮐ', 'ﮑ', 'ﻛ', 'ك']  (6 wrong variants → 1 correct)
'ی' maps from: ['ﯼ', 'ى', 'ﯽ', 'ﻰ', 'ﻱ', 'ﻲ', 'ﯾ', 'ﯿ', 'ي']  (9 variants)
'ہ' maps from: ['ﻩ', 'ﮦ', 'ﻪ', 'ﮧ', 'ﮩ', 'ﮨ', 'ه']  (7 variants)
```
71 characters, hundreds of variant→canonical mappings. **This is the missing piece in `ibx-transliteration.js`**: currently IBX's lookup fails on Arabic-lookalike Urdu chars because they don't match the dictionary keys. Normalization fixes this.

**What it gives Interview Box:**

| Gap | What urduhack provides |
|-----|----------------------|
| `UR2RU` lookup fails on Arabic variants of Urdu letters | `normalize_characters()` — fold all variants to canonical Urdu Unicode |
| Diacritics in Urdu text break word lookup | `remove_diacritics()` — strip ً ٍ ٌ ُ ِ َ ّ before lookup |
| Urdu punctuation spacing is inconsistent | `punctuations_space()` — fix spaces around ۔ ؟ ، |
| Urdu digits (۱۲۳) vs English digits | `replace_digits()` — normalize ۱→1, ۲→2 etc. |

**Integration plan — port normalization to JS (10 lines, huge impact):**
```js
// Port _CORRECT_URDU_CHARACTERS_MAPPING as a JS lookup table
// Add to ibx-transliteration.js as normalizeUrduChars()
var URDU_CHAR_NORM = {
  // ک variants
  '\uFE8E':'\u06A9','\uFE8F':'\u06A9','\uFE90':'\u06A9','\uFE91':'\u06A9','\uFB4B':'\u06A9','\u0643':'\u06A9',
  // ی variants  
  '\uFBFC':'\u06CC','\u0649':'\u06CC','\uFBFD':'\u06CC','\uFEF0':'\u06CC','\uFEF1':'\u06CC','\uFEF2':'\u06CC','\uFBFE':'\u06CC','\uFBFF':'\u06CC','\u064A':'\u06CC',
  // ہ variants
  '\uFEE9':'\u06C1','\uFBA6':'\u06C1','\uFEEA':'\u06C1','\uFBA7':'\u06C1','\uFBA9':'\u06C1','\uFBA8':'\u06C1','\u0647':'\u06C1',
  // + all other 68 mappings from character.py
};
function normalizeUrduChars(text) {
  return text.split('').map(function(c){ return URDU_CHAR_NORM[c]||c; }).join('');
}
// Call before every UR2RU lookup:
function urduToRoman(text) {
  text = normalizeUrduChars(text); // NEW — fixes Arabic variants
  text = removeDiacritics(text);   // NEW — strips ً ٍ ٌ
  // ... existing word lookup + char fallback
}
```

---

### 3. `PAKGOV-RAG-project` ⭐ HIGH VALUE (unique)

**What it is:** A Retrieval-Augmented Generation system over **Pakistani government legal documents** — Constitution of Pakistan, Pakistan Penal Code, CrPC, CPC, Rules of Business, ESTACODE, Senate Rules + Acts (10 PDFs, 6,711 chunks, 50 verified Q&A).

**Architecture:** PDF extraction → chunking → multilingual MiniLM-L12 embeddings (384-dim) → FAISS index → BM25 + dense hybrid RRF (k=60) → citation-grounded generation

**Proven results:**
- Hybrid RRF R@5 = 74% (finds correct passage in top 5 results, 74% of the time)
- Cross-lingual Urdu-English similarity = 0.8370 (same embedding space works for both)
- 37/50 answers generated with citations (74% grounded); 13/50 "insufficient evidence" (honest refusal)

**Data available right now (no setup needed):**
```
data/processed/senate_faiss/
  index.faiss   — 1,080 Senate document chunk embeddings (ready to use)
  chunks.jsonl  — 1,080 text chunks with metadata
data/eval/
  verified_qa_50.jsonl — 50 human-verified Q&A pairs (15 en, 15 ur, 20 mixed)
```

**What it gives Interview Box:**

| Gap | What PAKGOV-RAG provides |
|-----|------------------------|
| IBX has no Pakistan-specific knowledge base | 6,711 chunks of official Pakistani government documents |
| PITB interview prep: no Constitution/law knowledge | Ready-to-query RAG over Constitution, PPC, CrPC, ESTACODE |
| AI Coach has no factual grounding | Citation-grounded answers with page references |
| No bilingual (Urdu+English) search | Hybrid retrieval proven at 74% R@5 on mixed-language queries |

**Integration plan — 2 levels:**

**Level 1 (Easy — no server needed):** Add PAKGOV Q&A pairs to the question bank
```js
// Import verified_qa_50.jsonl as 50 new questions in the bank
// These are real government Q&A with human-verified answers
// Tags: pitb, constitution, pakistan, law, governance
// Category: "Pakistan Governance & Law"
```

**Level 2 (Medium — adds RAG endpoint):** Run the Streamlit demo alongside IBX
```bash
# Terminal 1: IBX
bash start-interview-box-linux.sh

# Terminal 2: PAKGOV RAG (port 8501)
cd PAKGOV-RAG-project
pip install streamlit sentence-transformers faiss-cpu rank_bm25
streamlit run app/demo/app.py --server.port 8501
```
Then add a "🏛 Pakistan Law" button in IBX's Coach view that queries `localhost:8501/api/query`.

**Level 3 (High value — IBX-native API):** Wire IBX's `SAMPLE()` with PAKGOV RAG as a retrieval layer
```js
function coachWithPAKGOV(question, cb) {
  // 1. Query PAKGOV RAG for relevant passages
  fetch('http://localhost:8501/api/query', {
    method: 'POST',
    body: JSON.stringify({query: question, top_k: 3})
  }).then(r=>r.json()).then(function(rag) {
    // 2. Inject passages as context into AI prompt
    var context = rag.passages.map(function(p){
      return '[Source: '+p.source+' p.'+p.page+']\n'+p.text;
    }).join('\n\n');
    SAMPLE([
      {role:'system', content:'Answer using ONLY the provided context. Cite sources.'},
      {role:'user', content:'Context:\n'+context+'\n\nQuestion: '+question}
    ], cb);
  });
}
```

---

### 4. `UTRNet-High-Resolution-Urdu-Text-Recognition` ⭐ MEDIUM-HIGH VALUE

**What it is:** A deep learning model (HRNet + DBiLSTM + CTC) for **OCR of printed Urdu text** in images/PDFs. Published in Springer ICDAR 2023. Key feature: handles high-resolution Urdu text in printed documents.

**Architecture:** HRNet (feature extraction) → DBiLSTM (sequence modeling) → CTC (prediction)
**Supported glyphs:** 180 Urdu character forms (UrduGlyphs.txt)

**What it gives Interview Box:**

| Gap | What UTRNet provides |
|-----|---------------------|
| Resume PDFs sometimes have scanned Urdu text | OCR → extract text from Urdu resume images |
| PAKGOV has 2 scanned PDFs (0 chars extracted) | UTRNet can process them after OCR |
| Whiteboard/printed question images | Convert Urdu text images → searchable text |

**Integration plan (Medium effort):**

UTRNet requires PyTorch + CUDA — run as a **microservice alongside Whisper**:
```python
# Add to whisper_server.py (or a separate ocr_server.py on port 5052)
@app.route('/ocr', methods=['POST'])
def ocr():
    # Receives image file, returns extracted Urdu text
    image = request.files['image']
    # ... UTRNet inference ...
    return jsonify({'text': extracted_text})
```

In IBX, add "📷 Scan Urdu" button for resume image upload:
```js
function scanUrduImage(file, cb) {
  var fd = new FormData();
  fd.append('image', file);
  fetch('http://127.0.0.1:5052/ocr', {method:'POST', body:fd})
    .then(r=>r.json()).then(function(j){ cb(j.text); });
}
```

**Note:** Model weights need to be downloaded separately from the paper's HuggingFace repo.

---

### 5. `urduify` ✅ ALREADY INTEGRATED

**Status:** Data compiled into `ibx-transliteration.js` (636KB)  
**What was extracted:** 16,091 Roman→Urdu word pairs, 501 English+Urdu+Roman tech triples, 3,944 TSV pairs

**What still needs to be done:**
- Merge `roman_urdu_map.json` (30,888 entries from roman-urdu-translator) to expand coverage
- Add diacritic normalization from urduhack before lookup
- Add Punjabi pairs from `UrduHighFreqList.xlsx`

---

### 6. `Transliteration-RomantoUrdu-And-ViceVersa` ✅ ALREADY INTEGRATED

**Status:** Character map compiled into `ibx-transliteration.js`  
**What was extracted:** 48-char Unicode map, bidirectional functions

**What still needs to be done:**
- Replace with the more accurate `urdu.js` approach from roman-urdu-translator

---

### 7. `Urdu-English-Word-Frequency-Analyzer` ⭐ LOW-MEDIUM VALUE

**What it is:** A CS50P project — reads any text file, counts word frequency, exports CSV. Works for both English and Roman Urdu.

**Key capability:** `get_top_words(text, top_n=10)` — finds top N words from any text (English or Roman Urdu)

**What it gives Interview Box:**

| Gap | What it provides |
|-----|----------------|
| No word frequency analysis in answer feedback | Count which filler words appear most in user's answers |
| No topic coverage analysis | Which tags/topics appear most/least in practiced questions |
| No vocabulary richness metric | Unique word count vs total words (vocabulary diversity) |

**Integration plan (Very easy — port 20 lines of Python to JS):**
```js
function wordFrequency(text, topN) {
  topN = topN || 10;
  var words = text.toLowerCase().match(/[a-zA-Z0-9']+/g) || [];
  var counts = {};
  words.forEach(function(w){ counts[w]=(counts[w]||0)+1; });
  return Object.entries(counts)
    .sort(function(a,b){return b[1]-a[1]})
    .slice(0,topN)
    .map(function(e){return {word:e[0], count:e[1]}});
}

// Use in spAnalyse(): show top repeated words
function answerVocabStats(text) {
  var freq = wordFrequency(text, 20);
  var FILLERS = new Set(['um','uh','like','basically','actually','you','know','so','right','okay']);
  var fillers = freq.filter(function(e){return FILLERS.has(e.word)});
  var unique = new Set(text.toLowerCase().match(/[a-z]+/g)||[]).size;
  var total = (text.match(/\S+/g)||[]).length;
  return {
    topWords: freq.slice(0,5),
    fillerWords: fillers,
    uniqueRatio: total?Math.round(unique/total*100):0,
    diversity: unique>40?'Rich vocabulary':unique>20?'Average':'Limited vocabulary'
  };
}
```

---

### 8. `interview-skills` 📋 PENDING INTEGRATION

**Status:** Analyzed, not yet integrated  
**What it provides:** mic-input.js, reference-answer.js, export-md.js, PDF parsing, company profiles

**Priority items (from INTEGRATION_GUIDE.md):**
- #3: Auto-restart SpeechRecognition (mic-input.js) — fixes 60s cutoff bug
- #5: Reference answer + good/bad comparison (reference-answer.js)
- #6: Session export as Markdown (export-md.js)
- #8: Company interview style profiles (PITB, Google, Amazon)
- #11: PDF resume parsing (pdf.min.js)

---

### 9. `Intervity` 📋 PENDING INTEGRATION

**Status:** Analyzed, not yet integrated  
**What it provides:** MistakeClassifier, STAR Evaluator, 11 coaching strategies, SystemPrompts

**Priority items (from INTEGRATION_GUIDE.md):**
- #1: MistakeClassifier (4 tiers: CONCEPTUAL/L4_CEILING/VAGUE/STRUCTURAL)
- #2: STAR Evaluator (behavioral answer scoring)
- #4: Pakistani interviewer persona prompt
- #7: Prosody analyzer (WPM/fillers)
- #9: 11 coaching strategies

---

### 10. `dictionariez` 📋 PENDING INTEGRATION

**Status:** Analyzed, not yet integrated  
**What it provides:** Word hover lookup, AI contextual lookup, Anki export, TTS player

**Priority items (from INTEGRATION_GUIDE.md):**
- #10: AI contextual lookup with cache (queue+cache pattern)
- #13: Anki flashcard export
- #14: Word hover dictionary

---

## How All 10 Projects Work Together

This is the unified integration map — how each project connects to the others and to IBX:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERVIEW BOX (interview-box.html)              │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ QUESTION │  │ SPEAKING     │  │ MOCK     │  │ AI COACH     │  │
│  │ LIBRARY  │  │ COACH        │  │ INTERVIEW│  │ (Chat)       │  │
│  │ 2474 Qs  │  │ spAnalyse()  │  │ SAMPLE() │  │ SAMPLE()     │  │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └──────┬───────┘  │
│       │               │               │               │           │
└───────┼───────────────┼───────────────┼───────────────┼───────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                    INTEGRATION LAYER                            │
  │                                                                 │
  │  ibx-transliteration.js (636KB, lazy-loaded)                   │
  │  ├── urduify data: 13,084 Roman→Urdu, 12,956 Urdu→Roman        │
  │  ├── Transliteration: 48-char Unicode map                       │
  │  ├── + roman-urdu-translator: 30,888 Urdu→Roman (MERGE)        │
  │  └── + urduhack: 71-char normalization + diacritic strip (ADD) │
  │                                                                 │
  │  whisper_server.py (port 5051)                                 │
  │  ├── Whisper STT (base model, upgradeable to turbo/small)      │
  │  ├── Roman Urdu post-processing                                 │
  │  ├── WAV conversion via ffmpeg                                  │
  │  └── /progress, /health, /transcribe endpoints                 │
  │                                                                 │
  │  [PENDING] patch-intervity.js                                  │
  │  ├── MistakeClassifier → spAnalyse()                           │
  │  ├── STAR Evaluator → spAnalyse() for behavioral Qs            │
  │  ├── Prosody analyzer → spAnalyse() + Whisper duration         │
  │  └── Pakistani interviewer persona → Mock SAMPLE() prompt      │
  │                                                                 │
  │  [PENDING] patch-interview-skills.js                           │
  │  ├── Auto-restart SpeechRecognition → spRec()                  │
  │  ├── Reference answer → question cards                         │
  │  ├── Session export MD → Mock/Progress views                   │
  │  ├── Company profiles → JD prep view                           │
  │  └── PDF parsing → JD prep resume upload                       │
  │                                                                 │
  │  [PENDING] patch-dictionariez.js                               │
  │  ├── AI lookup cache → question card "Explain" button          │
  │  └── Anki export → question card actions                       │
  │                                                                 │
  │  [PENDING] PAKGOV RAG (port 8501, optional service)            │
  │  ├── 6,711 Pakistan law document chunks                        │
  │  ├── Hybrid BM25+dense retrieval (R@5=74%)                     │
  │  └── Citation-grounded answers for law/constitution Qs         │
  │                                                                 │
  │  [OPTIONAL] UTRNet OCR service (port 5052)                     │
  │  └── Urdu image/PDF OCR → text extraction                     │
  └─────────────────────────────────────────────────────────────────┘
```

### Data flow example: User speaks in Roman Urdu, gets full answer analysis

```
1. User speaks: "mein ne laravel main queue ka kaam kiya"
   ↓
2. Whisper (port 5051) — transcribes audio → Roman Urdu text
   roman_hint via ibx-transliteration.js (UR2RU 12,956 entries)
   ↓
3. spAnalyse() — runs on transcribed text:
   a. wordFrequency() [from Urdu-English-Word-Frequency-Analyzer port]
   b. prosodyAnalyze() [from Intervity SoftSkillsProsodyAnalyzer port]
   c. classifyMistake() [from Intervity MistakeClassifier port]
   d. starEval() if behavioral question [from Intervity STAR Evaluator]
   ↓
4. IBX_TR.romanToUrdu("mein ne laravel main queue ka kaam kiya")
   → "میں نے لاریول میں کیو کا کام کیا"  [via ibx-transliteration.js]
   ↓
5. AI Check: SAMPLE() with Pakistani interviewer persona [from Intervity SystemPrompts]
   + Company style profile if JD has company name [from interview-skills company-profiles]
   ↓
6. Output shown:
   - MistakeClassifier: "L4_CEILING — missing failure modes"
   - STAR score: Action=35/50 (needs quantification)
   - Urdu script version shown in RTL block
   - Reference answer button [from interview-skills reference-answer.js]
```

### Data flow example: User asks a Pakistan law question to AI Coach

```
1. User types: "PITB ke liye kya compliance requirements hain?"
   ↓
2. IBX_TR.romanToUrdu() → "PITB کے لیے کیا compliance requirements ہیں؟"
   ↓
3. PAKGOV RAG (port 8501):
   Query → Hybrid RRF retrieval → Top 3 chunks from ESTACODE/Constitution
   → "PITB is established under Punjab IT Board Act 2012, Section 5..."
   ↓
4. SAMPLE() with retrieved context + citation
   → Answer with source: [Constitution p.XX / ESTACODE p.YY]
   ↓
5. IBX_TR.urduToRoman() if user prefers Roman Urdu display
```

---

## What Needs to Happen Next (Priority Queue)

### Immediate (do now — no new servers needed)

**Step 1: Rebuild `ibx-transliteration.js` with expanded data**
```
node rebuild-translit.js
```
- Merge `roman_urdu_map.json` (30,888 entries) into existing UR2RU
- Add urduhack's 71-char normalization table
- Add diacritic strip + NFC normalize before lookup
- Result: ~32,000+ entry dict, correct on Arabic variants
- New file size: ~800KB (still within budget)

**Step 2: Implement MistakeClassifier + STAR Evaluator + Prosody (from Intervity)**
```
node patch-intervity-analytics.js
```
- 3 pure-JS functions, ~150 lines total
- Wire into existing `spAnalyse()`
- Zero new dependencies, zero new servers

**Step 3: Auto-restart SpeechRecognition (from interview-skills mic-input.js)**
```
node patch-speech-recognition.js
```
- Fixes the 60-second cutoff bug
- ~30 lines of JS changes to `spRec()`

**Step 4: Company style profiles + Pakistani interviewer persona**
```
node patch-personas.js
```
- Add `COMPANY_STYLES` object to IBX
- Add Pakistani tech context to mock interviewer prompt
- Zero new dependencies

### Short-term (this week — optional services)

**Step 5: Add PAKGOV Q&A to question bank**
```
node add-pakgov-bank.js
```
- Import 50 verified Q&A from `verified_qa_50.jsonl` as new questions
- Tags: `constitution`, `pakistan`, `law`, `pitb`, `governance`
- Category: "Pakistan Governance & Law"

**Step 6: Reference answer + session export MD**
```
node patch-reference-answers.js
```
- `💡 Reference` button on question cards (localStorage cache)
- `📄 Export MD` button on mock session completion

### Medium-term (needs server setup)

**Step 7: PAKGOV RAG service**
```bash
cd PAKGOV-RAG-project && pip install streamlit sentence-transformers faiss-cpu rank_bm25
streamlit run app/demo/app.py --server.port 8501
```
- Adds Pakistan law knowledge to AI Coach
- R@5 = 74% on verified Q&A

**Step 8: UTRNet OCR service**
- Download model weights from HuggingFace
- Run as microservice on port 5052
- Add "📷 Scan" button for Urdu image upload

---

## Complete File Inventory

| File/Project | Size | Status | What it provides |
|-------------|------|--------|----------------|
| `interview-box.html` | 3.55MB | ✅ Active | Main app, 2474 questions |
| `whisper_server.py` | 14KB | ✅ Active (port 5051) | Offline STT, Roman Urdu post-proc |
| `ibx-transliteration.js` | 636KB | ✅ Active (port 8765) | 13K Roman↔Urdu dict |
| `roman-urdu-translator/roman_urdu_map.json` | 744KB | ⏳ Merge into translit.js | 30,888 Urdu→Roman entries |
| `roman-urdu-translator/web/urdu.js` | 2.8KB | ⏳ Port normalize() | Better Urdu normalization |
| `roman-urdu-translator/web/tokenizer.js` | 7.4KB | 🔵 Optional | BPE tokenizer for ONNX model |
| `roman-urdu-translator/web/translator.js` | 7.1KB | 🔵 Optional | ONNX sentence translation |
| `urduhack/normalization/character.py` | 13KB | ⏳ Port to JS | 71-char normalization map |
| `urduhack/preprocessing/util.py` | 9.7KB | ⏳ Port remove_diacritics | Urdu text cleaning |
| `PAKGOV-RAG-project/data/eval/verified_qa_50.jsonl` | 23KB | ⏳ Import to bank | 50 Pakistan law Q&A |
| `PAKGOV-RAG-project/data/processed/senate_faiss/` | 2.8MB | ⏳ RAG service | 1,080 Senate chunks |
| `UTRNet/` | ~50MB code | 🔵 Optional service | Urdu OCR |
| `urduify/` | ✅ Integrated | — | Data already in translit.js |
| `Transliteration-*/` | ✅ Integrated | — | Char map already in translit.js |
| `Urdu-English-Word-Frequency-Analyzer/analyzer.py` | 2KB | ⏳ Port 20 lines | Word freq analysis |
| `interview-skills/extensions/mic-input/mic-input.js` | 12KB | ⏳ Port to spRec() | Auto-restart STT |
| `interview-skills/extensions/reference-answer/reference-answer.js` | 15KB | ⏳ Port pattern | Reference answers |
| `interview-skills/extensions/export-md/export-md.js` | 13KB | ⏳ Port pattern | Markdown session export |
| `interview-skills/references/company-profiles.md` | 12KB | ⏳ Extract | 15+ company styles |
| `interview-skills/ui/lib/pdf.min.js` | 377KB | 🔵 Copy to server | PDF resume parsing |
| `Intervity/src/analytics/MistakeClassifier.ts` | 5KB | ⏳ Port to JS | Answer mistake diagnosis |
| `Intervity/src/analytics/StarMethodEvaluator.ts` | 2.4KB | ⏳ Port to JS | STAR scoring |
| `Intervity/src/analytics/SoftSkillsProsodyAnalyzer.ts` | 2KB | ⏳ Port to JS | WPM/filler analysis |
| `Intervity/src/core/llm/SystemPrompts.ts` | 9KB | ⏳ Port prompts | Pakistani interviewer persona |
| `Intervity/src/core/agent/AgentCoachingHarness.ts` | 24KB | ⏳ Port strategies | 11 coaching strategies |
| `dictionariez/src/background/ai-lookup.js` | 4.4KB | ⏳ Port pattern | Queue+cache AI lookup |
| `dictionariez/src/background/localStorageCache.js` | 3.6KB | ⏳ Port pattern | Cache factory |
| `dictionariez/src/background/ankiwindow.js` | 6KB | ⏳ Port | Anki flashcard export |

**Legend:** ✅ Done | ⏳ Next | 🔵 Optional/later

---

## Cumulative Impact When All Integrated

| Feature | Before | After |
|---------|--------|-------|
| Roman↔Urdu dictionary | 13,084 words | 32,000+ words |
| Urdu normalization | None (Arabic variants break lookup) | 71-char map + diacritic strip |
| Speech recognition | 60s cutoff bug | Continuous auto-restart |
| Answer feedback | WPM + fillers | + MistakeClassifier + STAR score + vocabulary diversity |
| Mock interviewer | Generic prompt | Pakistani tech context + company style profiles |
| Question bank | 2,474 questions | + 50 Pakistan law Q&A |
| Knowledge base | None | 6,711 Pakistan govt document chunks (R@5=74%) |
| Urdu OCR | None | UTRNet 180-glyph OCR (optional) |
| Sentence translation | Dictionary lookup only | Neural model (BLEU 30.7) in browser |
| Anki export | None | One-click Q&A → Anki flashcard |
