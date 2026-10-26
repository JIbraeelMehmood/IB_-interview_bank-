/**
 * Interview Box - Clean Import Script
 * Generates a clean, normalized question bank compatible with the app's state format.
 * Output: interview-box-banks-clean.json
 */

const fs = require('fs');
const path = require('path');

const BANK_DIR = __dirname;

// Clean a question text: remove markdown markers
function cleanQ(text) {
  return text.replace(/\*\*/g, '').trim();
}

// Clean an answer: remove "** A: " prefix if present
function cleanA(text) {
  return text.replace(/^\*\*\s*A:\s*/, '').trim();
}

// Match **Q12. Question?** Answer: ...
const LINE_RE = /^(\*\*Q\d+\.\s*.*?[?।])\s*(Answer:)?\s*([\s\S]*?)(?=\n\n\*\*|#\d+\.|\n\n\n|$)/gm;

function parseBank(filePath, tags) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');
  let count = 0;

  let m;
  while ((m = LINE_RE.exec(content)) !== null) {
    const [full, question, answerMarker, answerText] = m;
    const q = cleanQ(question);
    const a = cleanA(answerText || '');

    if (q.length > 10 && a.length > 5) {
      count++;
      questions.push({
        id: 'q_' + count + '_' + Math.random().toString(36).slice(2, 6),
        q,
        a,
        t: tags || ['bank', 'qa'],
        lvl: 'mixed',
        s: 'my',
        src: source,
        priority: 3
      });
    }
  }

  return questions;
}

function parseLevelBank(filePath) {
  return parseBank(filePath, ['levelwise', 'junior', 'mid', 'senior', 'romanurdu']);
}

function parseSEBank(filePath) {
  return parseBank(filePath, ['pitb', 'railways', 'itops', 'senior', 'laravel']);
}

function parseLaravelBank(filePath) {
  return parseBank(filePath, ['laravel', 'php', 'server', 'nginx', 'fpm']);
}

function generateCleanJSON() {
  const files = {
    'Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md': parseBank,
    'Interview Prep Roman Urdu Version (Poori Guide).md': parseBank,
    'Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md': parseSEBank,
    'Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md': parseLevelBank,
    'Roman Urdu v2 (Modern Dev Style).md': parseBank,
    'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers).md': parseLaravelBank,
    'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md': parseLaravelBank
  };

  const allQuestions = [];
  const sources = {};

  for (const [file, parserFn] of Object.entries(files)) {
    const filePath = path.join(BANK_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log('WA missing: ' + file);
      continue;
    }
    const qList = parserFn(filePath);
    console.log('OK ' + file + ': ' + qList.length + ' questions');
    allQuestions.push(...qList);
    sources[file] = qList.length;
  }

  console.log('\nTotal: ' + allQuestions.length + ' questions across ' + Object.keys(sources).length + ' files');

  // Deduplicate by normalized question text
  const seen = new Set();
  const unique = allQuestions.filter(function(q) {
    const key = q.q.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log('After dedup: ' + unique.length + ' unique questions');

  const output = {
    version: '1.0',
    source: 'interview-box-banks-clean',
    generated: new Date().toISOString(),
    total: unique.length,
    files: sources,
    questions: unique
  };

  return JSON.stringify(output, null, 2);
}

// Write to file
const output = generateCleanJSON();
fs.writeFileSync(path.join(BANK_DIR, 'interview-box-banks-clean.json'), output);
console.log('\nWritten to: interview-box-banks-clean.json');
