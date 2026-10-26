'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];
function bankOf(file) {
  const html = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = html.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch (e) { return 'PARSE_ERR ' + e.message; }
}
const files = ['interview-box.html', 'v1-interview-box/interview-box.html'];
const banks = {};
for (const f of files) {
  const b = bankOf(f);
  out.push('=== ' + f + ' ===');
  if (!b) { out.push('no bank tag'); continue; }
  if (typeof b === 'string') { out.push(b); continue; }
  banks[f] = b;
  out.push('records: ' + b.length);
  const keys = {};
  b.forEach(r => Object.keys(r).forEach(k => keys[k] = (keys[k] || 0) + 1));
  out.push('key freq: ' + JSON.stringify(keys));
  out.push('sample: ' + JSON.stringify(b[0]).slice(0, 900));
  out.push('sampleLast: ' + JSON.stringify(b[b.length - 1]).slice(0, 600));
  const lvlT = {}, sT = {}, pT = {}, fT = {}, xT = {};
  b.forEach(r => {
    lvlT[r.l] = (lvlT[r.l] || 0) + 1;
    sT[r.s] = (sT[r.s] || 0) + 1;
    pT[r.p] = (pT[r.p] || 0) + 1;
    fT[r.f] = (fT[r.f] || 0) + 1;
    xT[r.x] = (xT[r.x] || 0) + 1;
  });
  out.push('l: ' + JSON.stringify(lvlT));
  out.push('s: ' + JSON.stringify(sT));
  out.push('p: ' + JSON.stringify(pT).slice(0, 1200));
  out.push('f: ' + JSON.stringify(fT));
  out.push('x: ' + JSON.stringify(xT));
  out.push('has tr: ' + b.filter(r => r.tr).length + '  has ex: ' + b.filter(r => r.ex).length);
}
fs.writeFileSync(path.join(DIR, '_audit', 'cmp.txt'), out.join('\n'));
console.log('ok');
