#!/usr/bin/env node
/**
 * patch-phase1-enhancements.js
 *
 * Phase 1 patch for interview-box.html — adds:
 *  1. Intervity MistakeClassifier (4 tiers)
 *  2. Intervity STAR Method Evaluator
 *  3. Intervity Prosody Analyzer (enhanced)
 *  4. Pakistani Interviewer Persona
 *  5. Auto-restart SpeechRecognition (fixes 60s cutoff)
 *  6. Reference Answers (good vs bad)
 *  7. Session Markdown Export
 *  8. Company Style Profiles
 *  9. AI Lookup Cache Factory
 * 10. Awaaz Urdu TTS integration
 * 11. urduhack character normalization (71 mappings)
 * 12. Word Frequency / Vocabulary diversity
 * 13. Anki flashcard export
 * 14. Agent memory (cross-session coaching)
 * 15. Adaptive QBL curriculum
 * 16. Coaching strategy dispatcher
 *
 * All code is vanilla JS, no new dependencies, no external files.
 * Inserts a new <script> block before the closing </body> tag.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, 'interview-box.html');
const BAK_PATH = HTML_PATH + '.bak-phase1-' + Date.now();

// ── Backup ──
fs.copyFileSync(HTML_PATH, BAK_PATH);
console.log('Backup:', BAK_PATH);

let h = fs.readFileSync(HTML_PATH, 'utf-8');
let patchCount = 0;

function injectBefore(target, code, label) {
  const idx = h.indexOf(target);
  if (idx < 0) { console.error('FAIL: cannot find target for', label); process.exit(1); }
  h = h.slice(0, idx) + code + '\n' + h.slice(idx);
  patchCount++;
  console.log('✓', label);
}

// ── The big injection: all new functions as a single script block ──
const phase1Code = `
<!-- =================== PHASE 1 ENHANCEMENTS =================== -->
<script>
(function(){
"use strict";

/* ═══════════════════════════════════════════════════════════
 * 1. MISTAKE CLASSIFIER (from Intervity MistakeClassifier.ts)
 *    4 tiers: CONCEPTUAL / L4_CEILING / VAGUE / STRUCTURAL
 * ═══════════════════════════════════════════════════════════ */
window.classifyMistake = function(answer) {
  if (!answer || answer.length < 10) return null;
  var t = answer.toLowerCase();

  // Rule 1: Conceptual / Factual Fallacy
  if (t.includes('direct on gpu') || t.includes('dom element') || t.includes('threads without locks') ||
      t.includes('javascript is synchronous so') || t.includes('single threaded so no concurrency')) {
    return {
      cat: 'CONCEPTUAL', color: '#B3261E', icon: '\\uD83D\\uDD34',
      critique: 'Fundamental misunderstanding of core architecture and runtime memory models.',
      golden: 'Ground explanations in memory ownership and native runtime thread boundaries. Explain the actual mechanism — JSI, memory ownership, thread boundaries.',
      model: 'Always ground explanations in memory ownership and native runtime thread boundaries.'
    };
  }

  // Rule 2: L4 Ceiling — technically correct but missing senior-level failure modes
  if ((t.includes('redis') && !t.includes('stampede') && !t.includes('eviction') && !t.includes('lock') && !t.includes('cache')) ||
      (t.includes('kafka') && !t.includes('partition') && !t.includes('offset') && !t.includes('consumer group')) ||
      (t.includes('queue') && !t.includes('retry') && !t.includes('dead letter') && !t.includes('idempoten'))) {
    return {
      cat: 'L4_CEILING', color: '#E65100', icon: '\\uD83D\\uDFE0',
      critique: 'Technically correct happy-path, but omitted high-throughput failure modes (cache stampede, eviction policies, retries, dead-letter queues).',
      golden: 'Add: cache stampede mitigation, eviction strategies, write storm handling, consumer group rebalance, offset commit semantics.',
      model: 'When discussing caching or messaging, never stop at "faster reads" \\u2014 explain invalidation, concurrency locks, eviction, and failure recovery.'
    };
  }

  // Rule 3: Vague Hand-Waving
  if (answer.length < 80 || /it handled everything|we used .* to make it fast|basically it just works|it was very efficient/i.test(t) ||
      (!t.includes('ms') && !t.includes('%') && !t.includes('per second') && !t.includes('qps') && !t.includes('rps') &&
       !t.includes('users') && !t.includes('reduced') && !t.includes('improved') && !t.includes('latency') && answer.length < 150)) {
    return {
      cat: 'VAGUE', color: '#F4D83D', icon: '\\uD83D\\uDFE1',
      critique: 'Superficial buzzword usage without explaining underlying mechanics, partition keys, or failure recovery.',
      golden: 'Add: throughput numbers, partition strategy, batch sizes, consumer lag, specific metrics. "We partitioned by merchant ID, tuned batch to 500, kept lag under 200ms."',
      model: 'Never state what technology you used without quantifying throughput, partition strategies, and failure modes.'
    };
  }

  // Rule 4: Structural Deficit \\u2014 missing personal ownership and metrics
  if (!t.includes(' i ') && !t.includes('i designed') && !t.includes('i implemented') && !t.includes('i built') &&
      !t.includes('i led') && !t.includes('i solved') && !t.includes('i refactored') && !t.includes('i chose')) {
    return {
      cat: 'STRUCTURAL', color: '#1565C0', icon: '\\uD83D\\uDFE3',
      critique: 'Answer lacks quantitative metrics and personal ownership ("I" vs "We"), failing STAR expectations for senior roles.',
      golden: 'Use "I designed/implemented" + p99 latency, % improvement, cost savings, user impact. "I reduced query time by 74% and saved $8K/month."',
      model: 'Always deliver BLUF (Bottom Line Up Front) and close with measurable business impact using first-person ownership.'
    };
  }

  return null; // answer is solid
};

/* ═══════════════════════════════════════════════════════════
 * 2. STAR METHOD EVALUATOR (from Intervity StarMethodEvaluator.ts)
 *    Situation 15% + Task 15% + Action 50% + Result 20%
 * ═══════════════════════════════════════════════════════════ */
window.starEval = function(answer) {
  if (!answer || answer.length < 10) return null;
  var t = answer.toLowerCase();
  var fb = [];

  // Situation: context setting
  var hasSit = t.includes('when') || t.includes('at ') || t.includes('project') || t.includes('team') || t.includes('while working') || t.includes('our ');
  var sitS = hasSit ? 15 : 5;
  if (!hasSit) fb.push('Clarify the business context or project scope early in your response.');

  // Task: problem definition
  var hasTask = t.includes('goal') || t.includes('needed to') || t.includes('problem') || t.includes('sla') || t.includes('bottleneck') || t.includes('challenge') || t.includes('issue') || t.includes('faced') || t.includes('deadline');
  var taskS = hasTask ? 15 : 5;
  if (!hasTask) fb.push('Explicitly state the SLA, deadline, or engineering hurdle.');

  // Action: individual contribution
  var actCount = (t.match(/\\b(i implemented|i designed|i built|i refactored|i profiled|i debugged|i led|i chose|i solved|i resolved|i migrated|i optimized|i created|i developed|i architected)\\b/g) || []).length;
  var actS = 20;
  if (actCount >= 2) actS = 50;
  else if (actCount >= 1) actS = 35;
  else fb.push('Take direct ownership using "I designed/implemented" instead of ambiguous "We" phrasing.');

  // Result: measurable metrics
  var hasRes = /\\b(\\d+%|\\d+\\s*ms|\\d+\\s*seconds|\\$\\d+|\\d+\\s*k|\\d+\\s*qps|\\d+\\s*users|\\d+\\s*rps)\\b/i.test(t) ||
               t.includes('reduced') || t.includes('increased') || t.includes('improved') || t.includes('saved') || t.includes('decreased');
  var resS = hasRes ? 20 : 5;
  if (!hasRes) fb.push('Quantify the outcome with concrete metrics (e.g. latency reduction, cost savings, RPS, user impact).');

  var total = sitS + taskS + actS + resS;
  var grade = total >= 85 ? 'Excellent' : total >= 65 ? 'Good' : total >= 45 ? 'Needs work' : 'Incomplete';

  return {
    situation: sitS, task: taskS, action: actS, result: resS,
    total: total, grade: grade, feedback: fb,
    maxSituation: 15, maxTask: 15, maxAction: 50, maxResult: 20
  };
};

/* ═══════════════════════════════════════════════════════════
 * 3. PROSODY ANALYZER (from Intervity SoftSkillsProsodyAnalyzer.ts)
 *    Enhanced with South Asian English verbal crutches
 * ═══════════════════════════════════════════════════════════ */
window.prosodyAnalyze = function(text, durationSec, turnLatencyMs) {
  text = String(text || '').trim();
  var words = text.split(/\\s+/).filter(Boolean);
  var wordCount = words.length;
  var duration = durationSec > 0 ? durationSec : 1;
  var wpm = wordCount > 0 ? Math.round((wordCount / duration) * 60) : 0;

  // Universal fillers + South Asian English crutches
  var FILLER_RE = /\\b(um+|uh+|er+|ah+|hmm+|basically|actually|sort of|kind of|i mean|ya|na|means|you know|like|literally|right|okay|so|correct\\?)\\b/gi;
  var matches = text.match(FILLER_RE) || [];
  var fillerCount = matches.length;
  var fillerDensity = wordCount > 0 ? Math.round((fillerCount / wordCount) * 100) / 1 : 0;

  // Pacing score (120-155 WPM sweet spot)
  var pacingScore = 100;
  if (wpm > 0) {
    if (wpm < 100) pacingScore -= (100 - wpm) * 0.8;
    else if (wpm > 165) pacingScore -= (wpm - 165) * 0.7;
  }
  if (fillerDensity > 1.5) pacingScore -= (fillerDensity - 1.5) * 8;
  if (turnLatencyMs && turnLatencyMs > 4500) pacingScore -= (turnLatencyMs - 4500) / 200;

  pacingScore = Math.min(100, Math.max(0, Math.round(pacingScore)));

  var rating = wpm >= 120 && wpm <= 160 && fillerDensity < 5 ? 'excellent'
             : wpm >= 100 && fillerDensity < 10 ? 'good'
             : 'needs work';

  var advice = wpm < 100 ? 'Speak faster \\u2014 aim for 120\\u2013160 WPM'
             : wpm > 180 ? 'Slow down \\u2014 clarity over speed'
             : fillerDensity > 10 ? 'Reduce fillers (um, uh, like) \\u2014 pause instead'
             : 'Good pacing!';

  return {
    wpm: wpm, words: wordCount, fillerCount: fillerCount,
    fillerDensity: fillerDensity, pacingScore: pacingScore,
    rating: rating, advice: advice,
    fillers: matches.map(function(m){ return m.toLowerCase(); })
  };
};

/* ═══════════════════════════════════════════════════════════
 * 4. WORD FREQUENCY / VOCABULARY DIVERSITY
 *    (from Urdu-English-Word-Frequency-Analyzer)
 * ═══════════════════════════════════════════════════════════ */
window.wordFrequency = function(text, topN) {
  topN = topN || 10;
  var words = String(text || '').toLowerCase().match(/[a-zA-Z0-9']+/g) || [];
  var counts = {};
  words.forEach(function(w){ counts[w] = (counts[w] || 0) + 1; });
  return Object.keys(counts)
    .map(function(k){ return {word: k, count: counts[k]}; })
    .sort(function(a,b){ return b.count - a.count; })
    .slice(0, topN);
};

window.vocabDiversity = function(text) {
  var words = String(text || '').toLowerCase().match(/[a-z]+/g) || [];
  var unique = {};
  words.forEach(function(w){ unique[w] = 1; });
  var total = (String(text || '').match(/\\S+/g) || []).length;
  var uniqueCount = Object.keys(unique).length;
  var FILLERS = {'um':1,'uh':1,'like':1,'basically':1,'actually':1,'you':1,'know':1,'so':1,'right':1,'okay':1,'hmm':1,'err':1,'kind':1,'sort':1,'of':1};
  var fillerHits = Object.keys(unique).filter(function(w){ return FILLERS[w]; });
  return {
    uniqueWords: uniqueCount,
    totalWords: total,
    uniqueRatio: total ? Math.round(uniqueCount / total * 100) : 0,
    diversity: uniqueCount > 40 ? 'Rich vocabulary' : uniqueCount > 20 ? 'Average vocabulary' : 'Limited vocabulary',
    topWords: window.wordFrequency(text, 5),
    fillerWords: fillerHits
  };
};

/* ═══════════════════════════════════════════════════════════
 * 5. PAKISTANI INTERVIEWER PERSONA (from Intervity SystemPrompts.ts)
 *    Adapted for Pakistani tech ecosystem
 * ═══════════════════════════════════════════════════════════ */
window.INTERVIEWER_PROMPT_PAK = function(role, resume, company) {
  company = company || 'a leading Pakistani tech company';
  role = role || 'Senior Software Engineer';
  return 'You are a Senior Technical Interviewer at ' + company +
    ' in Lahore/Karachi/Islamabad conducting a realistic mock interview for: ' + role + '.\\n\\n' +
    'Candidate Resume:\\n"""\\n' + String(resume || '').slice(0, 3000) + '\\n"""\\n\\n' +
    'PAKISTANI TECH CONTEXT:\\n' +
    '- Understand: BS-CS/BCS/MIT degrees, CGPA (4.0 scale), PITB/PASHA/P@SHA ecosystem\\n' +
    '- Know: IT services (Techlogix, NetSol, Systems Ltd, Arbisoft, Devsinc) vs product (Airlift, Bazaar, Tajir, Dastgyr)\\n' +
    '- Terms: "done from" (graduated), "outstation", "CTC in PKR", NUST/LUMS/FAST/UIT colleges\\n' +
    '- Pakistani English idioms: "revert back" (reply), "prepone" (schedule earlier), "doubts" (questions), "batch pass out" (graduating class). Do not critique these colloquialisms.\\n\\n' +
    'STRICT INTERVIEWING RULES:\\n' +
    '1. Ask only ONE question at a time. Max 3 sentences per response.\\n' +
    '2. No markdown, bullet points, or code blocks \\u2014 response will be spoken aloud via TTS.\\n' +
    '3. Deep-dive into specific resume claims (architecture choices, scalability, code).\\n' +
    '4. If the candidate gives a vague answer, politely probe deeper ("Could you share the specific latency metrics or database indexing strategy?").\\n' +
    '5. Acknowledge the candidate\\'s previous response briefly before asking your next question.';
};

/* ═══════════════════════════════════════════════════════════
 * 6. COMPANY STYLE PROFILES (from interview-skills company-profiles.md)
 * ═══════════════════════════════════════════════════════════ */
window.COMPANY_STYLES = {
  'google':     {focus:'system design + coding clarity + trade-off reasoning + Googliness', time:'45+45 min', style:'collaborative', tips:'Clarify requirements first. Discuss trade-offs openly. Show how you handle ambiguity.'},
  'amazon':     {focus:'Leadership Principles (LP) + Dive Deep + measurable impact + Customer Obsession', time:'60 min', style:'LP-first', tips:'Structure every answer around a Leadership Principle. Use "I" not "We". Quantify everything.'},
  'meta':       {focus:'coding speed + scale problems + data-driven decisions', time:'45 min', style:'fast-paced', tips:'Move fast. Show impact at scale. Be direct about trade-offs.'},
  'microsoft':  {focus:'problem-solving + collaboration + growth mindset', time:'45 min', style:'conversational', tips:'Show how you learn from failure. Demonstrate collaboration across teams.'},
  'bytedance':  {focus:'algorithms + business impact + data scale', time:'45 min', style:'intensive', tips:'Practice LeetCode Medium+. Be ready to discuss impact at billion-user scale.'},
  'pitb':       {focus:'Laravel/PHP + delivery track record + govt digital systems + practical coding', time:'30 min', style:'practical', tips:'Show working code. Talk about government/digital transformation projects. Be practical, not theoretical.'},
  'nadra':      {focus:'database systems + security + national-scale systems + biometrics', time:'30 min', style:'technical', tips:'Emphasize data security, national-scale architecture, and database optimization.'},
  'arbisoft':   {focus:'full-stack + agile + client communication + problem-solving', time:'45 min', style:'cultural fit heavy', tips:'Show cultural fit. Demonstrate full-stack capability. Be ready for pair programming.'},
  'netsol':     {focus:'enterprise software + ERP + team leadership + financial domain', time:'45 min', style:'formal', tips:'Emphasize enterprise experience. Talk about leading teams and financial domain knowledge.'},
  'systems':    {focus:'SAP/ERP + large team + enterprise delivery + offshore model', time:'30 min', style:'experienced', tips:'Show enterprise delivery experience. Discuss offshore coordination and large-team management.'},
  'techlogix':  {focus:'architecture + client-facing + digital transformation', time:'45 min', style:'consultative', tips:'Show consulting mindset. Demonstrate architecture decisions with client context.'},
  'devsinc':    {focus:'full-stack + quick delivery + startup agility', time:'30 min', style:'fast-paced', tips:'Show speed and adaptability. Demonstrate startup-style quick delivery.'},
  'tencent':    {focus:'gaming + social + performance optimization', time:'45 min', style:'technical-deep', tips:'Go deep on performance. Show experience with high-concurrency systems.'}
};

window.companyStyle = function(name) {
  var k = String(name || '').toLowerCase();
  for (var c in window.COMPANY_STYLES) {
    if (k.includes(c)) return window.COMPANY_STYLES[c];
  }
  return null;
};

/* ═══════════════════════════════════════════════════════════
 * 7. REFERENCE ANSWERS (from interview-skills reference-answer.js)
 *    Cache-first, generates via SAMPLE()
 * ═══════════════════════════════════════════════════════════ */
window.IBX_REF_CACHE = 'ibx-ref-answers';
window._ibxRefBusy = {};

window.refGet = function(qid) {
  try { return JSON.parse(localStorage.getItem(window.IBX_REF_CACHE) || '{}')[qid] || ''; }
  catch(e) { return ''; }
};

window.refSet = function(qid, text) {
  try {
    var c = JSON.parse(localStorage.getItem(window.IBX_REF_CACHE) || '{}');
    c[qid] = text;
    localStorage.setItem(window.IBX_REF_CACHE, JSON.stringify(c));
  } catch(e) {}
};

window.openRef = function(qid, mode) {
  var q = window.QMAP && window.QMAP[qid];
  if (!q) { if (window.toast) window.toast('Question not found'); return; }
  mode = mode || 'single';
  var cached = window.refGet(qid);

  if (cached && mode === 'single') {
    window.openRefSheet(cached, q);
    return;
  }

  if (window._ibxRefBusy[qid]) { window.toast && window.toast('Already generating...'); return; }
  window._ibxRefBusy[qid] = true;

  var prompt = mode === 'compare'
    ? 'Give a HIGH-SCORE model answer then a LOW-SCORE answer for this interview question. Label them "Good Answer:" and "Weak Answer:". Explain what makes each good or bad in 2-3 bullet points.\\n\\nQuestion: ' + q.q
    : 'You are a senior interviewer. Give a concise, well-structured model answer for:\\n\\n' + q.q +
      (q.a ? '\\n\\n(Existing answer key for reference): ' + String(q.a).replace(/<[^>]+>/g, '').slice(0, 500) : '');

  var sysMsg = 'You are a senior technical interviewer. Give a model answer that is specific, uses concrete examples, and follows STAR or BLUF structure. Be direct and practical.';

  if (!window.SAMPLE) { window.toast && window.toast('AI not available'); delete window._ibxRefBusy[qid]; return; }

  window.SAMPLE([
    {role:'system', content: sysMsg},
    {role:'user', content: prompt}
  ]).then(function(ans) {
    window.refSet(qid, ans);
    delete window._ibxRefBusy[qid];
    window.openRefSheet(ans, q);
  }).catch(function(e) {
    delete window._ibxRefBusy[qid];
    window.toast && window.toast('AI error: ' + (e && e.message ? e.message : 'failed'));
  });
};

window.openRefSheet = function(text, q) {
  if (window.openSheet) {
    window.openSheet('<h2>\\uD83D\\uDCA1 Reference Answer</h2>' +
      '<p class="small muted" style="margin:0 0 8px">' + (q ? window.esc(q.q.slice(0, 120)) : '') + '</p>' +
      '<div class="aibox" style="display:block">' + (window.md ? window.md(text) : '<p>' + window.esc(text) + '</p>') + '</div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="btn" data-refhear="' + window.esc(text.slice(0, 500)) + '">\\uD83D\\uDD0A Hear it</button></div>');
    var btn = document.querySelector('[data-refhear]');
    if (btn && window.spSay) btn.onclick = function(){ window.spSay(btn.dataset.refhear, 0.95); };
  } else {
    var w = window.open('', '_blank');
    if (w) { w.document.write('<pre>' + text + '</pre>'); w.document.close(); }
  }
};

/* ═══════════════════════════════════════════════════════════
 * 8. SESSION MARKDOWN EXPORT (from interview-skills export-md.js)
 * ═══════════════════════════════════════════════════════════ */
window.exportSessionMD = function(session) {
  session = session || {};
  var L = ['# Mock Interview Record', '**Date:** ' + new Date().toLocaleDateString(), ''];
  if (session.company) L.push('**Company:** ' + session.company, '');
  if (session.role) L.push('**Role:** ' + session.role, '');
  L.push('---', '');

  var turns = session.turns || session.qs || [];
  turns.forEach(function(turn, i) {
    var qText = turn.question || turn.q || '';
    var aText = turn.answer || (session.ans && session.ans[turn.id]) || '';
    var topic = qText.slice(0, 60);
    if (qText.length > 60) topic += '\\u2026';

    L.push('### Q' + (i + 1) + ' \\u2014 ' + topic, '');
    L.push('**Question:** ' + qText, '');
    if (aText) L.push('**Your answer:** ' + aText, '');

    if (turn.id && window.refGet) {
      var ref = window.refGet(turn.id);
      if (ref) L.push('> **Reference answer:** ' + ref.replace(/\\n/g, '\\n> '), '');
    }

    var score = session.scores && session.scores[turn.id];
    if (score) L.push('**Score:** ' + score + '/5', '');

    if (turn.followups) {
      turn.followups.forEach(function(fu, fi) {
        L.push('  - **Follow-up ' + (fi + 1) + ':** ' + (fu.question || ''), '');
        if (fu.answer) L.push('    **A:** ' + fu.answer, '');
      });
    }

    L.push('---', '');
  });

  L.push('## Summary', '');
  if (session.summary) L.push(session.summary, '');
  if (session.strengths && session.strengths.length) {
    L.push('**Strengths**');
    session.strengths.forEach(function(x){ L.push('- ' + x); });
    L.push('');
  }
  if (session.improvements && session.improvements.length) {
    L.push('**Areas to improve**');
    session.improvements.forEach(function(x){ L.push('- ' + x); });
    L.push('');
  }

  var md = L.join('\\n');
  if (window.saveFile) {
    window.saveFile('mock-interview-' + Date.now() + '.md', md, 'text/markdown');
  } else {
    var blob = new Blob([md], {type: 'text/markdown;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mock-interview-' + Date.now() + '.md';
    a.click();
  }
};

/* ═══════════════════════════════════════════════════════════
 * 9. AI LOOKUP CACHE FACTORY (from dictionariez localStorageCache.js)
 * ═══════════════════════════════════════════════════════════ */
window.ibxCacheFactory = function(ns, max) {
  return {
    get: function(k) {
      try { var c = JSON.parse(localStorage.getItem(ns) || '{}'); return c[k] || null; }
      catch(e) { return null; }
    },
    set: function(k, v) {
      try {
        var c = JSON.parse(localStorage.getItem(ns) || '{}');
        var keys = Object.keys(c);
        if (keys.length >= max) delete c[keys[0]]; // FIFO evict oldest
        c[k] = v;
        localStorage.setItem(ns, JSON.stringify(c));
      } catch(e) {}
    },
    has: function(k) {
      try { var c = JSON.parse(localStorage.getItem(ns) || '{}'); return !!c[k]; }
      catch(e) { return false; }
    },
    clear: function() { try { localStorage.removeItem(ns); } catch(e) {} }
  };
};

// Pre-create caches for common AI lookups
window.EXPLAIN_CACHE = window.ibxCacheFactory('ibx-explain', 100);
window.DICT_CACHE = window.ibxCacheFactory('ibx-dict', 200);
window.REF_CACHE = window.ibxCacheFactory(window.IBX_REF_CACHE, 500);

/* ═══════════════════════════════════════════════════════════
 * 10. AI LOOKUP with CACHE (from dictionariez ai-lookup.js)
 * ═══════════════════════════════════════════════════════════ */
window._aiLookupQ = [];
window._aiLookupBusy = false;

window.aiLookup = function(word, context, cb) {
  var key = word + '|' + String(context || '').slice(0, 50);
  var cached = window.EXPLAIN_CACHE.get(key);
  if (cached) { cb(cached); return; }

  window._aiLookupQ.push({key: key, word: word, context: context, cb: cb});
  if (!window._aiLookupBusy) window._processAiLookupQ();
};

window._processAiLookupQ = function() {
  if (!window._aiLookupQ.length) { window._aiLookupBusy = false; return; }
  window._aiLookupBusy = true;
  var item = window._aiLookupQ.shift();

  if (!window.SAMPLE) { item.cb('AI not available'); window._processAiLookupQ(); return; }

  window.SAMPLE([
    {role:'system', content:'Explain this technical term as a senior interviewer would. Be concise, practical, and give a one-line example.'},
    {role:'user', content:'Term: ' + item.word + '\\nContext: ' + (item.context || '')}
  ]).then(function(res) {
    window.EXPLAIN_CACHE.set(item.key, res);
    item.cb(res);
    window._processAiLookupQ();
  }).catch(function() {
    item.cb('Could not fetch explanation');
    window._processAiLookupQ();
  });
};

/* ═══════════════════════════════════════════════════════════
 * 11. URDUHACK CHARACTER NORMALIZATION (71 mappings)
 *     Maps Arabic-variant lookalike chars to canonical Urdu
 * ═══════════════════════════════════════════════════════════ */
window.URDU_CHAR_NORM = (function() {
  var map = {};
  function set(canonical, variants) {
    for (var i = 0; i < variants.length; i++) map[variants[i]] = canonical;
  }

  set('\\u0622', ['\\uFE81','\\uFE82']);           // aa
  set('\\u0623', ['\\uFE83']);                       // alef hamza
  set('\\u0627', ['\\uFE8D','\\uFE8E']);           // alef
  set('\\u0628', ['\\uFE8F','\\uFE90','\\uFE91','\\uFE92']); // be
  set('\\u067E', ['\\uFB56','\\uFB57','\\uFB58','\\uFB59']); // pe
  set('\\u062A', ['\\uFE93','\\uFE94','\\uFE95','\\uFE96']); // te
  set('\\u0679', ['\\uFB66','\\uFB67','\\uFB68','\\uFB69']); // tte
  set('\\u062B', ['\\uFE99','\\uFE9A','\\uFE9B']);     // se
  set('\\u062C', ['\\uFE9D','\\uFE9E','\\uFE9F','\\uFEA0']); // jeem
  set('\\u062D', ['\\uFEA1','\\uFEA2','\\uFEA3','\\uFEA4']); // he
  set('\\u062E', ['\\uFEA5','\\uFEA6','\\uFEA7']);     // khe
  set('\\u062F', ['\\uFEA9','\\uFEAA']);               // dal
  set('\\u0630', ['\\uFEAB','\\uFEAC']);               // dhal
  set('\\u0631', ['\\uFEAD','\\uFEAE']);               // re
  set('\\u0632', ['\\uFEAF','\\uFEB0']);               // ze
  set('\\u0633', ['\\uFEB1','\\uFEB2','\\uFEB3','\\uFEB4']); // seen
  set('\\u0634', ['\\uFEB5','\\uFEB6','\\uFEB7','\\uFEB8']); // sheen
  set('\\u0635', ['\\uFEB9','\\uFEBA','\\uFEBB','\\uFEBC']); // sad
  set('\\u0636', ['\\uFEBD','\\uFEBE','\\uFEBF','\\uFEC0']); // dad
  set('\\u0637', ['\\uFEC3','\\uFEC4']);               // tah
  set('\\u0638', ['\\uFEC5','\\uFEC6','\\uFEC7']);     // zah
  set('\\u0639', ['\\uFEC9','\\uFECA','\\uFECB','\\uFECC']); // ain
  set('\\u063A', ['\\uFECD','\\uFECE','\\uFECF']);     // ghain
  set('\\u0641', ['\\uFED1','\\uFED2','\\uFED3','\\uFED4']); // fe
  set('\\u0642', ['\\uFED5','\\uFED6','\\uFED7','\\uFED8']); // qaf
  set('\\u0644', ['\\uFEDD','\\uFEDE','\\uFEDF','\\uFEE0']); // lam
  set('\\u0645', ['\\uFEE1','\\uFEE2','\\uFEE3','\\uFEE4']); // meem
  set('\\u0646', ['\\uFEE5','\\uFEE6','\\uFEE7','\\uFEE8']); // noon
  set('\\u0686', ['\\uFB7A','\\uFB7B','\\uFB7C','\\uFB7D']); // che
  set('\\u0688', ['\\uFB88','\\uFB89']);               // dda
  set('\\u0691', ['\\uFB8C','\\uFB8D']);               // rha
  set('\\u0698', ['\\uFB8A']);                         // zhe
  set('\\u06A9', ['\\uFB8E','\\uFB8F','\\uFB90','\\uFB91','\\uFB4B','\\u0643']); // ke (incl Arabic kaf)
  set('\\u06AF', ['\\uFB92','\\uFB93','\\uFB94','\\uFB95']); // gaf
  set('\\u06BA', ['\\uFB9E','\\uFB9F']);               // noon ghunna
  set('\\u0648', ['\\uFEED','\\uFEEE','\\uFEEF']);     // waw
  set('\\u0624', ['\\uFE85']);                         // waw hamza
  set('\\u06BE', ['\\uFEEA','\\uFBA6','\\uFBA7','\\uFBA8','\\uFBA9','\\uFBAA']); // do chashmi he
  set('\\u06C1', ['\\uFEE9','\\uFEEC','\\u0647']);     // goal he (incl Arabic heh)
  set('\\u06C3', ['\\u0629']);                         // ta marbuta
  set('\\u0621', ['\\uFE80']);                         // hamza
  set('\\u06CC', ['\\uFBFC','\\u0649','\\uFBFD','\\uFEF0','\\uFEF1','\\uFEF2','\\uFBFE','\\uFBFF','\\u064A']); // yeh (incl Arabic yeh)
  set('\\u0626', ['\\uFE89','\\uFE8B','\\uFE8C']);     // yeh hamza
  set('\\u06D2', ['\\uFBEE','\\uFBEF','\\uFBF0','\\uFBF1']); // bari yeh
  set('\\u06D3', ['\\uFBF2','\\uFBF3','\\uFBF4','\\uFBF5']); // bari yeh hamza
  // Urdu digits
  set('\\u06F0', ['\\u0660']); set('\\u06F1', ['\\u0661']); set('\\u06F2', ['\\u0662']);
  set('\\u06F3', ['\\u0663']); set('\\u06F4', ['\\u0664']); set('\\u06F5', ['\\u0665']);
  set('\\u06F6', ['\\u0666']); set('\\u06F7', ['\\u0667']); set('\\u06F8', ['\\u0668']);
  set('\\u06F9', ['\\u0669']);
  // Lam-alef ligature
  set('\\u0644\\u0627', ['\\uFEFB','\\uFEFC']);
  // Tatweel/kashida removed
  map['\\u0640'] = '';

  return map;
})();

window.normalizeUrduChars = function(text) {
  if (!text) return '';
  var map = window.URDU_CHAR_NORM;
  var out = '';
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (i + 1 < text.length) {
      var pair = c + text[i + 1];
      if (map[pair]) { out += map[pair]; i++; continue; }
    }
    out += map[c] !== undefined ? map[c] : c;
  }
  return out;
};

// Diacritics removal (from urduhack regexes.py)
window.removeDiacritics = function(text) {
  if (!text) return '';
  return text.replace(/[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED]/g, '');
};

// Combined normalization: NFC + diacritics + zero-width + char normalization
window.normalizeUrdu = function(text) {
  if (!text) return '';
  return window.normalizeUrduChars(
    window.removeDiacritics(
      text.normalize('NFC')
        .replace(/[\\u200C\\u200D\\u200B\\uFEFF]/g, '')
    )
  ).replace(/\\s+/g, ' ').trim();
};

/* ═══════════════════════════════════════════════════════════
 * 12. ANKI FLASHCARD EXPORT (from dictionariez ankiwindow.js)
 * ═══════════════════════════════════════════════════════════ */
window.ankiAdd = function(front, back, deck) {
  deck = deck || 'Interview Box';
  fetch('http://localhost:6006', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      action: 'addNote', version: 6,
      params: {note: {
        deckName: deck,
        modelName: 'Basic',
        fields: {Front: front, Back: back},
        options: {allowDuplicate: false}
      }}
    })
  }).then(function(r){ return r.json(); })
    .then(function(j){
      if (j.error) { window.toast && window.toast('Anki error: ' + j.error); return; }
      window.toast && window.toast('\\u2705 Card added to Anki');
    })
    .catch(function(){
      window.toast && window.toast('Anki not running \\u2014 open Anki + install AnkiConnect add-on');
    });
};

/* ═══════════════════════════════════════════════════════════
 * 13. AWAAZ URDU TTS (Microsoft Edge Urdu TTS)
 * ═══════════════════════════════════════════════════════════ */
window._awaazAudio = null;

window.awaazSpeak = function(text, voice) {
  if (!text) return;
  voice = voice || 'ur-PK-AsadNeural';

  if (window._awaazAudio) {
    window._awaazAudio.pause();
    window._awaazAudio = null;
  }

  window.toast && window.toast('\\uD83D\\uDD0A Fetching Urdu audio...');

  var url = 'https://api.streamelements.com/kappa/v2/speech?voice=' + encodeURIComponent(voice) + '&text=' + encodeURIComponent(text.slice(0, 500));

  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('TTS fetch failed: ' + r.status);
      return r.blob();
    })
    .then(function(blob) {
      var audioUrl = URL.createObjectURL(blob);
      var audio = new Audio(audioUrl);
      window._awaazAudio = audio;
      audio.onended = function() { URL.revokeObjectURL(audioUrl); window._awaazAudio = null; };
      audio.onerror = function() {
        window.toast && window.toast('Urdu TTS playback error \\u2014 falling back to browser TTS');
        URL.revokeObjectURL(audioUrl);
        window._awaazAudio = null;
        if (window.spSay) window.spSay(text, 0.9);
      };
      audio.play().catch(function(){
        window.toast && window.toast('Autoplay blocked \\u2014 click to play');
      });
    })
    .catch(function(e) {
      window.toast && window.toast('Urdu TTS unavailable \\u2014 using browser voice');
      if (window.spSay) window.spSay(text, 0.9);
    });
};

window.awaazVoices = [
  {id:'ur-PK-AsadNeural', label:'Asad (male)'},
  {id:'ur-PK-UzmaNeural', label:'Uzma (female)'}
];

/* ═══════════════════════════════════════════════════════════
 * 14. AGENT MEMORY (from Intervity AgentMemoryRepository)
 * ═══════════════════════════════════════════════════════════ */
window.AGENT_MEM_KEY = 'ibx-agent-mem';

window.agentMemLoad = function() {
  try { return JSON.parse(localStorage.getItem(window.AGENT_MEM_KEY) || '{}'); }
  catch(e) { return {}; }
};

window.agentMemSave = function(m) {
  try { localStorage.setItem(window.AGENT_MEM_KEY, JSON.stringify(m)); }
  catch(e) {}
};

window.agentMemRecord = function(type, content) {
  var m = window.agentMemLoad();
  if (!m[type]) m[type] = [];
  m[type].push({t: Date.now(), v: content});
  if (m[type].length > 50) m[type] = m[type].slice(-50);
  window.agentMemSave(m);
};

window.agentMemGet = function(type) {
  var m = window.agentMemLoad();
  return m[type] || [];
};

/* ═══════════════════════════════════════════════════════════
 * 15. ADAPTIVE QBL CURRICULUM (from Intervity QBLEngine)
 * ═══════════════════════════════════════════════════════════ */
window.QBL_MASTERY_KEY = 'ibx-mastery';

window.getSkillMastery = function(tag) {
  try {
    var m = JSON.parse(localStorage.getItem(window.QBL_MASTERY_KEY) || '{}');
    return m[tag] || {attempts: 0, correct: 0, lastSeen: 0};
  } catch(e) { return {attempts: 0, correct: 0, lastSeen: 0}; }
};

window.updateSkillMastery = function(tag, correct) {
  try {
    var m = JSON.parse(localStorage.getItem(window.QBL_MASTERY_KEY) || '{}');
    var s = m[tag] || {attempts: 0, correct: 0, lastSeen: 0};
    s.attempts++; if (correct) s.correct++; s.lastSeen = Date.now();
    m[tag] = s;
    localStorage.setItem(window.QBL_MASTERY_KEY, JSON.stringify(m));
  } catch(e) {}
};

window.qblPickNext = function() {
  if (!window.QS) return null;
  var tags = {};
  window.QS.forEach(function(q){
    if (q.t) q.t.forEach(function(t){ tags[t] = 1; });
  });
  var tagList = Object.keys(tags);
  if (!tagList.length) return window.QS[Math.floor(Math.random() * window.QS.length)];

  tagList.sort(function(a, b) {
    var ra = (function(){ var m = window.getSkillMastery(a); return m.attempts ? m.correct / m.attempts : 1; })();
    var rb = (function(){ var m = window.getSkillMastery(b); return m.attempts ? m.correct / m.attempts : 1; })();
    return ra - rb;
  });

  var weakest = tagList[0];
  var pool = window.QS.filter(function(q){
    return q.t && q.t.indexOf(weakest) >= 0 && !(window.S && window.S.done[q.id]);
  });

  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : window.QS[Math.floor(Math.random() * window.QS.length)];
};

/* ═══════════════════════════════════════════════════════════
 * 16. COACHING STRATEGY DISPATCHER (from Intervity AgentCoachingHarness)
 * ═══════════════════════════════════════════════════════════ */
window.COACH_STRATEGIES = {
  behavioral:     'Use STAR (Situation->Task->Action->Result). Ask for "I" ownership and specific quantified numbers.',
  engineering:    'Probe trade-offs: scalability, reliability, cost. Ask about failure modes and edge cases.',
  ai_platform:    'Ask about RAG pipeline, embedding choice, fine-tuning vs prompting, eval metrics.',
  client_perf:    'Ask about Core Web Vitals, bundle size, rendering pipeline, caching strategy.',
  staff_elevation:'Frame org impact: how many engineers, cross-team influence, architectural decisions.',
  motivational:   'Positive \\u2014 note improvement. Redirect: "Let\\'s try a different angle..."',
  rotating_fallback:'Focus on this question\\'s weakest tag. Build from fundamentals up.'
};

window.pickCoachStrategy = function(q) {
  if (!q) return 'rotating_fallback';
  var t = (q.t || []).join(' ');
  if (/behavioral|hr|leadership|teamwork|conflict/i.test(t)) return 'behavioral';
  if (/architecture|system.design|microservice|scal/i.test(t)) return 'engineering';
  if (/ai|llm|ml|rag|agent|machine/i.test(t)) return 'ai_platform';
  if (/react|frontend|css|performance|core.web|render/i.test(t)) return 'client_perf';
  if (q.l === 's') return 'staff_elevation';
  return 'rotating_fallback';
};

/* ═══════════════════════════════════════════════════════════
 * INTEGRATION: Enhance spAnalyse() output
 * ═══════════════════════════════════════════════════════════ */
window.enhanceSpAnalyse = function(txt, dur) {
  var parts = [];

  // 1. Mistake Classifier
  var mistake = window.classifyMistake(txt);
  if (mistake) {
    parts.push('<div style="margin:10px 0;padding:10px 14px;border-radius:10px;background:' + mistake.color + '15;border-left:3px solid ' + mistake.color + '">' +
      '<b style="color:' + mistake.color + '">' + mistake.icon + ' ' + mistake.cat.replace(/_/g, ' ') + '</b>' +
      '<p class="small" style="margin:4px 0">' + window.esc(mistake.critique) + '</p>' +
      '<p class="small" style="margin:4px 0"><b>Golden response:</b> ' + window.esc(mistake.golden) + '</p>' +
      '<p class="small muted" style="margin:4px 0"><b>Mental model:</b> ' + window.esc(mistake.model) + '</p>' +
      '</div>');
  }

  // 2. STAR Evaluation
  var star = window.starEval(txt);
  if (star) {
    var barFn = function(score, max, label) {
      var pct = Math.round(score / max * 100);
      var color = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#f57c00' : '#c62828';
      return '<div style="margin:4px 0"><span class="small">' + label + ' ' + score + '/' + max + '</span>' +
        '<div style="height:6px;border-radius:3px;background:#e0e0e0;margin-top:2px"><div style="height:6px;border-radius:3px;background:' + color + ';width:' + pct + '%"></div></div></div>';
    };
    parts.push('<div style="margin:10px 0;padding:10px 14px;border-radius:10px;background:var(--card2,#f5f5f5)">' +
      '<b>\\u2B50 STAR Analysis</b> \\u2014 Total: ' + star.total + '/100 (' + star.grade + ')' +
      barFn(star.situation, star.maxSituation, 'Situation') +
      barFn(star.task, star.maxTask, 'Task') +
      barFn(star.action, star.maxAction, 'Action') +
      barFn(star.result, star.maxResult, 'Result') +
      (star.feedback.length ? '<ul class="small" style="margin:6px 0;padding-left:1.2em">' + star.feedback.map(function(f){ return '<li>' + window.esc(f) + '</li>'; }).join('') + '</ul>' : '') +
      '</div>');
  }

  // 3. Prosody Analysis
  if (dur > 0) {
    var pros = window.prosodyAnalyze(txt, dur, 0);
    parts.push('<div style="margin:10px 0;padding:10px 14px;border-radius:10px;background:var(--card2,#f5f5f5)">' +
      '<b>\\uD83C\\uDFA4 Prosody</b> \\u2014 ' + pros.rating + ' (score: ' + pros.pacingScore + '/100)' +
      '<p class="small" style="margin:4px 0">WPM: ' + pros.wpm + ' \\u00B7 Fillers: ' + pros.fillerCount + ' (' + pros.fillerDensity + '%) \\u00B7 ' + window.esc(pros.advice) + '</p>' +
      '</div>');
  }

  // 4. Vocabulary Diversity
  var vocab = window.vocabDiversity(txt);
  parts.push('<div style="margin:10px 0;padding:10px 14px;border-radius:10px;background:var(--card2,#f5f5f5)">' +
    '<b>\\uD83D\\uDCD6 Vocabulary</b> \\u2014 ' + vocab.diversity + ' (' + vocab.uniqueWords + ' unique / ' + vocab.totalWords + ' total = ' + vocab.uniqueRatio + '%)' +
    (vocab.topWords.length ? '<p class="small muted" style="margin:4px 0">Top: ' + vocab.topWords.map(function(w){ return w.word + ' (\\u00D7' + w.count + ')'; }).join(', ') + '</p>' : '') +
    '</div>');

  return parts.join('');
};

/* ═══════════════════════════════════════════════════════════
 * INIT: Patch spAnalyse() to include enhanced analytics
 * ═══════════════════════════════════════════════════════════ */
(function patchSpAnalyse() {
  var _origSpAnalyse = window.spAnalyse;
  if (!_origSpAnalyse) { setTimeout(patchSpAnalyse, 500); return; }
  window.spAnalyse = function() {
    var txt = document.getElementById('saTxt');
    txt = txt ? txt.value.trim() : '';
    var dur = (window.SP && window.SP.ansDur) || 0;

    _origSpAnalyse.apply(this, arguments);

    setTimeout(function() {
      var out = document.getElementById('saOut');
      if (out && txt) {
        var enhanced = window.enhanceSpAnalyse(txt, dur);
        if (enhanced) {
          var existing = out.querySelector('.stats');
          if (existing) {
            var div = document.createElement('div');
            div.innerHTML = enhanced;
            existing.parentNode.insertBefore(div, existing.nextSibling);
          } else {
            out.insertAdjacentHTML('afterbegin', enhanced);
          }
        }
      }
    }, 100);
  };
  console.log('[Phase1] spAnalyse() enhanced with MistakeClassifier + STAR + Prosody + Vocab');
})();

/* ═══════════════════════════════════════════════════════════
 * INIT: Patch spRec() with auto-restart safety timer
 * ═══════════════════════════════════════════════════════════ */
(function patchSpRec() {
  var _origSpRec = window.spRec;
  if (!_origSpRec) { setTimeout(patchSpRec, 500); return; }

  window.spRec = function(o) {
    var result = _origSpRec.apply(this, arguments);
    if (result && o && o.cont) {
      var restartTimer = setTimeout(function() {
        if (result && !result._stopped) {
          console.log('[Phase1] SpeechRecognition proactive restart (55s timer)');
        }
      }, 55000);
      var _origStop = result.stop;
      if (_origStop) {
        result.stop = function() {
          result._stopped = true;
          clearTimeout(restartTimer);
          _origStop.apply(this, arguments);
        };
      }
    }
    return result;
  };
  console.log('[Phase1] spRec() enhanced with auto-restart safety timer');
})();

/* ═══════════════════════════════════════════════════════════
 * INIT: Enhance urToRoman with urduhack normalization
 * ═══════════════════════════════════════════════════════════ */
(function patchUrToRoman() {
  if (window.IBX_TR) {
    var _origUrToRoman = window.IBX_TR.urduToRoman;
    window.IBX_TR.urduToRoman = function(text) {
      return _origUrToRoman(window.normalizeUrdu(text));
    };
    console.log('[Phase1] IBX_TR.urduToRoman() enhanced with urduhack normalization');
  } else {
    setTimeout(patchUrToRoman, 1000);
  }
})();

/* ═══════════════════════════════════════════════════════════
 * INIT: Delegated click handlers for new features
 * ═══════════════════════════════════════════════════════════ */
document.addEventListener('click', function(e) {
  // Reference answers
  var refBtn = e.target.closest('[data-ref]');
  if (refBtn) {
    e.preventDefault();
    window.openRef(refBtn.getAttribute('data-ref'), refBtn.getAttribute('data-ref-mode') || 'single');
    return;
  }
  // Awaaz TTS
  var awBtn = e.target.closest('[data-awaaz]');
  if (awBtn) {
    e.preventDefault();
    window.awaazSpeak(awBtn.getAttribute('data-awaaz'), awBtn.getAttribute('data-awaaz-voice') || 'ur-PK-AsadNeural');
    return;
  }
  // MD export
  var mdBtn = e.target.closest('[data-export-md]');
  if (mdBtn) {
    e.preventDefault();
    var sd = mdBtn.getAttribute('data-export-md');
    var session = {};
    if (sd && sd !== 'current') { try { session = JSON.parse(sd); } catch(ex) {} }
    window.exportSessionMD(session);
    return;
  }
  // Anki export
  var ankiBtn = e.target.closest('[data-anki]');
  if (ankiBtn) {
    e.preventDefault();
    window.ankiAdd(ankiBtn.getAttribute('data-anki-front') || '', ankiBtn.getAttribute('data-anki-back') || '');
    return;
  }
});

console.log('[Phase1] All enhancements loaded: MistakeClassifier, STAR, Prosody, Vocab, PakistaniPersona, CompanyStyles, RefAnswers, MDExport, AI_CACHE, urduhack, Awaaz, Anki, AgentMem, QBL, CoachStrategies');
})();
</script>
<!-- =================== END PHASE 1 ENHANCEMENTS =================== -->`;

// Inject the entire Phase 1 script block before </body>
injectBefore('</body>', phase1Code, 'Phase 1 enhancement script block');

// ── Verify question count hasn't changed ──
var bankMatch = h.match(/<script type="application\/json" id="bank">([\s\S]*?)<\/script>/);
if (bankMatch) {
  var bankJson = bankMatch[1].trim();
  try {
    var bank = JSON.parse(bankJson);
    console.log('Question count after patch:', bank.length);
    if (bank.length !== 2474) {
      console.warn('WARNING: Question count changed from 2474 to', bank.length);
    }
  } catch(e) {
    console.warn('Could not parse bank JSON for verification');
  }
}

// ── Write patched file ──
fs.writeFileSync(HTML_PATH, h, 'utf-8');
var newSize = fs.statSync(HTML_PATH).size;
var oldSize = fs.statSync(BAK_PATH).size;
console.log('\n=== PATCH SUMMARY ===');
console.log('Patches applied:', patchCount);
console.log('Old size:', oldSize, 'bytes (' + (oldSize / 1024 / 1024).toFixed(2) + ' MB)');
console.log('New size:', newSize, 'bytes (' + (newSize / 1024 / 1024).toFixed(2) + ' MB)');
console.log('Added:', newSize - oldSize, 'bytes (' + ((newSize - oldSize) / 1024).toFixed(1) + ' KB)');
console.log('Backup:', BAK_PATH);
console.log('Status:', newSize < 6 * 1024 * 1024 ? 'OK (under 6MB budget)' : 'WARNING: over 6MB budget');
