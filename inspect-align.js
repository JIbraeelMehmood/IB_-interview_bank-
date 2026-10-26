'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const FILES = {
  EN: 'Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md',
  RU1: 'Interview Prep Roman Urdu Version (Poori Guide).md',
  RU2: 'Roman Urdu v2 (Modern Dev Style).md',
  SEN: 'Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md',
  LVL: 'Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md',
  PRI: 'Question Priority Map by Level (Junior, Mid, 4-Year, Senior) for the PITB ITOPS Job.md',
  TOP25: 'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers).md',
  TOP25B: 'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md',
  SCN: 'Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md',
  FAIL: 'Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md'
};

const QMARK = /^(\*\*)\s*([A-Z]{0,3})(\d+)\.\s*/;

function scan(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const lines = text.split('\n');
  const out = [];
  let heading = '', hLevel = 0, fence = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^```/.test(t)) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) { heading = h[2]; hLevel = h[1].length; continue; }
    const m = QMARK.exec(t);
    if (m) out.push({ tag: m[2], num: parseInt(m[3], 10), line: i + 1, heading: heading, hLevel: hLevel, raw: t });
  }
  return out;
}

const res = {};
Object.keys(FILES).forEach(k => {
  if (!fs.existsSync(path.join(DIR, FILES[k]))) { console.log('MISSING ' + k); return; }
  res[k] = scan(FILES[k]);
  console.log('=== ' + k + ' (' + FILES[k] + ') count=' + res[k].length);
  // group by heading
  const groups = [];
  res[k].forEach(q => {
    const g = groups[groups.length - 1];
    if (!g || g.heading !== q.heading) groups.push({ heading: q.heading, hLevel: q.hLevel, from: q.num, to: q.num, count: 1, tag: q.tag });
    else { g.to = q.num; g.count++; }
  });
  groups.forEach(g => console.log('   ' + g.tag + (g.tag ? ' ' : '') + '[' + g.from + '-' + g.to + '] x' + g.count + '  h' + g.hLevel + '  ' + g.heading.slice(0, 60)));
});
// alignment: EN vs RU1 vs RU2 by number
function byNum(arr) { const m = {}; arr.forEach(q => { if (!m[q.num]) m[q.num] = q; }); return m; }
const en = byNum(res.EN), ru1 = byNum(res.RU1), ru2 = byNum(res.RU2);
console.log('--- EN vs RU1 numeric overlap ---');
const enNums = Object.keys(en).map(Number).sort((a, b) => a - b);
const ru1Nums = Object.keys(ru1).map(Number).sort((a, b) => a - b);
console.log('EN range', enNums[0], '-', enNums[enNums.length - 1], 'count', enNums.length);
console.log('RU1 range', ru1Nums[0], '-', ru1Nums[ru1Nums.length - 1], 'count', ru1Nums.length);
let match = 0, headMatch = 0;
enNums.forEach(n => { if (ru1[n]) { match++; if (en[n].heading === ru1[n].heading) headMatch++; } });
console.log('number overlap EN/RU1:', match, ' heading-identical:', headMatch);
let m2 = 0, h2 = 0;
enNums.forEach(n => { if (ru2[n]) { m2++; if (en[n].heading === ru2[n].heading) h2++; } });
console.log('number overlap EN/RU2:', m2, ' heading-identical:', h2);
console.log('--- sample EN/RU1/RU2 for n=1,12,13,50,120,186 ---');
[1, 12, 13, 50, 120, 186].forEach(n => {
  console.log('n=' + n);
  ['EN', 'RU1', 'RU2'].forEach(k => {
    const s = res[k].filter(x => x.num === n);
    if (s.length) console.log('   ' + k + ' [' + s.length + '] ' + s[0].raw.slice(0, 110));
  });
});
