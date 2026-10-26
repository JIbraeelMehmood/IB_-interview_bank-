'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const FILES = [
  'Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md',
  'Interview Prep Roman Urdu Version (Poori Guide).md',
  'Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md',
  'Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md',
  'Roman Urdu v2 (Modern Dev Style).md',
  'Senior PHP Laravel Interview 5 Server Questions + Top25 (Roman Urdu Answers).md',
  'Senior PHP Laravel Interview 5 Server Questions + Top25 (Roman Urdu Answers-2.md',
  'Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md',
  'Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md'
];

const QMARK = /^(\*\*)\s*([A-Z]{0,3})(\d+)\.\s*/;

for (const f of FILES) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) { console.log('MISSING: ' + f); continue; }
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const headings = [];
  const tags = {};
  const nums = [];
  let inline = 0, block = 0, noClose = 0, fences = 0, tables = 0, bullets = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^```/.test(t)) { inFence = !inFence; fences++; continue; }
    if (inFence) continue;
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) { headings.push('  ' + '  '.repeat(h[1].length - 1) + h[1].length + ': ' + h[2].slice(0, 70)); continue; }
    if (/^\|/.test(t)) { tables++; continue; }
    const m = QMARK.exec(t);
    if (m) {
      tags[m[2] || '(none)'] = (tags[m[2] || '(none)'] || 0) + 1;
      nums.push(m[2] + m[3]);
      const rest = lines[i].slice(m[0].length);
      const close = rest.indexOf('**');
      const after = close >= 0 ? rest.slice(close + 2) : rest;
      if (close < 0) noClose++;
      if (/^\s*(?:A|Answer|Jawab)\s*:/i.test(after)) inline++;
      else if (after.trim()) block++;
    }
    if (/^[-*]\s+/.test(t)) bullets++;
  }
  console.log('='.repeat(90));
  console.log('FILE: ' + f);
  console.log('  lines=' + lines.length + ' headings=' + headings.length + ' tags=' + JSON.stringify(tags) + ' fences=' + fences);
  console.log('  inlineAns=' + inline + ' otherInline=' + block + ' noCloseBold=' + noClose + ' tableLines=' + tables + ' bulletLines=' + bullets);
  console.log('  numRange: ' + (nums[0] || '-') + ' .. ' + (nums[nums.length - 1] || '-'));
  console.log('  HEADINGS:');
  headings.slice(0, 80).forEach(h => console.log('   ' + h));
  if (headings.length > 80) console.log('   ... +' + (headings.length - 80) + ' more');
}
