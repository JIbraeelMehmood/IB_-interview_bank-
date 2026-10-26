'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const out = [];
// search for specific field accesses on question objects
const pats = [
  [/\bq\.l\b|\.l===|\.l!==/, 'q.l'],
  [/\bq\.p\b/, 'q.p'],
  [/\bq\.c\b/, 'q.c'],
  [/\bq\.f\b/, 'q.f'],
  [/\bq\.s\b/, 'q.s'],
  [/\bq\.x\b|\.x===1|\.x==1/, 'q.x'],
  [/\bq\.t\b/, 'q.t'],
  [/\bq\.ex\b/, 'q.ex'],
  [/relScore|rankQs/, 'relScore'],
  [/\bfill\b|\.fill\b/, 'fill'],
  [/function\s+strip\b/, 'strip'],
  [/function\s+md\b/, 'md'],
  [/function\s+relScore/, 'relScore def'],
];
lines.forEach((l, i) => {
  if (i === 661) return;
  pats.forEach(([p, label]) => {
    if (p.test(l)) out.push('[' + label + '] L' + (i + 1) + ': ' + l.trim().slice(0, 300));
  });
});
fs.writeFileSync(path.join(DIR, '_audit', 'usage.txt'), out.join('\n'));
console.log('hits ' + out.length);
