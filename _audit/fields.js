'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const out = [];
const pats = [
  [/\.ex\b/, 'q.ex'],
  [/\bex\b\s*[:=]/, 'ex assign'],
  [/\.x\b/, 'q.x'],
  [/\bx\s*:\s*\d/, 'x key'],
  [/trGet|TR\[/, 'tr'],
  [/\bss\b/, 'ss'],
  [/\bsay\b|\bsayq\b/, 'say'],
  [/\bhook\b/, 'hook'],
  [/\bkey\b.*tr|tr.*\bkey\b/, 'tr.key'],
];
lines.forEach((l, i) => {
  if (i > 661 && i < 665) return; // skip bank blob
  pats.forEach(([p, label]) => {
    if (p.test(l)) out.push('[' + label + '] L' + (i + 1) + ': ' + l.trim().slice(0, 300));
  });
});
fs.writeFileSync(path.join(DIR, '_audit', 'fields.txt'), out.join('\n'));
console.log('hits: ' + out.length);
