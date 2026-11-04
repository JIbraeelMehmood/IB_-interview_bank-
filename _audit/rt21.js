'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '..');
const out = [];
const hc = fs.readFileSync(path.join(DIR, 'interview-box.html'), 'utf8');
const mc = hc.match(/<script[^>]*id=["']bank["'][^>]*>([\s\S]*?)<\/script>/);
const appc = hc.slice(0, mc.index) + hc.slice(mc.index + mc[0].length);
const RAW = JSON.parse(mc[1]);

out.push('EMBEDDED BANK records = ' + RAW.length);
out.push('embedded keys union = ' + JSON.stringify([...new Set(RAW.flatMap(o => Object.keys(o)))].sort()));

// field distributions
function dist(field) {
  const d = {};
  RAW.forEach(o => { const v = o[field] === undefined ? '<undefined>' : JSON.stringify(o[field]); d[v] = (d[v] || 0) + 1; });
  out.push('\n--- ' + field + ' ---');
  Object.keys(d).sort((a, b) => d[b] - d[a]).forEach(k => out.push('  ' + d[k] + '  ' + k));
}
['l', 'p', 's', 'f', 'c', 'x'].forEach(dist);
dist('t');
out.push('\n--- has tr ---\n  with tr: ' + RAW.filter(o => o.tr).length);
out.push('--- has ex ---\n  with ex: ' + RAW.filter(o => o.ex).length);
out.push('--- has src ---\n  with src: ' + RAW.filter(o => o.src).length);
out.push('--- has lvl ---\n  with lvl: ' + RAW.filter(o => o.lvl).length);
out.push('--- has priority ---\n  with priority: ' + RAW.filter(o => o.priority).length);

// where is q.raw set?
out.push('\n=== "q.raw=" / ".raw=" assignments ===');
const rx = /\.raw\s*=/g; let m, c = 0;
while ((m = rx.exec(appc)) !== null && c < 10) { out.push('  @' + m.index + ': ' + appc.slice(Math.max(0, m.index - 140), m.index + 140).replace(/\n/g, '\\n')); c++; }
out.push('  TOTAL .raw= = ' + (appc.match(/\.raw\s*=/g) || []).length);

// q.x usage
out.push('\n=== q.x / o.x usage ===');
const rx2 = /[qo]\.x\b/g; c = 0;
while ((m = rx2.exec(appc)) !== null && c < 14) { out.push('  @' + m.index + ': ' + appc.slice(Math.max(0, m.index - 130), m.index + 130).replace(/\n/g, '\\n')); c++; }

// q.f usage (flag chips)
out.push('\n=== q.f usage (flag) ===');
const rx3 = /[qo]\.f\b/g; c = 0;
while ((m = rx3.exec(appc)) !== null && c < 14) { out.push('  @' + m.index + ': ' + appc.slice(Math.max(0, m.index - 130), m.index + 130).replace(/\n/g, '\\n')); c++; }

// q.l usage
out.push('\n=== q.l usage (level) ===');
const rx4 = /[qo]\.l\b/g; c = 0;
while ((m = rx4.exec(appc)) !== null && c < 14) { out.push('  @' + m.index + ': ' + appc.slice(Math.max(0, m.index - 130), m.index + 130).replace(/\n/g, '\\n')); c++; }

fs.writeFileSync(path.join(DIR, '_audit', 'rt22.txt'), out.join('\n'));
console.log('OK');

