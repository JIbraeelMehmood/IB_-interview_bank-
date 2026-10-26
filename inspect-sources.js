'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const read = f => fs.readFileSync(path.join(DIR, f), 'utf-8');

const EN = 'Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md';
const RU = 'Interview Prep Roman Urdu Version (Poori Guide).md';
const RU2 = 'Roman Urdu v2 (Modern Dev Style).md';

// extract question markers per line: tag + num
function markers(file) {
  const lines = read(file).split('\n');
  const out = [];
  lines.forEach((l, i) => {
    const m = /^\s*\*\*\s*([A-Z]{1,2})(\d+)\.\s*(.*)$/.exec(l);
    if (m) out.push({ line: i + 1, tag: m[1], num: +m[2], q: m[3].slice(0, 70), raw: l.slice(0, 120) });
  });
  return out;
}
const en = markers(EN), ru = markers(RU), ru2 = markers(RU2);
console.log('EN markers', en.length, 'RU markers', ru.length, 'RU2 markers', ru2.length);

// align EN vs RU by sequence
let i = 0, j = 0, aligned = 0, mismatch = [];
while (i < en.length && j < ru.length) {
  const a = en[i], b = ru[j];
  if (a.tag === b.tag && a.num === b.num) { aligned++; i++; j++; continue; }
  // try to resync: look ahead
  let found = -1;
  for (let k = j + 1; k < Math.min(j + 8, ru.length); k++) {
    if (ru[k].tag === a.tag && ru[k].num === a.num) { found = k; break; }
  }
  if (found >= 0) {
    mismatch.push({ at: a.line, en: a.tag + a.num, skippedRU: ru.slice(j, found).map(x => x.tag + x.num).join(','), ru: b.line });
    j = found; continue;
  }
  mismatch.push({ at: a.line, en: a.tag + a.num, ru: b.line, ruTag: b.tag + b.num, type: 'nomatch' });
  i++; j++;
}
console.log('aligned pairs:', aligned, 'mismatches:', mismatch.length);
console.log('--- first 25 mismatches ---');
mismatch.slice(0, 25).forEach(m => console.log(JSON.stringify(m)));

// now RU vs RU2 alignment
let i2 = 0, j2 = 0, al2 = 0, mm2 = [];
while (i2 < ru.length && j2 < ru2.length) {
  const a = ru[i2], b = ru2[j2];
  if (a.tag === b.tag && a.num === b.num) { al2++; i2++; j2++; continue; }
  let found = -1;
  for (let k = j2 + 1; k < Math.min(j2 + 8, ru2.length); k++) {
    if (ru2[k].tag === a.tag && ru2[k].num === a.num) { found = k; break; }
  }
  if (found >= 0) { mm2.push({ en: a.tag + a.num, skipped: ru2.slice(j2, found).map(x => x.tag + x.num).join(',') }); j2 = found; continue; }
  mm2.push({ en: a.tag + a.num, ru2: b.tag + b.num, type: 'nomatch' });
  i2++; j2++;
}
console.log('RU vs RU2 aligned:', al2, 'mismatches:', mm2.length);
mm2.slice(0, 25).forEach(m => console.log(JSON.stringify(m)));


