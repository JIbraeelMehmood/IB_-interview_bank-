'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
function show(a, b, tag) {
  out.push('\n===== ' + tag + ' =====');
  for (let i = a - 1; i < b && i < lines.length; i++) out.push((i + 1) + '| ' + lines[i]);
}
show(1645, 1700, 'renderABody');
// find prose()
lines.forEach((l, i) => { if (/function prose/.test(l)) show(i + 1, i + 8, 'prose'); });
// TR definition
lines.forEach((l, i) => { if (/var TR\s*=/.test(l) || /TR\s*=\s*\{\}/.test(l)) show(i + 1, i + 12, 'TR def L' + (i + 1)); });
fs.writeFileSync(path.join(DIR, '_audit', 'abody.txt'), out.join('\n'));
console.log('ok');
