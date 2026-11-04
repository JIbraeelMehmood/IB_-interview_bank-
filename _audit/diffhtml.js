'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];

function splitBank(file) {
  const h = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = h.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { head: h, bank: null, tail: '' };
  return { head: h.slice(0, m.index), bank: m[1], tail: h.slice(m.index + m[0].length) };
}
const cur = splitBank('interview-box.html');
const v1 = splitBank('v1-interview-box/interview-box.html');
out.push('cur head len ' + cur.head.length + ' tail len ' + cur.tail.length);
out.push('v1  head len ' + v1.head.length + ' tail len ' + v1.tail.length);
out.push('cur.bank raw len ' + cur.bank.length);
out.push('v1.bank raw len ' + v1.bank.length);
out.push('cur head === v1 head ? ' + (cur.head === v1.head));
out.push('cur tail === v1 tail ? ' + (cur.tail === v1.tail));
// first difference position in head
let i = 0;
while (i < Math.min(cur.head.length, v1.head.length) && cur.head[i] === v1.head[i]) i++;
out.push('head first diff at ' + i);
out.push('cur  : ' + JSON.stringify(cur.head.slice(Math.max(0, i - 120), i + 200)));
out.push('v1   : ' + JSON.stringify(v1.head.slice(Math.max(0, i - 120), i + 200)));
let j = 0;
while (j < Math.min(cur.tail.length, v1.tail.length) && cur.tail[j] === v1.tail[j]) j++;
out.push('tail first diff at ' + j);
out.push('cur tail: ' + JSON.stringify(cur.tail.slice(Math.max(0, j - 200), j + 300)));
out.push('v1  tail: ' + JSON.stringify(v1.tail.slice(Math.max(0, j - 200), j + 300)));

// does current file's app code (non-bank) equal v1's?
const curLines = cur.head.split('\n').length, v1Lines = v1.head.split('\n').length;
out.push('cur head lines ' + curLines + ' v1 head lines ' + v1Lines);
out.push('cur tail lines ' + cur.tail.split('\n').length + ' v1 tail lines ' + v1.tail.split('\n').length);
fs.writeFileSync(path.join(DIR, '_audit', 'diffhtml.txt'), out.join('\n'));
console.log('ok');
