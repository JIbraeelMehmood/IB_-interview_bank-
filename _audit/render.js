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
show(936, 975, 'card expand / renderABody');
show(664, 700, 'md() + helpers');
fs.writeFileSync(path.join(DIR, '_audit', 'render.txt'), out.join('\n'));
console.log('ok');
