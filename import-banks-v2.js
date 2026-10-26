/**
 * Interview Box — Import Script (v2)
 * Reads the question bank markdown files and generates a JSON file
 * compatible with Interview Box's localStorage state format.
 *
 * Interview Box state format:
 *   QS = [{ id, q, a, t, lvl, s, src }]
 *   QMAP = { id: questionObject }
 *   S.ai = QS (AI-generated questions)
 *   S.my = QS (user questions)
 *
 * Format discovered from source files:
 *   **Q12. Question text?** Answer: ...
 *   **Q13. Question text?** Answer: ...
 */

const fs = require('fs');
const path = require('path');

const BANK_DIR = __dirname;

// Match **Q12. Question?** Answer: ...
const LINE_RE = /^(\*\*Q\d+\.\s*.*?[?।])\s*(Answer:)?\s*([\s\S]*?)(?=\n\n\*\*|#\d+\.|\n\n\n|$)/gm;

function parseBank(filePath, tags) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');

  let m;
  while ((m = LINE_RE.exec(content)) !== null) {
    const [full, question, answerMarker, answerText] = m;
    const q = question.replace(/\*\*/g, '').trim();
    const a = (answerText || '').trim();

    if (q.length > 10 && a.length > 5) {
      questions.push({
        id: q.slice(0, 80),
        q,
        a,
        t: tags || ['bank', 'qa'],
        lvl: 'mixed',
        s: 'my',
        src: source
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

function generateImportJSON() {
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
      console.log(`⚠ Missing: ${file}`);
      continue;
    }
    let qList = parserFn(filePath);
    console.log(`✓ ${file}: ${qList.length} questions`);
    allQuestions.push(...qList);
    sources[file] = qList.length;
  }

  console.log(`\nTotal: ${allQuestions.length} questions across ${Object.keys(sources).length} files`);

  // Deduplicate by id
  const seen = new Set();
  const unique = allQuestions.filter(q => {
    const key = q.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`After dedup: ${unique.length} unique questions`);

  return JSON.stringify({
    version: '1.0',
    source: 'interview-box-banks-import',
    generated: new Date().toISOString(),
    questions: unique
  }, null, 2);
}

// Write to file
const output = generateImportJSON();
fs.writeFileSync(path.join(BANK_DIR, 'interview-box-banks-import.json'), output);
console.log('\n✓ Written to: interview-box-banks-import.json');
