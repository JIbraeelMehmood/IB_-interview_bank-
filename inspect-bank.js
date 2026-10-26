'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const h = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const m = h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.log('NO BANK TAG'); process.exit(0); }
const j = JSON.parse(m[1]);
console.log('count', j.length);
console.log('keys of first', Object.keys(j[0]));
console.log('first record:', JSON.stringify(j[0], null, 1).slice(0, 1200));
const cats = {}, lv = {}, src = {}, flags = {};
j.forEach(o => {
  cats[o.p] = (cats[o.p] || 0) + 1;
  lv[o.l] = (lv[o.l] || 0) + 1;
  src[o.s] = (src[o.s] || 0) + 1;
  flags[o.f] = (flags[o.f] || 0) + 1;
});
console.log('levels', lv);
console.log('src', src);
console.log('flags', flags);
console.log('cats', cats);
console.log('has tr count', j.filter(o => o.tr).length);
console.log('id samples', j.slice(0, 4).map(o => o.id), '...', j.slice(-4).map(o => o.id));
const ids = j.map(o => o.id);
console.log('unique ids', new Set(ids).size);
// check for tr shape
const withTr = j.find(o => o.tr);
if (withTr) console.log('tr sample', JSON.stringify(withTr.tr).slice(0, 600));
// check keys union
const keys = new Set();
j.forEach(o => Object.keys(o).forEach(k => keys.add(k)));
console.log('all keys', [...keys]);
// bank script tag context
const idx = h.indexOf('id="bank"');
console.log('--- bank tag context ---');
console.log(h.slice(idx - 200, idx + 120));
console.log('--- bank end context ---');
const endIdx = h.indexOf('</script>', idx);
console.log(h.slice(endIdx - 200, endIdx + 200));
