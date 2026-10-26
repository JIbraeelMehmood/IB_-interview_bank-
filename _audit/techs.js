'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];

// 1) stripped app bank
try {
  const h = fs.readFileSync(path.join(DIR, '.tmp-app-stripped.html'), 'utf8');
  const m = h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    const b = JSON.parse(m[1].trim());
    out.push('stripped bank records: ' + b.length);
    const keys = {}; b.forEach(r => Object.keys(r).forEach(k => keys[k] = (keys[k] || 0) + 1));
    out.push('keys: ' + JSON.stringify(keys));
    out.push('sample: ' + JSON.stringify(b[0]).slice(0, 500));
  } else out.push('stripped: no bank tag');
} catch (e) { out.push('stripped err ' + e.message); }

// 2) BASE_TECHS in app
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const m2 = html.match(/var BASE_TECHS\s*=\s*(\[[\s\S]*?\]);/);
if (m2) {
  out.push('\nBASE_TECHS raw length ' + m2[1].length);
  out.push(m2[1].slice(0, 4000));
}
fs.writeFileSync(path.join(DIR, '_audit', 'techs.txt'), out.join('\n'));
console.log('ok');
