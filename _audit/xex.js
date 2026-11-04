'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];

// --- runtime usages of .x and .ex on question objects ---
const html = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const lines = html.split('\n');
out.push('=== runtime .x / .ex usage (app code lines 663-4030) ===');
lines.forEach((l, i) => {
  if (i < 662 || i > 4030) return;
  if (/\.ex\b/.test(l) || /\.x\b/.test(l) || /['"]ex['"]|ex:/.test(l)) {
    out.push('L' + (i + 1) + ': ' + l.trim().slice(0, 260));
  }
});

// --- v1 bank: examples of x=1 and records with ex ---
const v1 = fs.readFileSync(path.join(DIR, 'v1-interview-box', 'interview-box.html'), 'utf8');
const m = v1.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const bank = JSON.parse(m[1].trim());
out.push('\n=== v1 records with x=1 ===');
bank.filter(r => r.x === 1).slice(0, 4).forEach(r => out.push(JSON.stringify(r).slice(0, 700)));
out.push('\n=== v1 records with ex ===');
bank.filter(r => r.ex).slice(0, 4).forEach(r => out.push(JSON.stringify(r).slice(0, 900)));
out.push('\n=== v1 records with tr ===');
bank.filter(r => r.tr).slice(0, 3).forEach(r => out.push(JSON.stringify(r).slice(0, 900)));

fs.writeFileSync(path.join(DIR, '_audit', 'xex.txt'), out.join('\n'));
console.log('ok');
