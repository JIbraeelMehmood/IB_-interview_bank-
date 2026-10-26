/**
 * Interview Box - PITB / Pakistan Railways ITOPS bank builder (heading aware).
 *
 * Parses the markdown interview banks into ONE normalised question set and
 * pairs every Roman-Urdu question with its English twin (same question number
 * in the English guide) so the app shows a built-in translation instead of a
 * duplicate card.
 *
 * Output: pitb-bank.json  (questions in the app's built-in bank schema)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const OUT = path.join(DIR, 'pitb-bank.json');
const read = f => fs.readFileSync(path.join(DIR, f), 'utf-8');

/* ---------- text helpers ---------- */
function unescapeMd(t) {
  return String(t == null ? '' : t)
    .replace(/\\\\_/g, '_')
    .replace(/\\([*_`#\[\]()])/g, '$1');
}
function tidy(t) {
  return unescapeMd(t).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}
/* "Q12. " / "S3. " / "F7. " prefix */
function stripNum(t) {
  return String(t).replace(/^\s*[A-Z]{0,3}\d+\.\s*/, '').trim();
}
/* leading "**" bold markers used as section labels inside answers */
function levelHint(q) {
  const m = /^\s*\\?\[(Junior|Mid|4[- ]?year|Senior)\\]/i.exec(q);
  return m ? m[1].toLowerCase().replace(/[^a-z]/g, '') : '';
}

/* ---------- heading aware parser ----------
 * A question starts at a line like:  **Q12. text?**   or  **F7. "text"**
 * The answer is either inline (same line, after "A:" / "Answer:" / "Jawab:")
 * or the block of lines that follow, until the next question or heading.
 */
const QMARK = /^(\*\*)\s*([A-Z]{0,3})(\d+)\.\s*/;
const INLINE = /^\s*(?:A|Answer|Jawab)\s*:\s*/i;

function parseFile(file, opt) {
  opt = opt || {};
  const text = read(file);
  const lines = text.split('\n');
  const qs = [];
  let cur = null, heading = '', hLevel = 0, fence = false, fenceTag = '';

  function flush() {
    if (!cur) return;
    cur.ans = tidy(cur.ans.join('\n'));
    cur.q = tidy(cur.q);
    if (cur.q.length > 8) qs.push(cur);
    cur = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (fence) {
      if (/^\s*```/.test(line)) { fence = false; if (cur) cur.ans.push(line); continue; }
      if (cur) cur.ans.push(line);
      continue;
    }
    if (/^\s*```/.test(line)) { fence = true; if (cur) cur.ans.push(line); continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) { flush(); heading = tidy(h[2]); hLevel = h[1].length; continue; }

    const m = QMARK.exec(t);
    if (m) {
      flush();
      // question text runs to the closing "**" on this line
      const rest = line.slice(m[0].length);
      const close = rest.indexOf('**');
      let qText, after;
      if (close >= 0) { qText = rest.slice(0, close); after = rest.slice(close + 2); }
      else { qText = rest; after = ''; }
      after = after.replace(/^\s*/, '');
      cur = {
        tag: m[2], num: parseInt(m[3], 10),
        q: stripNum(qText),
        ans: [], heading: heading, hLevel: hLevel,
        inline: !!INLINE.exec(after), src: opt.src
      };
      const im = INLINE.exec(after);
      if (im) cur.ans.push(after.slice(im[0].length));
      else if (after.trim()) cur.ans.push(after);
      continue;
    }
    if (cur) cur.ans.push(line);
  }
  flush();
  return qs;
}
module.exports = { read, tidy, unescapeMd, stripNum, levelHint, parseFile, DIR, OUT, fs, path };
