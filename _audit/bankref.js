'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const out = [];
const pats = [
  [/id=["']bank["']/, 'BANK TAG'],
  [/\bBANK\b/, 'BANK ident'],
  [/getElementById\(['"]bank['"]\)/, 'getElementById bank'],
  [/PARTS_BOOK\s*=/, 'PARTS_BOOK def'],
  [/PARTS_NEW\s*=/, 'PARTS_NEW def'],
  [/\bLV\s*=\s*\{/, 'LV def'],
  [/\bTECHS\s*=/, 'TECHS def'],
  [/\bTMAP\s*=/, 'TMAP def'],
  [/\bQS\s*=/, 'QS assign'],
  [/function\s+rebuild/, 'rebuild fn'],
  [/function\s+mkQ/, 'mkQ fn'],
  [/\.raw\b/, 'raw usage'],
];
lines.forEach((l, i) => {
  pats.forEach(([p, label]) => {
    if (p.test(l)) out.push('[' + label + '] L' + (i + 1) + ': ' + l.slice(0, 400));
  });
});
fs.writeFileSync(path.join(DIR, '_audit', 'bankref.txt'), out.join('\n'));
console.log('lines hit: ' + out.length);
