'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

function extractBank(htmlPath) {
  const t = fs.readFileSync(htmlPath, 'utf-8');
  const m = t.match(/<script[^>]*\bid="bank"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  return { raw: m[1], json: JSON.parse(m[1]) };
}

const target = process.argv[2] || path.join(DIR, 'interview-box.html');
const res = extractBank(target);
if (!res) { console.log('NO BANK in ' + target); process.exit(1); }
const B = res.json;
const arr = Array.isArray(B) ? B : (B.questions || B.qs || []);
console.log('file:', path.basename(target));
console.log('raw len:', res.raw.length);
console.log('type:', Array.isArray(B) ? 'array' : typeof B);
console.log('top keys:', Array.isArray(B) ? '(array)' : JSON.stringify(Object.keys(B)));
console.log('count:', arr.length);
const keys = {};
arr.forEach(r => Object.keys(r).forEach(k => { keys[k] = (keys[k] || 0) + 1; }));
console.log('record keys:', JSON.stringify(keys, null, 1));
console.log('--- sample 0 ---');
console.log(JSON.stringify(arr[0], null, 1).slice(0, 2000));
if (arr.length > 1) {
  console.log('--- sample 1 ---');
  console.log(JSON.stringify(arr[1], null, 1).slice(0, 1200));
}
