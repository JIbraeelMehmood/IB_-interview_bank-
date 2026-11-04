'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const pats = [
  [/\.x\s*===?\s*1/, 'x===1'],
  [/\.x\s*\?/, 'x truthy'],
  [/\bx\s*:\s*1\b/, 'x:1'],
  [/ans.*innerHTML|innerHTML.*ans/, 'ans render'],
  [/\.ans\b/, 'q.ans'],
  [/class="ans/, 'ans el'],
  [/prose\(/, 'prose'],
  [/innerHTML=q\.a|q\.a\)/, 'a render'],
];
lines.forEach((l, i) => {
  if (i === 661) return;
  pats.forEach(([p, label]) => {
    if (p.test(l)) out.push('[' + label + '] L' + (i + 1) + ': ' + l.trim().slice(0, 300));
  });
});
out.push('\n===== lines 975-1010 (card answer render) =====');
for (let i = 974; i < 1012; i++) out.push((i + 1) + '| ' + lines[i]);
fs.writeFileSync(path.join(DIR, '_audit', 'xrender.txt'), out.join('\n'));
console.log('ok');
