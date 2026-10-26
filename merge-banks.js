'use strict';
/**
 * merge-banks.js
 *
 * Merges the legacy 1950-question bank (v1-interview-box/interview-box.html)
 * with the current 531-question clean bank embedded in interview-box.html,
 * deduplicates by normalized question text, and writes the result back into
 * the <script id="bank"> tag in interview-box.html.
 *
 * Schema the app's mkQ() function expects:
 *   id, q, a, l, p, c, f, t, s, x
 *   optional: tr, ex
 *
 * Run:
 *   node merge-banks.js
 */

const fs   = require('fs');
const path = require('path');

const DIR        = __dirname;
const CUR_HTML   = path.join(DIR, 'interview-box.html');
const V1_HTML    = path.join(DIR, 'v1-interview-box', 'interview-box.html');
const BAK_HTML   = CUR_HTML + '.bak-merge-' + new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);

// ── helpers ────────────────────────────────────────────────────────────────

function extractBank(htmlPath) {
  const text = fs.readFileSync(htmlPath, 'utf-8');
  const m = text.match(/<script[^>]*\bid="bank"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No <script id="bank"> found in ' + htmlPath);
  return JSON.parse(m[1]);
}

/** Normalise question text for dedup comparison */
function normQ(str) {
  return String(str || '')
    .replace(/^Q\d+[\.\)]\s*/i, '')   // strip leading "Q1. " or "Q1)"
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Map clean-bank lvl → l ────────────────────────────────────────────────
const LVL_MAP = { mixed: 'm', senior: 's', mid: 'm', junior: 'j', m: 'm', s: 's', j: 'j' };

// Map clean-bank src → category (p field) — use the src directly as p so it
// shows up as its own category group in the Library view.
function srcToP(src) {
  return src || 'PITB Pakistan Railways ITOPS';
}

// ── Map clean-bank priority → f flag (important/critical markers) ─────────
// priority 3 = high → 'i' (important)
// priority 2 = med  → ''
// priority 1 = low  → ''
function priorityToF(priority) {
  return priority >= 3 ? 'i' : '';
}

// ── tag merge: clean bank uses [{t: ["tag1","tag2"]}, legacy uses t array ──
function mergeTags(existing, extra) {
  const set = new Set([...(existing || []), ...(extra || [])]);
  return Array.from(set);
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 1: Extract legacy bank (1950 questions)
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[1] Extracting legacy bank from v1 HTML…');
const legacyRaw = extractBank(V1_HTML);
const legacyArr = Array.isArray(legacyRaw) ? legacyRaw : (legacyRaw.questions || []);
console.log('    legacy count:', legacyArr.length);

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Normalise legacy records — they are already in the correct mkQ
//         schema {id,q,a,l,p,c,f,t,s,x,tr?,ex?}. Just ensure no missing
//         required fields.
// ─────────────────────────────────────────────────────────────────────────
console.log('[2] Normalising legacy records…');
const legacyNorm = legacyArr.map(function(o) {
  const r = {
    id: o.id,
    q:  o.q,
    a:  o.a,
    l:  o.l || 'm',
    p:  o.p || '',
    c:  o.c || '',
    f:  o.f || '',
    t:  Array.isArray(o.t) ? o.t : [],
    s:  o.s || 'b',
    x:  o.x || 0,
  };
  if (o.tr) r.tr = o.tr;
  if (o.ex) r.ex = o.ex;
  return r;
});
console.log('    normalised legacy:', legacyNorm.length);

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: Extract current clean bank (531 questions) and normalise
// ─────────────────────────────────────────────────────────────────────────
console.log('[3] Extracting + normalising clean bank from current HTML…');
const cleanRaw = extractBank(CUR_HTML);
const cleanArr = Array.isArray(cleanRaw) ? cleanRaw : (cleanRaw.questions || []);
console.log('    clean count:', cleanArr.length);

const cleanNorm = cleanArr.map(function(o) {
  // Clean bank: {id, q, a, t, lvl, s, src, priority}
  // Map to mkQ schema:
  //   l   = lvl mapped (mixed->m, senior->s, etc.)
  //   p   = src (used as category)
  //   c   = src (sub-category, same value)
  //   f   = 'i' if priority>=3 else ''
  //   s   = 'n'  ('n' = new/PITB bank — distinct from 'b' legacy)
  //   t   = existing tags from clean record
  //   x   = 0
  const tags = Array.isArray(o.t) ? o.t : [];
  return {
    id: o.id,
    q:  o.q,
    a:  o.a,
    l:  LVL_MAP[o.lvl] || 'm',
    p:  srcToP(o.src),
    c:  o.src || '',
    f:  priorityToF(o.priority),
    t:  tags,
    s:  'n',   // 'n' = new/PITB source, matches existing PARTS_NEW logic
    x:  0,
  };
});
console.log('    normalised clean:', cleanNorm.length);

// ─────────────────────────────────────────────────────────────────────────
// STEP 4: Deduplicate — prefer legacy record when question text matches
//         (legacy has richer answer HTML; clean bank answers are plain text)
// ─────────────────────────────────────────────────────────────────────────
console.log('[4] Deduplicating by normalised question text…');

// Build set of normalised legacy questions
const legacyQSet = new Set();
legacyNorm.forEach(function(r) { legacyQSet.add(normQ(r.q)); });

// Also build set of legacy IDs to prevent ID collision
const usedIds = new Set();
legacyNorm.forEach(function(r) { usedIds.add(r.id); });

let dupCount = 0;
const cleanUniq = [];
cleanNorm.forEach(function(r) {
  const nq = normQ(r.q);
  if (legacyQSet.has(nq)) {
    dupCount++;
    return; // skip — already in legacy
  }
  // ensure ID is unique
  let id = r.id;
  if (usedIds.has(id)) {
    id = id + '_pitb';
    r.id = id;
  }
  usedIds.add(id);
  cleanUniq.push(r);
});
console.log('    duplicates removed:', dupCount);
console.log('    clean unique (after dedup):', cleanUniq.length);

// ─────────────────────────────────────────────────────────────────────────
// STEP 5: Merge — legacy first, then unique PITB questions
// ─────────────────────────────────────────────────────────────────────────
console.log('[5] Merging…');
const merged = legacyNorm.concat(cleanUniq);
console.log('    TOTAL merged:', merged.length);

// Sanity: verify all IDs unique
const idCheck = new Set(merged.map(function(r) { return r.id; }));
if (idCheck.size !== merged.length) {
  throw new Error('ID collision! unique=' + idCheck.size + ' total=' + merged.length);
}
console.log('    ID uniqueness: OK');

// ─────────────────────────────────────────────────────────────────────────
// STEP 6: Inject into interview-box.html
// ─────────────────────────────────────────────────────────────────────────
console.log('[6] Injecting into interview-box.html…');

// Backup first
fs.copyFileSync(CUR_HTML, BAK_HTML);
console.log('    backup →', path.basename(BAK_HTML));

const curHtml = fs.readFileSync(CUR_HTML, 'utf-8');

// Build replacement — compact JSON (no extra whitespace)
const newBankJson = JSON.stringify(merged);

// Replace the bank script contents
const newHtml = curHtml.replace(
  /(<script[^>]*\bid="bank"[^>]*>)([\s\S]*?)(<\/script>)/,
  function(_, open, _content, close) {
    return open + '\n' + newBankJson + '\n' + close;
  }
);

if (newHtml === curHtml) {
  throw new Error('Replacement did not change the file — bank tag not found or regex failed.');
}

fs.writeFileSync(CUR_HTML, newHtml, 'utf-8');
console.log('    written →', 'interview-box.html');
console.log('    new file size:', fs.statSync(CUR_HTML).size, 'bytes');

// ─────────────────────────────────────────────────────────────────────────
// STEP 7: Verify the written file
// ─────────────────────────────────────────────────────────────────────────
console.log('[7] Verifying written file…');
const verify = extractBank(CUR_HTML);
const varr = Array.isArray(verify) ? verify : (verify.questions || []);
console.log('    verified count:', varr.length);
if (varr.length !== merged.length) {
  throw new Error('COUNT MISMATCH after write! expected=' + merged.length + ' got=' + varr.length);
}
const vKeys = {};
varr.forEach(function(r) { Object.keys(r).forEach(function(k) { vKeys[k] = (vKeys[k] || 0) + 1; }); });
console.log('    field coverage:', JSON.stringify(vKeys));

// Distribution summary
const byS = {}, byL = {}, byP = {};
varr.forEach(function(r) {
  byS[r.s] = (byS[r.s] || 0) + 1;
  byL[r.l] = (byL[r.l] || 0) + 1;
  byP[r.p] = (byP[r.p] || 0) + 1;
});
console.log('\n=== DISTRIBUTION ===');
console.log('by source (s):', JSON.stringify(byS));
console.log('by level  (l):', JSON.stringify(byL));
console.log('top categories (p):');
Object.entries(byP).sort(function(a,b){return b[1]-a[1];}).slice(0,15).forEach(function(e){
  console.log('   ', String(e[1]).padStart(4), e[0]);
});

console.log('\n✅  DONE — merged', merged.length, 'questions into interview-box.html');
console.log('    (legacy:', legacyNorm.length, '+ PITB unique:', cleanUniq.length, ', dupes removed:', dupCount + ')');
