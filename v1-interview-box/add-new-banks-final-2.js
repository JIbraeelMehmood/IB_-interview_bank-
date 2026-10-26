const fs = require('fs');
const path = require('path');

const BANK_DIR = __dirname;
const OUTPUT_FILE = path.join(BANK_DIR, 'interview-box-banks-clean.json');

let existing = { total: 0, questions: [] };
if (fs.existsSync(OUTPUT_FILE)) {
  try { existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')); } catch(e) {}
}

function cleanQ(text) {
  return text.replace(/\*/g, '').trim();
}

function cleanA(text) {
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/^\d+\.\s*/gm, '');
  text = text.replace(/^[#>*\-\u2013—]+\s*/gm, '');
  text = text.replace(/\*/g, '');
  return text.trim();
}

function parseScenarios(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const questions = [];
  const source = path.basename(filePath, '.md');
  let si = 0;
  while (si < lines.length) {
    const line = lines[si].trim();
    const m = line.match(/^\*\*Q(\d+)\.\s*(.*?)\*\*\s*$/);
    if (m) {
      const id = m[1];
      const q = cleanQ(m[2]);
      let j = si + 1;
      const answerParts = [];
      while (j < lines.length) {
        const nxt = lines[j].trim();
        // Break if: next Q question, next section heading, or code fence
        if (/^### Q\d+\.|^## /m.test(nxt)) break;
        if (/^\*\*Q\d+\./m.test(nxt)) break; // New question heading
        if (nxt.startsWith('```')) {
          while (j < lines.length && !lines[j].trim().startsWith('```')) j++;
          j++;
          continue;
        }
        if (nxt && !nxt.startsWith('**Q') && !nxt.startsWith('**F') && nxt !== 'Answer:') {
          answerParts.push(lines[j]);
        }
        j++;
      }
      const a = cleanA(answerParts.join('\n'));
      if (q.length > 10 && a.length > 5) {
        questions.push({ id: 'sc_' + id, q, a, t: ['laravel', 'production', 'scenario', 'docker', 'data', 'senior'], lvl: 'senior', s: 'my', src: 'Senior Laravel Production Scenarios', priority: 3 });
      }
      si = j;
    } else {
      si++;
    }
  }
  return questions;
}

function parseFailureFirst(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const questions = [];
  const source = path.basename(filePath, '.md');
  let fi = 0;
  while (fi < lines.length) {
    const line = lines[fi].trim();
    let id, q;
    const m1 = line.match(/^\*\*(F\d+)\.\s*"((?:[^"]|"")*)"\*\*/);
    const m2 = line.match(/^\*\*(F\d+)\.\s*([^`]*?)\*\*(?:\s*Answer:)?$/);
    const m3 = line.match(/^\*\*(F\d+)\.\s*(.*?)\*\*\s*Answer:/);
    if (m1) { id = m1[1]; q = cleanQ(m1[2]); }
    else if (m2) { id = m2[1]; q = cleanQ(m2[2]); }
    else if (m3) { id = m3[1]; q = cleanQ(m3[2]); }
    else { fi++; continue; }
    let j = fi + 1;
    const answerParts = [];
    while (j < lines.length) {
      const nxt = lines[j].trim();
      if (/^### F\d+\.|^#|^##/m.test(nxt)) break;
      if (/^\*\*F\d+\./m.test(nxt)) break; // New F question
      if (nxt && !nxt.startsWith('**F') && !nxt.startsWith('**Q') && nxt !== 'Answer:') {
        answerParts.push(lines[j]);
      }
      j++;
    }
    const a = cleanA(answerParts.join('\n'));
    if (q.length > 10 && a.length > 5) {
      questions.push({ id: 'f_' + id, q, a, t: ['failure-first', 'production', 'resilience', 'php', 'laravel', 'backend'], lvl: 'senior', s: 'my', src: 'Failure-First Backend Interview', priority: 3 });
    }
    fi = j;
  }
  return questions;
}

const files = {
  'Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md': parseScenarios,
  'Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md': parseFailureFirst
};

const allNew = [];
const sources = {};

for (const [file, parserFn] of Object.entries(files)) {
  const filePath = path.join(BANK_DIR, file);
  if (!fs.existsSync(filePath)) { console.log('Missing: ' + file); continue; }
  const qList = parserFn(filePath);
  console.log('OK ' + file + ': ' + qList.length + ' questions');
  allNew.push(...qList);
  sources[file] = qList.length;
}

if (allNew.length === 0) {
  console.log('No new questions found. Exiting.');
  process.exit(0);
}

const existingIds = new Set(existing.questions.map(q => q.id));
const merged = [...existing.questions];
let added = 0;
for (const q of allNew) {
  if (!existingIds.has(q.id)) {
    merged.push(q);
    existingIds.add(q.id);
    added++;
  }
}

const output = {
  version: '1.1',
  source: 'interview-box-banks-clean',
  generated: new Date().toISOString(),
  total: merged.length,
  files: { ...existing.files, ...sources },
  questions: merged
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
console.log('Total after merge:', merged.length);
console.log('Added:', added);
