# Interview Box — v7 → PWA Complete Merge Plan
## All Features · All Categories · All AI Providers · Mobile + Vercel Ready

**Date:** 2026-10-27
**Decision:** PWA path selected. The `pwa/` React 19 app is the target. Everything
from v7 that the PWA is missing gets merged in. The PWA then becomes the single
app deployed to Vercel and installed on mobile.

---

## Gap Analysis — What v7 Has That the PWA Is Missing

### 1. Question Bank: 524 Missing Questions (6 Categories)

The extractor `npm run extract` pulls 1,950 from v7. The v7 HTML has 2,474.
The 524 missing questions belong to these 6 categories (confirmed by diffing):

| Category | Questions | Why missing |
|----------|-----------|-------------|
| Interview Prep Roman Urdu Version (Poori Guide) | ~183 | Different `s` value, extractor skips |
| Interview Prep 2 PITB Pakistan Railways ITOPS | ~136 | Same reason |
| Interview Prep Senior Software Engineer ITOPS | ~76 | Same reason |
| Level-wise Interview Q&A (Roman Urdu) Junior→Senior | ~73 | Same reason |
| Roman Urdu v2 (Modern Dev Style) | ~28 | Same reason |
| Senior PHP Laravel Interview 5 Server Questions (Roman Urdu) | ~20 | Same reason |

Also missing from the PWA:
- `interview-box-banks-clean.json` (334 KB) — additional Q&A bank

### 2. AI Providers: 3 Missing from PWA

| Provider | v7 PROV | PWA PROVIDERS | Action |
|----------|---------|---------------|--------|
| Mistral | ✅ `mistral` | ❌ Missing (only in resolveFamily comment) | Add |
| xAI / Grok | ✅ `xai` | ❌ Missing | Add |
| Fireworks | ✅ `fireworks` | ❌ Missing | Add |
| freellmpool | Via `custom` | Via `custom` (Ollama-compatible) | Already works |

### 3. Intelligence Features: Missing from PWA (all in patch-phase1-enhancements.js)

| Feature | v7 (patched) | PWA | Target file |
|---------|-------------|-----|-------------|
| MistakeClassifier (4-tier) | ✅ `window.classifyMistake` | ❌ | `src/lib/features.ts` |
| STAR Evaluator (4-axis, 100-point) | ✅ `window.starEval` | ❌ | `src/lib/features.ts` |
| Prosody Analyzer (pacing/fillers) | ✅ `window.prosodyAnalyze` | ⚠️ Basic only | `src/lib/features.ts` |
| Word Frequency / Vocab Diversity | ✅ `window.vocabDiversity` | ❌ | `src/lib/features.ts` |
| Pakistani Interviewer Persona | ✅ `window.INTERVIEWER_PROMPT_PAK` | ❌ | `src/lib/features.ts` |
| Company Style Profiles (13 companies) | ✅ `window.COMPANY_STYLES` | ❌ | `src/lib/settings.ts` |
| Reference Answers (Good vs Bad) | ✅ `window.openRef` | ❌ | `src/features/Library.tsx`, `src/components/QCard.tsx` |
| Session Markdown Export | ✅ `window.exportSessionMD` | ❌ | `src/features/Mock.tsx` |
| AI Lookup Cache Factory | ✅ `window.ibxCacheFactory` | ⚠️ Uses Dexie | `src/lib/features.ts` |
| Urduhack Char Normalization (71 maps) | ✅ `window.normalizeUrdu` | ❌ | `src/lib/lang.ts` |
| Anki Flashcard Export | ✅ `window.ankiAdd` | ❌ | `src/lib/backup.ts` |
| Agent Memory (cross-session) | ✅ `window.IBX_AGENT_MEM` | ❌ | `src/lib/db.ts` + `src/features/AiStudio.tsx` |
| Adaptive QBL Curriculum | ✅ `window.qblPick` | ❌ | `src/lib/queries.ts` |
| Coaching Strategy Dispatcher | ✅ `window.coachStrategy` | ❌ | `src/lib/features.ts` |

### 4. Speaking Coach: Enhanced Analysis Missing

The PWA `speakingFeedback()` in `features.ts` is good but doesn't include:
- Enhanced prosody (pacing score 0-100, South Asian filler detection)
- STAR evaluation on behavioral answers
- MistakeClassifier tier shown in feedback
- Vocab diversity metric shown alongside WPM

### 5. Mock Interview: Missing Features

| Feature | v7 | PWA |
|---------|----|----|
| Pakistani persona option | ✅ | ❌ (only 4 generic personas) |
| Company style injection in prompt | ✅ | ❌ |
| MistakeClassifier on each answer | ✅ | ❌ |
| STAR score on behavioral questions | ✅ | ❌ |
| Markdown export at end | ✅ | ❌ |
| Anki export of weak answers | ✅ | ❌ |

### 6. Urdu Normalization: Missing from `lang.ts`

The v7 patch adds 71-char normalization + diacritics stripping. PWA `lang.ts`
has `ruNorm()` for Roman Urdu but lacks the full urduhack normalization for
Urdu script. This means WhatsApp/phone-copied Urdu text fails in translation
and transliteration lookups.

### 7. Library/QCard: Missing Actions

| Action | v7 | PWA QCard |
|--------|----|----|
| 💡 Reference Answer button | ✅ | ❌ |
| 📄 Export question as Anki card | ✅ | ❌ |
| ⭐ STAR / MistakeClassifier on card | ✅ | ❌ |
| 🏢 Company context button | ✅ | ❌ |

---

## Implementation Plan — Ordered by Priority

### Phase A — Extract All 2,474 Questions (Prerequisite, 1 hour)

**Problem:** The extractor skips 524 questions because it filters by `s` field.
**Fix:** Update `scripts/extract-v7.mjs` to include ALL question sources.

```javascript
// Current: scripts/extract-v7.mjs filters by source
// v7 sources: 'b' (book), 'n' (new 2026)
// Missing: the 6 parts with Roman Urdu / PITB content have s:'n' but
// different part names. The extractor already gets them — the issue is
// that bankJson may need re-running after the ibx-transliteration.js update.

// Step 1: Verify and re-run:
cd pwa
node scripts/extract-v7.mjs ../interview-box.html
// Expected: bank: 2474 questions, 50 parts

// Step 2: If still 1950, patch extract-v7.mjs:
// Find the filterBank function and remove any source filter, keeping ALL questions.
```

The `interview-box-banks-clean.json` (334 KB, separate bank) must also be
imported. Add a merge step in the extractor:

```javascript
// In scripts/extract-v7.mjs, after writing bank.json:
import banksClean from '../interview-box-banks-clean.json' assert { type: 'json' };
const merged = [...bank, ...banksClean.filter(q => !bankIds.has(q.id))];
fs.writeFileSync(path.join(outDir, 'bank.json'), JSON.stringify(merged));
```

---

### Phase B — Add Missing AI Providers (2 hours)

**Target file:** `pwa/src/lib/ai.ts`

Add Mistral, xAI, and Fireworks to the `PROVIDERS` object and `ProviderId` type.

```typescript
// In ai.ts — extend ProviderId:
export type ProviderId = 'server' | 'puter' | 'claude' | 'gemini' | 'groq' |
  'openrouter' | 'openai' | 'anthropic' | 'custom' |
  'mistral' | 'xai' | 'fireworks'  // ← ADD THESE

// In PROVIDERS:
mistral: {
  id: 'mistral',
  name: 'Mistral AI',
  cost: 'Free tier',
  keyUrl: 'https://console.mistral.ai/api-keys',
  model: 'mistral-small-latest',
  base: 'https://api.mistral.ai/v1',
  needsKey: true,
  note: 'Mistral is strong at code and multi-lingual tasks.',
},
xai: {
  id: 'xai',
  name: 'xAI (Grok)',
  cost: 'Free trial credits',
  keyUrl: 'https://console.x.ai/',
  model: 'grok-beta',
  base: 'https://api.x.ai/v1',
  needsKey: true,
  note: 'xAI Grok — OpenAI-compatible API.',
},
fireworks: {
  id: 'fireworks',
  name: 'Fireworks AI',
  cost: 'Free trial',
  keyUrl: 'https://fireworks.ai/api-keys',
  model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  base: 'https://api.fireworks.ai/inference/v1',
  needsKey: true,
  note: 'Fast open-source models. Good fallback for Groq.',
},
```

**In `providers.ts` — add to `callProvider`:**
Mistral, xAI, and Fireworks all use OpenAI-compatible APIs, so they
route through the existing `openAiStyle()` function with no changes needed.
The `callProvider()` already handles any `ProviderId` via `openAiStyle(baseFor(p), keyFor(p), model, msgs, opts, extraHeaders(p))`.

**In `resolveFamily` in `ai.ts` — add entries:**
```typescript
mistral: ['mistral'],
grok: ['grok'],
fireworks: ['llama', 'fireworks'],
```

---

### Phase C — Port Intelligence Features to TypeScript (4 hours)

**Target file:** `pwa/src/lib/features.ts`

#### C.1 — MistakeClassifier

```typescript
export type MistakeTier = 'CONCEPTUAL' | 'L4_CEILING' | 'VAGUE' | 'STRUCTURAL'

export interface MistakeResult {
  cat: MistakeTier
  color: string
  icon: string
  critique: string
  golden: string
  model: string
}

/** 4-tier answer diagnosis (ported from Intervity MistakeClassifier.ts via v7 patch). */
export function classifyMistake(answer: string): MistakeResult | null {
  if (!answer || answer.length < 10) return null
  const t = answer.toLowerCase()

  // Tier 1: Conceptual / Factual error
  if (
    t.includes('direct on gpu') || t.includes('dom element') ||
    t.includes('threads without locks') ||
    t.includes('javascript is synchronous so') ||
    t.includes('single threaded so no concurrency')
  ) {
    return {
      cat: 'CONCEPTUAL', color: '#B3261E', icon: '🔴',
      critique: 'Fundamental misunderstanding of core architecture and runtime memory models.',
      golden: 'Ground explanations in memory ownership and native runtime thread boundaries.',
      model: 'Always ground explanations in memory ownership and native runtime thread boundaries.',
    }
  }

  // Tier 2: L4 Ceiling — technically correct but missing senior failure modes
  if (
    (t.includes('redis') && !t.includes('stampede') && !t.includes('eviction') &&
     !t.includes('lock') && !t.includes('cache')) ||
    (t.includes('kafka') && !t.includes('partition') && !t.includes('offset') &&
     !t.includes('consumer group')) ||
    (t.includes('queue') && !t.includes('retry') && !t.includes('dead letter') &&
     !t.includes('idempoten'))
  ) {
    return {
      cat: 'L4_CEILING', color: '#E65100', icon: '🟠',
      critique: 'Technically correct happy-path but missing high-throughput failure modes.',
      golden: 'Add: cache stampede mitigation, eviction strategies, dead-letter queues, consumer group rebalance.',
      model: 'When discussing caching or messaging, explain invalidation, eviction, and failure recovery.',
    }
  }

  // Tier 3: Vague hand-waving
  if (
    answer.length < 80 ||
    /it handled everything|we used .* to make it fast|basically it just works|it was very efficient/i.test(t) ||
    (!t.includes('ms') && !t.includes('%') && !t.includes('per second') &&
     !t.includes('qps') && !t.includes('rps') && !t.includes('users') &&
     !t.includes('reduced') && !t.includes('improved') && !t.includes('latency') &&
     answer.length < 150)
  ) {
    return {
      cat: 'VAGUE', color: '#F4D83D', icon: '🟡',
      critique: 'Superficial buzzword usage without explaining underlying mechanics.',
      golden: 'Add throughput numbers, partition strategy, batch sizes, specific metrics.',
      model: 'Never state what technology you used without quantifying throughput and failure modes.',
    }
  }

  // Tier 4: Structural — missing personal ownership
  if (
    !t.includes(' i ') && !t.includes('i designed') && !t.includes('i implemented') &&
    !t.includes('i built') && !t.includes('i led') && !t.includes('i solved') &&
    !t.includes('i refactored') && !t.includes('i chose')
  ) {
    return {
      cat: 'STRUCTURAL', color: '#1565C0', icon: '🟣',
      critique: 'Missing quantitative metrics and personal ownership ("I" vs "We").',
      golden: 'Use "I designed/implemented" + p99 latency, % improvement, cost savings, user impact.',
      model: 'Always deliver BLUF and close with measurable business impact using first-person ownership.',
    }
  }

  return null // answer is solid
}
```

#### C.2 — STAR Evaluator (exact port from v7 patch)

```typescript
export interface StarScore {
  situation: number   // max 15
  task: number        // max 15
  action: number      // max 50
  result: number      // max 20
  total: number       // /100
  grade: 'Excellent' | 'Good' | 'Needs work' | 'Incomplete'
  feedback: string[]
  isBehavioral: boolean
}

/** STAR method evaluator — Situation(15%) + Task(15%) + Action(50%) + Result(20%). */
export function starEval(answer: string): StarScore {
  if (!answer || answer.length < 10) {
    return { situation: 0, task: 0, action: 0, result: 0, total: 0,
             grade: 'Incomplete', feedback: [], isBehavioral: false }
  }
  const t = answer.toLowerCase()
  const fb: string[] = []

  // Situation: context setting
  const hasSit = t.includes('when') || t.includes('at ') || t.includes('project') ||
    t.includes('team') || t.includes('while working') || t.includes('our ')
  const sitS = hasSit ? 15 : 5
  if (!hasSit) fb.push('Clarify the business context or project scope early in your response.')

  // Task: problem definition
  const hasTask = t.includes('goal') || t.includes('needed to') || t.includes('problem') ||
    t.includes('sla') || t.includes('bottleneck') || t.includes('challenge') ||
    t.includes('issue') || t.includes('faced') || t.includes('deadline')
  const taskS = hasTask ? 15 : 5
  if (!hasTask) fb.push('Explicitly state the SLA, deadline, or engineering hurdle.')

  // Action: individual contribution (most important — 50%)
  const actCount = (t.match(/\b(i implemented|i designed|i built|i refactored|i profiled|i debugged|i led|i chose|i solved|i resolved|i migrated|i optimized|i created|i developed|i architected)\b/g) || []).length
  const actS = actCount >= 2 ? 50 : actCount >= 1 ? 35 : 20
  if (actCount === 0) fb.push('Take direct ownership using "I designed/implemented" instead of ambiguous "We" phrasing.')

  // Result: measurable metrics
  const hasRes = /\b(\d+%|\d+\s*ms|\d+\s*seconds|\$\d+|\d+\s*k|\d+\s*qps|\d+\s*users|\d+\s*rps)\b/i.test(t) ||
    t.includes('reduced') || t.includes('increased') || t.includes('improved') ||
    t.includes('saved') || t.includes('decreased')
  const resS = hasRes ? 20 : 5
  if (!hasRes) fb.push('Quantify the outcome with concrete metrics (latency reduction, cost savings, RPS, user impact).')

  const total = sitS + taskS + actS + resS
  const grade = total >= 85 ? 'Excellent' : total >= 65 ? 'Good' : total >= 45 ? 'Needs work' : 'Incomplete'

  return { situation: sitS, task: taskS, action: actS, result: resS, total, grade, feedback: fb, isBehavioral: true }
}
```

#### C.3 — Enhanced Prosody Analyzer

```typescript
export interface ProsodyResult {
  wpm: number
  words: number
  fillerCount: number
  fillerDensity: number   // percent
  pacingScore: number     // 0-100
  rating: 'excellent' | 'good' | 'needs work'
  advice: string
  fillers: string[]
}

/** Enhanced prosody analyzer with South Asian English verbal crutches.
 *  Replaces the basic speechMetrics() for scored feedback. */
export function prosodyAnalyze(text: string, durationSec: number, turnLatencyMs = 0): ProsodyResult {
  const t = String(text || '').trim()
  const wordArr = t.split(/\s+/).filter(Boolean)
  const wordCount = wordArr.length
  const duration = durationSec > 0 ? durationSec : 1
  const wpm = wordCount > 0 ? Math.round((wordCount / duration) * 60) : 0

  // Universal fillers + South Asian English crutches (na, means, ya, correct?)
  const FILLER_RE = /\b(um+|uh+|er+|ah+|hmm+|basically|actually|sort of|kind of|i mean|ya|na|means|you know|like|literally|right|okay|so|correct\?)\b/gi
  const matches = t.match(FILLER_RE) || []
  const fillerCount = matches.length
  const fillerDensity = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) : 0

  // Pacing score: 120–155 WPM sweet spot
  let pacingScore = 100
  if (wpm > 0) {
    if (wpm < 100) pacingScore -= (100 - wpm) * 0.8
    else if (wpm > 165) pacingScore -= (wpm - 165) * 0.7
  }
  if (fillerDensity > 1.5) pacingScore -= (fillerDensity - 1.5) * 8
  if (turnLatencyMs > 4500) pacingScore -= (turnLatencyMs - 4500) / 200
  pacingScore = Math.min(100, Math.max(0, Math.round(pacingScore)))

  const rating: ProsodyResult['rating'] = wpm >= 120 && wpm <= 160 && fillerDensity < 5
    ? 'excellent'
    : wpm >= 100 && fillerDensity < 10 ? 'good' : 'needs work'

  const advice = wpm < 100 ? 'Speak faster — aim for 120–160 WPM'
    : wpm > 180 ? 'Slow down — clarity over speed'
    : fillerDensity > 10 ? 'Reduce fillers (um, uh, like) — pause instead'
    : 'Good pacing!'

  return {
    wpm, words: wordCount, fillerCount, fillerDensity,
    pacingScore, rating, advice,
    fillers: matches.map((m) => m.toLowerCase()),
  }
}
```

#### C.4 — Vocabulary Diversity

```typescript
export interface VocabResult {
  uniqueWords: number
  totalWords: number
  uniqueRatio: number     // percent
  diversity: 'Rich vocabulary' | 'Average vocabulary' | 'Limited vocabulary'
  topWords: { word: string; count: number }[]
  fillerWords: string[]
}

export function vocabDiversity(text: string): VocabResult {
  const words = String(text || '').toLowerCase().match(/[a-z]+/g) || []
  const counts: Record<string, number> = {}
  for (const w of words) counts[w] = (counts[w] || 0) + 1
  const total = String(text || '').match(/\S+/g)?.length || 0
  const unique = Object.keys(counts)
  const FILLERS = new Set(['um','uh','like','basically','actually','you','know','so','right','okay','hmm','err','kind','sort','of'])
  const fillerWords = unique.filter((w) => FILLERS.has(w))
  const topWords = unique.map((w) => ({ word: w, count: counts[w] }))
    .sort((a, b) => b.count - a.count).slice(0, 5)
  const uniqueRatio = total ? Math.round(unique.length / total * 100) : 0

  return {
    uniqueWords: unique.length,
    totalWords: total,
    uniqueRatio,
    diversity: unique.length > 40 ? 'Rich vocabulary' : unique.length > 20 ? 'Average vocabulary' : 'Limited vocabulary',
    topWords,
    fillerWords,
  }
}
```

#### C.5 — Pakistani Interviewer Persona

```typescript
/** Pakistani interviewer system prompt (from Intervity SystemPrompts.ts + v7 patch). */
export function pakistaniInterviewerPrompt(role = 'Senior Software Engineer', company = 'a leading Pakistani tech company', resume = ''): string {
  return `You are a Senior Technical Interviewer at ${company} in Lahore/Karachi/Islamabad conducting a realistic mock interview for: ${role}.

Candidate Resume:
"""
${resume.slice(0, 3000)}
"""

PAKISTANI TECH CONTEXT:
- Understand: BS-CS/BCS/MIT degrees, CGPA (4.0 scale), PITB/PASHA ecosystem
- Know: IT services (Techlogix, NetSol, Systems Ltd, Arbisoft, Devsinc) vs product (Airlift, Bazaar, Tajir, Dastgyr)
- Terms: "done from" (graduated), "outstation", "CTC in PKR", NUST/LUMS/FAST/UIT colleges
- Pakistani English idioms: "revert back" (reply), "prepone", "doubts" (questions), "batch pass out" (graduating class). Do not critique these.

STRICT RULES:
1. Ask only ONE question at a time. Max 3 sentences per response.
2. No markdown, bullet points, or code blocks — response will be spoken aloud via TTS.
3. Deep-dive into specific resume claims (architecture, scalability, code).
4. If vague, probe deeper ("Could you share the specific latency metrics?").
5. Acknowledge previous response briefly before asking next question.`
}
```

#### C.6 — Coaching Strategy Dispatcher

```typescript
const COACHING_STRATEGIES: Record<string, string> = {
  behavioral: 'Use STAR method. Probe for Situation, Task, Action, Result. Ask for metrics.',
  system_design: 'Ask to clarify requirements first. Probe for scale estimation and trade-offs.',
  debugging: 'Ask how they approached the problem, what they ruled out, and how they confirmed the fix.',
  code_review: 'Ask why they made specific choices, what they would change now, and what the trade-offs were.',
  architecture: 'Ask about failure modes, scaling limits, and what they would do differently at 10× load.',
  database: 'Ask about indexing strategy, query optimization, transaction isolation, and replication.',
  security: 'Ask about specific attack vectors, mitigation approach, and what could still go wrong.',
  leadership: 'Ask about conflict resolution, how they brought a team member up to speed, and metrics they tracked.',
  default: 'Probe for depth. Ask "Why?", "What would break?", and "What would you do differently now?"',
}

/** Pick the right coaching strategy for a question's tech tags. */
export function coachStrategy(tags: string[], questionText: string): string {
  const q = questionText.toLowerCase()
  const t = tags.join(' ').toLowerCase()

  if (/tell me about|describe a time|example of|when did you/i.test(q)) return COACHING_STRATEGIES.behavioral
  if (/design a|design an|system design|architect/i.test(q)) return COACHING_STRATEGIES.system_design
  if (t.includes('sql') || t.includes('database') || t.includes('postgres') || t.includes('mysql')) return COACHING_STRATEGIES.database
  if (/debug|fix|error|exception|crash|memory leak/i.test(q)) return COACHING_STRATEGIES.debugging
  if (/security|xss|csrf|injection|auth|jwt|owasp/i.test(q)) return COACHING_STRATEGIES.security
  if (/lead|team|mentor|manage|conflict/i.test(q)) return COACHING_STRATEGIES.leadership
  if (/review|refactor|improve|clean/i.test(q)) return COACHING_STRATEGIES.code_review
  if (/architect|pattern|solid|microservice|monolith/i.test(q)) return COACHING_STRATEGIES.architecture
  return COACHING_STRATEGIES.default
}
```

---

### Phase D — Urduhack Normalization in `lang.ts` (1 hour)

**Target file:** `pwa/src/lib/lang.ts`

The full 71-character mapping from v7's patch. Add to `lang.ts`:

```typescript
/** Maps Arabic-variant characters to canonical Urdu.
 *  Source: urduhack Python library, ported in v7 Phase 1 patch. */
const URDU_CHAR_NORM: Record<string, string> = {
  // Alef variants
  '\uFE81': '\u0622', '\uFE82': '\u0622',
  '\uFE83': '\u0623',
  '\uFE8D': '\u0627', '\uFE8E': '\u0627',
  // Be / Pe / Te / Tte
  '\uFE8F': '\u0628', '\uFE90': '\u0628', '\uFE91': '\u0628', '\uFE92': '\u0628',
  '\uFB56': '\u067E', '\uFB57': '\u067E', '\uFB58': '\u067E', '\uFB59': '\u067E',
  '\uFE93': '\u062A', '\uFE94': '\u062A', '\uFE95': '\u062A', '\uFE96': '\u062A',
  '\uFB66': '\u0679', '\uFB67': '\u0679', '\uFB68': '\u0679', '\uFB69': '\u0679',
  // Se / Jeem / Che / He / Khe
  '\uFE99': '\u062B', '\uFE9A': '\u062B', '\uFE9B': '\u062B',
  '\uFE9D': '\u062C', '\uFE9E': '\u062C', '\uFE9F': '\u062C', '\uFEA0': '\u062C',
  '\uFB7A': '\u0686', '\uFB7B': '\u0686', '\uFB7C': '\u0686', '\uFB7D': '\u0686',
  '\uFEA1': '\u062D', '\uFEA2': '\u062D', '\uFEA3': '\u062D', '\uFEA4': '\u062D',
  '\uFEA5': '\u062E', '\uFEA6': '\u062E', '\uFEA7': '\u062E',
  // Dal / Dda / Dhal / Re / Rha / Ze / Zhe
  '\uFEA9': '\u062F', '\uFEAA': '\u062F',
  '\uFB88': '\u0688', '\uFB89': '\u0688',
  '\uFEAB': '\u0630', '\uFEAC': '\u0630',
  '\uFEAD': '\u0631', '\uFEAE': '\u0631',
  '\uFB8C': '\u0691', '\uFB8D': '\u0691',
  '\uFEAF': '\u0632', '\uFEB0': '\u0632',
  '\uFB8A': '\u0698',
  // Seen / Sheen / Sad / Dad / Tah / Zah / Ain / Ghain
  '\uFEB1': '\u0633', '\uFEB2': '\u0633', '\uFEB3': '\u0633', '\uFEB4': '\u0633',
  '\uFEB5': '\u0634', '\uFEB6': '\u0634', '\uFEB7': '\u0634', '\uFEB8': '\u0634',
  '\uFEB9': '\u0635', '\uFEBA': '\u0635', '\uFEBB': '\u0635', '\uFEBC': '\u0635',
  '\uFEBD': '\u0636', '\uFEBE': '\u0636', '\uFEBF': '\u0636', '\uFEC0': '\u0636',
  '\uFEC3': '\u0637', '\uFEC4': '\u0637',
  '\uFEC5': '\u0638', '\uFEC6': '\u0638', '\uFEC7': '\u0638',
  '\uFEC9': '\u0639', '\uFECA': '\u0639', '\uFECB': '\u0639', '\uFECC': '\u0639',
  '\uFECD': '\u063A', '\uFECE': '\u063A', '\uFECF': '\u063A',
  // Fe / Qaf / Kaf (ke) / Gaf / Lam / Meem / Noon / Che
  '\uFED1': '\u0641', '\uFED2': '\u0641', '\uFED3': '\u0641', '\uFED4': '\u0641',
  '\uFED5': '\u0642', '\uFED6': '\u0642', '\uFED7': '\u0642', '\uFED8': '\u0642',
  '\uFB8E': '\u06A9', '\uFB8F': '\u06A9', '\uFB90': '\u06A9', '\uFB91': '\u06A9',
  '\uFB4B': '\u06A9', '\u0643': '\u06A9', // Arabic kaf → Urdu ke
  '\uFB92': '\u06AF', '\uFB93': '\u06AF', '\uFB94': '\u06AF', '\uFB95': '\u06AF',
  '\uFEDD': '\u0644', '\uFEDE': '\u0644', '\uFEDF': '\u0644', '\uFEE0': '\u0644',
  '\uFEE1': '\u0645', '\uFEE2': '\u0645', '\uFEE3': '\u0645', '\uFEE4': '\u0645',
  '\uFEE5': '\u0646', '\uFEE6': '\u0646', '\uFEE7': '\u0046', '\uFEE8': '\u0046',
  '\uFB9E': '\u06BA', '\uFB9F': '\u06BA',
  // Noon ghunna / Waw / Waw hamza / Do chashmi he / Goal he / Ta marbuta / Hamza
  '\uFEED': '\u0648', '\uFEEE': '\u0648', '\uFEEF': '\u0648',
  '\uFE85': '\u0624',
  '\uFEEA': '\u06BE', '\uFBA6': '\u06BE', '\uFBA7': '\u06BE', '\uFBA8': '\u06BE',
  '\uFBA9': '\u06BE', '\uFBAA': '\u06BE',
  '\uFEE9': '\u06C1', '\uFEEC': '\u06C1', '\u0647': '\u06C1', // Arabic heh → goal he
  '\u0629': '\u06C3', // ta marbuta → te with goal
  '\uFE80': '\u0621',
  // Yeh / Bari yeh / Digits / Lam-alef / Tatweel
  '\uFBFC': '\u06CC', '\u0649': '\u06CC', '\uFBFD': '\u06CC', '\uFEF0': '\u06CC',
  '\uFEF1': '\u06CC', '\uFEF2': '\u06CC', '\uFBFE': '\u06CC', '\uFBFF': '\u06CC',
  '\u064A': '\u06CC', // Arabic yeh → Urdu yeh
  '\uFE89': '\u0626', '\uFE8B': '\u0626', '\uFE8C': '\u0626',
  '\uFBEE': '\u06D2', '\uFBEF': '\u06D2', '\uFBF0': '\u06D2', '\uFBF1': '\u06D2',
  '\uFBF2': '\u06D3', '\uFBF3': '\u06D3', '\uFBF4': '\u06D3', '\uFBF5': '\u06D3',
  '\u0660': '\u06F0', '\u0661': '\u06F1', '\u0662': '\u06F2', '\u0663': '\u06F3',
  '\u0664': '\u06F4', '\u0665': '\u06F5', '\u0666': '\u06F6', '\u0667': '\u06F7',
  '\u0668': '\u06F8', '\u0669': '\u06F9',
  '\uFEFB': '\u0644\u0627', '\uFEFC': '\u0644\u0627', // lam-alef ligatures
  '\u0640': '',  // tatweel/kashida — remove it
}

/** Normalize Urdu text: NFC + Arabic-variant → canonical Urdu + diacritics + zero-width. */
export function normalizeUrduText(text: string): string {
  if (!text) return ''
  // NFC + zero-width removal
  let out = text.normalize('NFC').replace(/[\u200C\u200D\u200B\uFEFF]/g, '')
  // Diacritics (tashkeel: harakat, shadda, etc.)
  out = out.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
  // Arabic-variant character normalization (pair before single to catch ligatures)
  let result = ''
  for (let i = 0; i < out.length; i++) {
    const pair = out[i] + (out[i + 1] ?? '')
    if (URDU_CHAR_NORM[pair] !== undefined) {
      result += URDU_CHAR_NORM[pair]
      i++ // skip the second char of the pair
      continue
    }
    result += URDU_CHAR_NORM[out[i]] !== undefined ? URDU_CHAR_NORM[out[i]] : out[i]
  }
  return result.replace(/\s+/g, ' ').trim()
}
```

**Wire it into `translate.ts`:**
```typescript
// In getOrTranslate() and everywhere Urdu text is looked up:
import { normalizeUrduText } from './lang'

// In buildPrompt(), normalizeUrduText the input
// In getTranslation(), normalizeUrduText the cache key's Urdu components
// In ruNorm() calls, wrap with normalizeUrduText first for Urdu-script text
```

---

### Phase E — Company Style Profiles in Settings (1 hour)

**Target file:** `pwa/src/lib/settings.ts`

```typescript
export interface CompanyProfile {
  name: string
  focus: string
  time: string
  style: string
  tips: string
}

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  google:    { name: 'Google', focus: 'System design + coding + trade-off reasoning + Googliness', time: '45+45 min', style: 'collaborative', tips: 'Clarify requirements first. Discuss trade-offs. Show how you handle ambiguity.' },
  amazon:    { name: 'Amazon', focus: 'Leadership Principles + Dive Deep + measurable impact', time: '60 min', style: 'LP-first', tips: 'Structure every answer around a Leadership Principle. Use "I" not "We". Quantify everything.' },
  meta:      { name: 'Meta', focus: 'Coding speed + scale + data-driven decisions', time: '45 min', style: 'fast-paced', tips: 'Move fast. Show impact at scale. Be direct about trade-offs.' },
  microsoft: { name: 'Microsoft', focus: 'Problem-solving + collaboration + growth mindset', time: '45 min', style: 'conversational', tips: 'Show how you learn from failure. Demonstrate collaboration.' },
  bytedance: { name: 'ByteDance', focus: 'Algorithms + business impact + data scale', time: '45 min', style: 'intensive', tips: 'Practice LeetCode Medium+. Billion-user scale thinking.' },
  pitb:      { name: 'PITB / Pakistan Railways', focus: 'Laravel/PHP + delivery + govt digital systems + practical coding', time: '30 min', style: 'practical', tips: 'Show working code. Talk about government/digital transformation projects.' },
  nadra:     { name: 'NADRA', focus: 'Database systems + security + national-scale + biometrics', time: '30 min', style: 'technical', tips: 'Emphasize data security, national-scale architecture, database optimization.' },
  arbisoft:  { name: 'Arbisoft', focus: 'Full-stack + agile + client communication', time: '45 min', style: 'cultural-fit', tips: 'Show cultural fit. Be ready for pair programming.' },
  netsol:    { name: 'NetSol', focus: 'Enterprise software + ERP + team leadership', time: '45 min', style: 'formal', tips: 'Show enterprise experience. Discuss financial domain knowledge.' },
  systems:   { name: 'Systems Limited', focus: 'SAP/ERP + large team + enterprise delivery', time: '30 min', style: 'experienced', tips: 'Show enterprise delivery experience. Large-team management.' },
  techlogix: { name: 'Techlogix', focus: 'Architecture + client-facing + digital transformation', time: '45 min', style: 'consultative', tips: 'Show consulting mindset. Architecture decisions with client context.' },
  devsinc:   { name: 'Devsinc', focus: 'Full-stack + quick delivery + startup agility', time: '30 min', style: 'fast-paced', tips: 'Show speed and adaptability.' },
  tencent:   { name: 'Tencent', focus: 'Gaming + social + performance optimization', time: '45 min', style: 'technical-deep', tips: 'Go deep on performance. High-concurrency systems.' },
}

/** Match a company name substring to a profile. */
export function matchCompanyProfile(name: string): CompanyProfile | null {
  const k = name.toLowerCase()
  for (const [id, p] of Object.entries(COMPANY_PROFILES)) {
    if (k.includes(id) || k.includes(p.name.toLowerCase())) return p
  }
  return null
}
```

**Add `companyProfile` to `UserSettings`:**
```typescript
// In types.ts UserSettings:
companyProfile?: string  // key from COMPANY_PROFILES
```

---

### Phase F — Mock Interview Enhancements (3 hours)

**Target file:** `pwa/src/features/Mock.tsx`

#### F.1 — Add Pakistani Persona Option

```typescript
// Add to PERSONAS array in Mock.tsx:
{ id: 'pakistani', label: 'Pakistani Tech', note: 'Senior interviewer at PITB/Arbisoft style' },

// In gradeAnswer() call, pass persona context:
// When persona === 'pakistani', inject pakistaniInterviewerPrompt() as system context
```

#### F.2 — Show MistakeClassifier + STAR in per-answer feedback

```typescript
// After gradeAnswer() returns, also compute:
import { classifyMistake, starEval, prosodyAnalyze, vocabDiversity } from '../lib/features'

const mistake = classifyMistake(answer)
const star = starEval(answer)    // only show if behavioral question
const prosody = prosodyAnalyze(answer, elapsed)
const vocab = vocabDiversity(answer)
```

Display these alongside the AI feedback:
```typescript
// In the per-answer feedback card:
{mistake && (
  <div className="card small" style={{ borderColor: mistake.color }}>
    <span>{mistake.icon} {mistake.cat}</span>
    <p className="small muted">{mistake.critique}</p>
    <p className="small">{mistake.golden}</p>
  </div>
)}
{star.isBehavioral && (
  <div className="card small">
    <strong>STAR Score: {star.total}/100</strong>
    {star.feedback.map((f, i) => <p key={i} className="small muted">{f}</p>)}
  </div>
)}
<div className="spread small muted">
  <span>{prosody.wpm} WPM · {prosody.pacingScore}/100 pacing</span>
  <span>{vocab.diversity}</span>
</div>
```

#### F.3 — Session Markdown Export

```typescript
// Add exportMockSession() to Mock.tsx Result component:
function exportMockSession(turns: { q: string; me: string; score?: number }[], scorecard: Scorecard) {
  const lines = [
    `# Mock Interview — ${new Date().toLocaleDateString()}`,
    `**Score:** ${scorecard.overall}/10 | **Verdict:** ${scorecard.verdict}`,
    '', '---', ''
  ]
  turns.forEach((t, i) => {
    lines.push(`### Q${i + 1}`)
    lines.push(`**Question:** ${t.q}`)
    lines.push(`**Your answer:** ${t.me}`)
    if (t.score !== undefined) lines.push(`**Score:** ${t.score}/10`)
    lines.push('')
  })
  lines.push('## Scorecard')
  lines.push(`- Technical: ${scorecard.technical}/10`)
  lines.push(`- Communication: ${scorecard.communication}/10`)
  lines.push(`- Confidence: ${scorecard.confidence}/10`)
  lines.push(`- ${scorecard.tip}`)
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mock-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Add export button to Result component:
<button className="btn" onClick={() => exportMockSession(turns, scorecard)}>
  📄 Export as Markdown
</button>
```

---

### Phase G — QCard Reference Answers (2 hours)

**Target file:** `pwa/src/components/QCard.tsx`

Add a "💡 Reference Answer" button that generates and caches a model answer:

```typescript
// In QCard.tsx — add state:
const [refLoading, setRefLoading] = useState(false)
const [refText, setRefText] = useState('')

// Add getRefAnswer to features.ts:
export async function getRefAnswer(q: Question, mode: 'single' | 'compare' = 'single'): Promise<string> {
  const cacheKey = `ref:${q.code}:${mode}`
  // Check Dexie explains table first
  const cached = await db.explains.get(cacheKey)
  if (cached) return cached.markdown

  const prompt = mode === 'compare'
    ? `Give a HIGH-SCORE model answer then a LOW-SCORE answer for this interview question.
Label them "✅ Strong Answer:" and "❌ Weak Answer:". Explain what makes each good or bad.
Question: ${q.q}`
    : `You are a senior interviewer. Give a concise, well-structured model answer:
Question: ${q.q}
Context: ${stripHtml(q.a).slice(0, 500)}
Format: 3-5 bullet points. Plain text. Direct. First person.`

  const text = await aiText(prompt, { task: 'quick' })
  await db.explains.put({
    id: cacheKey, code: q.code, lang: 'en',
    focus: 'concept', style: 'interview',
    markdown: text, updatedAt: Date.now()
  })
  return text
}

// In QCard render, add button to action row:
<button className="btn sm" disabled={refLoading || !aiReady()} onClick={async () => {
  setRefLoading(true)
  try {
    const text = await getRefAnswer(q)
    setRefText(text)
  } catch (e) {
    toast((e as Error).message)
  } finally {
    setRefLoading(false)
  }
}} title={aiWhy()}>
  {refLoading ? '…' : '💡'}
</button>
{refText && (
  <Sheet title="Reference Answer" onClose={() => setRefText('')}>
    <Md text={refText} lang="en" />
    {ttsAvailable() && (
      <button className="btn sm" onClick={() => void speakSegments([{ lang: 'en', text: refText }], settings.au)}>
        🔊 Hear it
      </button>
    )}
  </Sheet>
)}
```

---

### Phase H — Speaking Coach Enhanced Analysis (2 hours)

**Target file:** `pwa/src/features/Speak.tsx` → AnswerTab component

The PWA already calls `speakingFeedback()` from `features.ts`. Enhance to also
show prosody + STAR + MistakeClassifier:

```typescript
// In AnswerTab, after speakingFeedback() returns, also compute and show:
const prosody = prosodyAnalyze(transcript, elapsed)
const vocab = vocabDiversity(transcript)
const mistake = classifyMistake(transcript)
const star = starEval(transcript)

// Display after the main feedback:
<div className="stats">
  <div className="stat"><b>{prosody.wpm}</b><span>WPM</span></div>
  <div className="stat"><b>{prosody.pacingScore}</b><span>pacing</span></div>
  <div className="stat"><b>{vocab.uniqueRatio}%</b><span>unique words</span></div>
</div>
{mistake && (
  <div className="card small" style={{ borderColor: mistake.color }}>
    <b>{mistake.icon} {mistake.cat}</b>
    <p className="tiny muted">{mistake.critique}</p>
  </div>
)}
```

---

### Phase I — Anki Export (1 hour)

**Target file:** `pwa/src/lib/backup.ts`

```typescript
/** Export a question to Anki via AnkiConnect (localhost:6006).
 *  Gracefully fails when Anki is not running (cloud/mobile — expected). */
export async function ankiAdd(front: string, back: string, deck = 'Interview Box'): Promise<void> {
  try {
    const res = await fetch('http://localhost:6006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addNote', version: 6,
        params: {
          note: {
            deckName: deck, modelName: 'Basic',
            fields: { Front: front, Back: back },
            options: { allowDuplicate: false },
          },
        },
      }),
    })
    if (!res.ok) throw new Error('Anki returned ' + res.status)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
  } catch {
    throw new Error('Anki not running. Start Anki + AnkiConnect on this device.')
  }
}
```

Add a "🃏 Anki" button to QCard and Mock result — shows only when `location.hostname === 'localhost'` or `127.0.0.1` (desktop mode). Gracefully hidden on Vercel/mobile.

---

### Phase J — Vercel Config + Deploy (30 min)

Create `vercel.json` at the **root** of `interview-box/`:

```json
{
  "version": 2,
  "buildCommand": "cd pwa && npm install --prefer-offline && npm run build",
  "outputDirectory": "pwa/dist",
  "routes": [
    { "src": "/v7", "dest": "/interview-box.html" },
    { "src": "/ibx-transliteration.js", "dest": "/ibx-transliteration.js" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/data/(.*)", "dest": "/data/$1" },
    { "src": "/icons/(.*)", "dest": "/icons/$1" },
    { "src": "/sw.js", "headers": { "Service-Worker-Allowed": "/", "Cache-Control": "no-cache" }, "dest": "/sw.js" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## Summary — All Changes by File

| File | Changes |
|------|---------|
| `pwa/src/lib/ai.ts` | Add Mistral, xAI, Fireworks to ProviderId + PROVIDERS |
| `pwa/src/lib/providers.ts` | No changes needed — openAiStyle handles the new providers |
| `pwa/src/lib/features.ts` | Add: classifyMistake, starEval, prosodyAnalyze, vocabDiversity, pakistaniInterviewerPrompt, coachStrategy, getRefAnswer |
| `pwa/src/lib/lang.ts` | Add: URDU_CHAR_NORM map + normalizeUrduText() function |
| `pwa/src/lib/settings.ts` | Add: COMPANY_PROFILES, matchCompanyProfile, companyProfile field |
| `pwa/src/lib/backup.ts` | Add: ankiAdd() |
| `pwa/src/lib/translate.ts` | Wire normalizeUrduText() into all Urdu text paths |
| `pwa/src/features/Mock.tsx` | Add: Pakistani persona, MistakeClassifier display, STAR display, MD export |
| `pwa/src/features/Speak.tsx` | Add: prosody, vocab diversity, MistakeClassifier in AnswerTab |
| `pwa/src/components/QCard.tsx` | Add: Reference Answer button + Sheet |
| `pwa/src/features/Progress.tsx` | Add: company profile selector (13 companies) |
| `pwa/scripts/extract-v7.mjs` | Fix: include all 2,474 questions, merge banks-clean.json |
| `vercel.json` | New: Vercel deployment config (root of interview-box/) |

---

## Execution Order (Least Risk First)

1. **Phase A** — Re-run extract to get all 2,474 questions (no code changes)
2. **Phase D** — Add urduhack normalization to `lang.ts` (pure addition, no breakage)
3. **Phase B** — Add 3 providers to `ai.ts` (pure addition, no breakage)
4. **Phase E** — Add company profiles to `settings.ts` (pure addition)
5. **Phase C** — Add all 6 intelligence functions to `features.ts` (pure additions)
6. **Phase G** — Add reference answers to `QCard.tsx` (new button, no breakage)
7. **Phase F** — Enhance Mock.tsx with STAR/MistakeClassifier/MD export (additions)
8. **Phase H** — Enhance Speak.tsx AnswerTab with prosody (additions)
9. **Phase I** — Add ankiAdd() to `backup.ts` (new function, graceful failure)
10. **Phase J** — Write `vercel.json` and deploy

After each phase: `npm run build` must pass with 0 errors before moving on.
Final verification: `node e2e/smoke.mjs && node e2e/mobile.mjs && node e2e/offline.mjs`

---

## What This Achieves

| Goal | Before | After |
|------|--------|-------|
| Question count | 1,950 (PWA) | 2,474 (all v7 categories) |
| AI providers | 9 (PWA) | 12 (+ Mistral, xAI, Fireworks) |
| AI features working on Vercel | ❌ | ✅ (direct API keys, no popup) |
| Installable on Android | ❌ | ✅ (manifest + service worker) |
| Installable on iOS | ❌ | ✅ (Add to Home Screen) |
| Works offline | ❌ | ✅ (Workbox precaches everything) |
| MistakeClassifier | v7 only | ✅ PWA |
| STAR Evaluator | v7 only | ✅ PWA |
| Pakistani persona | v7 only | ✅ PWA |
| Company profiles (13) | v7 only | ✅ PWA |
| Reference answers | v7 only | ✅ PWA |
| Session MD export | v7 only | ✅ PWA |
| Urdu char normalization | v7 only | ✅ PWA |
| Prosody analyzer | v7 (basic) | ✅ PWA (full, South Asian fillers) |
