'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));
for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = text.split('\n');
  out.push('\n########## ' + f + ' (' + lines.length + ' lines) ##########');
  // headings
  out.push('--- headings ---');
  lines.forEach((l, i) => { if (/^#{1,6}\s/.test(l)) out.push('  L' + (i + 1) + ': ' + l.slice(0, 110)); });
  // first 30 lines
  out.push('--- first 26 lines ---');
  for (let i = 0; i < Math.min(26, lines.length); i++) out.push('  ' + (i + 1) + '| ' + lines[i].slice(0, 200));
}
fs.writeFileSync(path.join(DIR, '_audit', 'mdheads.txt'), out.join('\n'));
console.log('ok');
