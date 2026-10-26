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
console.log('--- V1 entries WITH tr ---');
v1.filter(o => o.tr).forEach(o => {
  console.log(JSON.stringify(o).slice(0, 700));
  console.log('---');
});
console.log('--- V1 entries WITH ex ---');
v1.filter(o => o.ex).slice(0, 5).forEach(o => console.log(JSON.stringify(o).slice(0, 400)));
console.log('--- V1 x distribution ---');
console.log(JSON.stringify(v1.reduce((a, o) => { a[o.x] = (a[o.x] || 0) + 1; return a; }, {})));
console.log('--- V1 ids sample per prefix ---');
const byPre = {};
v1.forEach(o => { const k = o.id.split('-')[0]; if (!byPre[k]) byPre[k] = o; });
Object.keys(byPre).forEach(k => console.log('  ' + k + ' -> ' + byPre[k].id + ' | p=' + byPre[k].p + ' | l=' + byPre[k].l + ' | s=' + byPre[k].s + ' | c=' + byPre[k].c + ' | q=' + String(byPre[k].q).slice(0, 70)));
