const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const FILES = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
FILES.forEach(f => {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = text.split('\n');
  const marks = {};
  const samples = {};
  lines.forEach((l, i) => {
    const t = l.trim();
    // all "bold-ish" leading markers
    const m = /^\*\*\s*([A-Za-z]{0,4}\d+)\s*\.?\s*[:.)-]?\s*/.exec(t);
    const m2 = /^#{1,6}\s+.*?([A-Za-z]{1,4}\d+)\b/.exec(t);
    let key = null;
    if (m) key = m[1];
    else if (m2) key = m2[1];
    if (!key) return;
    const pre = key.replace(/\d+$/, '');
    if (!/^[A-Za-z]{0,4}$/.test(pre)) return;
    marks[pre] = (marks[pre] || 0) + 1;
    if (!samples[pre]) samples[pre] = (i + 1) + ': ' + t.slice(0, 120);
  });
  console.log('=== ' + f);
  Object.keys(marks).forEach(k => console.log('   marker "' + k + '" x' + marks[k] + '   ' + samples[k]));
});
