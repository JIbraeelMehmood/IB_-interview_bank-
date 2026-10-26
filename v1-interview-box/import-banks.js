/**
 * Interview Box — Import Script
 * Reads the question bank markdown files and generates a JSON file
 * compatible with Interview Box's localStorage state format.
 *
 * Interview Box state format (from app code):
 *   QS = [{ id, q, a, t, lvl, s, src }]
 *   QMAP = { id: questionObject }
 *   S.ai = QS (AI-generated questions)
 *   S.my = QS (user questions)
 */

const fs = require('fs');
const path = require('path');

const BANK_DIR = __dirname;

// Extract questions from a markdown file
function parseBank(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');
  
  // Match patterns like: **Q12. Question text.** Answer: ... or **Q12. Question text**  
  // with answer following
  const lineRE = /^(\*\*(Q\d+)\.\s*(.*?)\*\*)\s*[:：]?\s*(Answer:)?\s*(.*?)(?=\n\n\*\*|\n\n##|\n\n\n|$)/gs;
  let m;
  
  while ((m = lineRE.exec(content)) !== null) {
    const [, marker, id, qText, , answer] = m;
    const question = qText.trim();
    const answerText = (answer || '').trim();
    
    if (question.length > 10) {
      questions.push({
        id: id,
        q: question,
        a: answerText,
        t: ['pitb', 'railways', 'itops', 'laravel', 'php', 'mysql'],
        lvl: 'senior',
        s: 'my',
        src: source
      });
    }
  }
  
  return questions;
}

// Extract questions from level-wise Q&A markdown
function parseLevelBank(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');
  
  // Match Q13. Question. Answer: ... patterns
  const lineRE = /^(\*\*(Q\d+)\.\s*(.*?)\*\*)\s*[:：]?\s*(Answer:)?\s*(.*?)(?=\n\n\*\*|Q\d+\.\s|#|\n\n\n|$)/gs;
  let m;
  
  while ((m = lineRE.exec(content)) !== null) {
    const [, marker, id, qText, , answer] = m;
    const question = qText.trim();
    const answerText = (answer || '').trim();
    
    if (question.length > 10) {
      questions.push({
        id: id,
        q: question,
        a: answerText,
        t: ['levelwise', 'junior', 'mid', 'senior', 'romanurdu'],
        lvl: 'mixed',
        s: 'my',
        src: source
      });
    }
  }
  
  return questions;
}

// Extract from Laravel specific file
function parseLaravelBank(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');
  
  // Match **Q1. Question. Answer: ... or **S1. ...** Answer: ...
  const lineRE = /^(\*\*([QS]\d+)\.\s*(.*?)\*\*)\s*[:：]?\s*(Answer:)?\s*(.*?)(?=\n\n\*\*|#|\n\n\n|$)/gs;
  let m;
  
  while ((m = lineRE.exec(content)) !== null) {
    const [, marker, id, qText, , answer] = m;
    const question = qText.trim();
    const answerText = (answer || '').trim();
    
    if (question.length > 10) {
      questions.push({
        id: id,
        q: question,
        a: answerText,
        t: ['laravel', 'php', 'server', 'nginx', 'fpm'],
        lvl: 'senior',
        s: 'my',
        src: source
      });
    }
  }
  
  return questions;
}

// Extract from senior software engineer file
function parseSEBank(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const questions = [];
  const source = path.basename(filePath, '.md');
  
  // Match **Q1. Question. Answer: ... patterns
  const lineRE = /^(\*\*(Q\d+)\.\s*(.*?)\*\*)\s*[:：]?\s*(Answer:)?\s*(.*?)(?=\n\n\*\*|#|\n\n\n|$)/gs;
  let m;
  
  while ((m = lineRE.exec(content)) !== null) {
    const [, marker, id, qText, , answer] = m;
    const question = qText.trim();
    const answerText = (answer || '').trim();
    
    if (question.length > 10) {
      questions.push({
        id: id,
        q: question,
        a: answerText,
        t: ['pitb', 'railways', 'itops', 'senior', 'laravel'],
        lvl: 'senior',
        s: 'my',
        src: source
      });
    }
  }
  
  return questions;
}

// Generate the import JSON
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
  
  for (const [file, parser] of Object.entries(files)) {
    const filePath = path.join(BANK_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ Missing: ${file}`);
      continue;
    }
    const qList = parser(filePath);
    console.log(`✓ ${file}: ${qList.length} questions`);
    allQuestions.push(...qList);
    sources[file] = qList.length;
  }
  
  console.log(`\nTotal: ${allQuestions.length} questions across ${Object.keys(sources).length} files`);
  
  // Deduplicate by id
  const seen = new Set();
  const unique = allQuestions.filter(q => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
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
