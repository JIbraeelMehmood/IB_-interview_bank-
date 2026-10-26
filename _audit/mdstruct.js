'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..');

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md') && !f.startsWith('_') && !/^(IMPORT_GUIDE|QUESTION_BANK_IMPORT_REPORT|INTERVIEW_BOX_ANALYSIS|README_WHISPER)/.test(f));
for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), 'utf-8').split('\n');
  console.log('\n================ ' + f + ' (' + lines.length + ' lines) ================');
  // headings
  const heads = lines.map((l, i) => ({ l, i })).filter(x => /^#{1,4}\s/.test(x.l.trim()));
  console.log('--- headings (' + heads.length + ') ---');
  heads.slice(0, 40).forEach(x => console.log(String(x.i + 1).padStart(5) + ': ' + x.l.trim().slice(0, 110)));
  if (heads.length > 40) console.log('   ... +' + (heads.length - 40) + ' more headings');
  // question-ish markers
  const marks = new Map();
  lines.forEach(l => {
    const t = l.trim();
    const m = /^(\*\*)?([A-Z]{0,4}\d{1,3})[.)]\s+/.exec(t) || /^#{2,4}\s+([A-Z]{0,4}\d{1,3})[.)]?\s/.exec(t);
    if (m && m[2]) { const pre = m[2].replace(/\d+$/, ''); marks.set(pre, (marks.get(pre) || 0) + 1); }
  });
  console.log('--- marker prefixes ---', JSON.stringify([...marks.entries()].slice(0, 40)));
  console.log('--- first 12 non-empty lines ---');
  lines.filter(l => l.trim()).slice(0, 12).forEach(l => console.log('   ' + l.trim().slice(0, 130)));
}
