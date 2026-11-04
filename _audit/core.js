'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
const out = [];
function show(a, b, tag) {
  out.push('\n===== ' + tag + ' (L' + a + '-' + b + ') =====');
  for (let i = a - 1; i < b && i < lines.length; i++) out.push((i + 1) + '| ' + lines[i]);
}
show(660, 664, 'bank tag');
show(770, 830, 'state/techs/buildBank');
show(878, 935, 'filterQs/renderList');
fs.writeFileSync(path.join(DIR, '_audit', 'core.txt'), out.join('\n'));
console.log('ok');
