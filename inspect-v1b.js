'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
function load(p) {
  const h = fs.readFileSync(path.join(DIR, p), 'utf8');
  const m = h.match(/<script type="application\/json" id="bank">([\s\S]*?)<\/script>/);
  return JSON.parse(m[1]);
}
const v1 = load('v1-interview-box/interview-box.html');
console.log('V1 count', v1.length);
const keys = {};
v1.forEach(o => Object.keys(o).forEach(k => keys[k] = (keys[k] || 0) + 1));
console.log('key freq:', JSON.stringify(keys));
const dist = f => JSON.stringify(v1.reduce((a, o) => { a[f(o)] = (a[f(o)] || 0) + 1; return a; }, {}));
console.log('l dist:', dist(o => o.l));
console.log('s dist:', dist(o => o.s));
console.log('t dist:', dist(o => JSON.stringify(o.t)));
console.log('p dist:', dist(o => o.p));
console.log('tr present:', v1.filter(o => o.tr).length);
console.log('id samples:', JSON.stringify(v1.slice(0, 15).map(o => o.id)));
console.log('id dupes:', v1.length - new Set(v1.map(o => o.id)).size);
console.log('q samples:', JSON.stringify(v1.slice(0, 5).map(o => o.q)));
console.log('a sample:', JSON.stringify(v1[0].a).slice(0, 500));
console.log('tr sample:', JSON.stringify(v1.filter(o => o.tr)[0]).slice(0, 600));
console.log('f samples:', JSON.stringify(v1.slice(0, 10).map(o => o.f)));
console.log('c samples:', JSON.stringify(v1.slice(0, 10).map(o => o.c)));
// duplicate question text?
const qn = v1.map(o => String(o.q).toLowerCase().replace(/\s+/g, ' ').trim());
const seen = {};
qn.forEach(q => seen[q] = (seen[q] || 0) + 1);
const dupQ = Object.keys(seen).filter(k => seen[k] > 1);
console.log('duplicate question texts:', dupQ.length, JSON.stringify(dupQ.slice(0, 5)));
// id prefixes
const pre = {};
v1.forEach(o => { const k = String(o.id).split('-')[0]; pre[k] = (pre[k] || 0) + 1; });
console.log('id prefix dist:', JSON.stringify(pre));
