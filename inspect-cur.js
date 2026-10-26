'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
function load(p) {
  const h = fs.readFileSync(path.join(DIR, p), 'utf8');
  const m = h.match(/<script type="application\/json" id="bank">([\s\S]*?)<\/script>/);
  return JSON.parse(m[1]);
}
const cur = load('interview-box.html');
console.log('CURRENT count', cur.length);
console.log('keys:', JSON.stringify(cur.reduce((a, o) => { Object.keys(o).forEach(k => a[k] = (a[k] || 0) + 1); return a; }, {})));
const srcs = {};
cur.forEach(o => { srcs[o.src] = (srcs[o.src] || 0) + 1; });
console.log('src dist:');
Object.keys(srcs).forEach(k => console.log('  ' + srcs[k] + '  ' + k));
// one sample per src
const seen = {};
cur.forEach(o => { if (!seen[o.src]) { seen[o.src] = 1; console.log('--- ' + o.src + ' ---'); console.log(JSON.stringify(o, null, 1).slice(0, 900)); } });
console.log('=== id dupes:', cur.length - new Set(cur.map(o => o.id)).size);
const qn = cur.map(o => String(o.q).toLowerCase().replace(/\s+/g, ' ').trim());
const seen2 = {};
qn.forEach(q => seen2[q] = (seen2[q] || 0) + 1);
const dup = Object.keys(seen2).filter(k => seen2[k] > 1);
console.log('=== dup question texts:', dup.length, JSON.stringify(dup.slice(0, 10)));
console.log('=== id samples:', JSON.stringify(cur.slice(0, 10).map(o => o.id)));
console.log('=== id prefix dist:', JSON.stringify(cur.reduce((a, o) => { const k = String(o.id).split('-')[0]; a[k] = (a[k] || 0) + 1; return a; }, {})));
