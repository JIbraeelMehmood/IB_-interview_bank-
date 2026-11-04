'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const out = [];
const pats = [
  [/\blvl\b/, 'lvl'],
  [/\bpriority\b/, 'priority'],
  [/\bsrc\b/, 'src'],
  [/\bF\s*=\s*\{/, 'F def'],
  [/fl\.imp|flags\.imp|'imp'/, 'imp flag'],
  [/PARTS_BOOK|PARTS_NEW/, 'PARTS'],
  [/catSel|renderCats|opt\.cat/, 'cats'],
  [/importBank|doImport|importJSON|handleImport/, 'import'],
  [/\bLAB_EX\b/, 'LAB_EX'],
  [/function\s+exKey/, 'exKey'],
];
lines.forEach((l, i) => {
  if (i === 661) return;
  pats.forEach(([p, label]) => {
    if (p.test(l)) out.push('[' + label + '] L' + (i + 1) + ': ' + l.trim().slice(0, 300));
  });
});
fs.writeFileSync(path.join(DIR, '_audit', 'ctx.txt'), out.join('\n'));
console.log('hits ' + out.length);
