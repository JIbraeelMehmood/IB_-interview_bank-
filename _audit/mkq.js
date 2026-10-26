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
show(940, 982, 'openCard + renderABody');
show(697, 775, 'BASE_TECHS + TECHS');
show(662, 663, 'bank tag');
fs.writeFileSync(path.join(DIR, '_audit', 'mkq.txt'), out.join('\n'));
console.log('ok');
