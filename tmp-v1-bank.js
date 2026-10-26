'use strict';
/* Inspect the v1 (original) embedded bank schema */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function loadBank(file) {
  const h = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  return JSON.parse(m[1].trim());
}

const b = loadBank('v1-interview-box/interview-box.html');
if (!b) {
  console.log('no bank in v1');
} else {
  console.log('records:', b.length);
  console.log('keys of first:', Object.keys(b[0]).join(','));
  console.log('sample[0]:', JSON.stringify(b[0]).slice(0, 1200));
  const t = {};
  b.forEach(r => { const k = Object.keys(r).sort().join(','); t[k] = (t[k] || 0) + 1; });
  console.log('shapes:', JSON.stringify(t, null, 1));
  const lv = {};
  b.forEach(r => { lv[r.l] = (lv[r.l] || 0) + 1; });
  console.log('l:', JSON.stringify(lv));
  const lv2 = {};
  b.forEach(r => { lv2[r.lvl] = (lv2[r.lvl] || 0) + 1; });
  console.log('lvl:', JSON.stringify(lv2));
  const s = {};
  b.forEach(r => { s[r.s] = (s[r.s] || 0) + 1; });
  console.log('s:', JSON.stringify(s));
  const f = {};
  b.forEach(r => { f[String(r.f)] = (f[String(r.f)] || 0) + 1; });
  console.log('f:', JSON.stringify(f));
  const p = {};
  b.forEach(r => { p[String(r.p)] = (p[String(r.p)] || 0) + 1; });
  console.log('p (top20):', JSON.stringify(Object.entries(p).sort((a, x) => x[1] - a[1]).slice(0, 20)));
  const tr = b.filter(r => r.tr);
  console.log('with tr:', tr.length);
  if (tr.length) console.log('tr sample:', JSON.stringify(tr[0].tr).slice(0, 700));
}
