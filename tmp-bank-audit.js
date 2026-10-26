'use strict';
/* Diagnostic: inventory the bank embedded in interview-box.html */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function loadBank(htmlFile) {
  const h = fs.readFileSync(path.join(DIR, htmlFile), 'utf8');
  const m = h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no bank script in ' + htmlFile);
  return JSON.parse(m[1].trim());
}

const file = process.argv[2] || 'interview-box.html';
const bank = loadBank(file);
console.log('file:', file);
console.log('records:', bank.length);
console.log('keys of first:', Object.keys(bank[0]).join(','));
console.log('sample[0]:', JSON.stringify(bank[0]).slice(0, 400));

const tally = (key) => {
  const o = {};
  bank.forEach(r => { const v = r[key] === undefined ? '(none)' : String(r[key]); o[v] = (o[v] || 0) + 1; });
  return o;
};
console.log('lvl:', JSON.stringify(tally('lvl')));
console.log('src:', JSON.stringify(tally('src')));
console.log('priority:', JSON.stringify(tally('priority')));
console.log('f:', JSON.stringify(tally('f')));
const trk = {};
bank.forEach(r => { if (r.tr) { const k = Object.keys(r.tr).join('+'); trk[k] = (trk[k] || 0) + 1; } });
console.log('tr key sets:', JSON.stringify(trk));
console.log('with tr:', bank.filter(r => r.tr).length, '/', bank.length);

const ids = new Set(); const dups = [];
bank.forEach(r => { if (ids.has(r.id)) dups.push(r.id); ids.add(r.id); });
console.log('unique ids:', ids.size, 'dup ids:', dups.length, JSON.stringify(dups.slice(0, 20)));

const qtext = new Map(); const qdups = [];
bank.forEach(r => {
  const k = String(r.q || '').trim().toLowerCase();
  if (qtext.has(k)) qdups.push([qtext.get(k), r.id, r.id]);
  else qtext.set(k, r.id);
});
console.log('duplicate question texts:', qdups.length, JSON.stringify(qdups.slice(0, 20)));

const empty = bank.filter(r => !r.q || !String(r.q).trim());
console.log('records with empty q:', empty.length, JSON.stringify(empty.slice(0, 10).map(r => r.id)));
const noAns = bank.filter(r => !r.a || !String(r.a).trim());
console.log('records with empty a:', noAns.length, JSON.stringify(noAns.slice(0, 10).map(r => r.id)));
