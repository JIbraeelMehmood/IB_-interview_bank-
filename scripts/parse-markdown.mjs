/**
 * Parse markdown interview Q&A files and merge into the question bank.
 *
 * Reads .md files from the project root, extracts Q&A pairs, and merges
 * them into public/data/bank.json. Questions get unique IDs so they don't
 * collide with existing ones.
 *
 * Usage:  node scripts/parse-markdown.mjs
 * Output: appends to public/data/bank.json + updates meta.json count
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const bankPath = path.join(root, 'public', 'data', 'bank.json')
const metaPath = path.join(root, 'public', 'data', 'meta.json')

// Files to parse — the markdown interview Q&A guides in the project root
const mdFiles = [
  'Interview Prep Roman Urdu Version (Poori Guide).md',
  'Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md',
  'Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md',
  'Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md',
  'Roman Urdu v2 (Modern Dev Style).md',
  'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers).md',
  'Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md',
  'Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md',
  'Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md',
]

/** Detect the level from text */
function detectLevel(text) {
  const lower = text.toLowerCase()
  if (/senior|s\s+level|lead|staff|principal|architect/.test(lower)) return 's'
  if (/mid|mid-level|intermediate/.test(lower)) return 'm'
  return 'j'
}

/** Extract tech tags from text */
function extractTechs(text) {
  const techs = new Set()
  const lower = text.toLowerCase()
  const techMap = {
    laravel: ['laravel', 'eloquent', 'artisan', 'blade', 'sanctum', 'horizon', 'octane', 'telescope'],
    php: ['php', 'composer', 'opcache', 'php-fpm'],
    sql: ['sql', 'mysql', 'postgres', 'database', 'index', 'join', 'query'],
    redis: ['redis', 'cache', 'caching', 'memcached'],
    docker: ['docker', 'container', 'compose', 'kubernetes', 'k8s'],
    react: ['react', 'jsx', 'hooks'],
    javascript: ['javascript', 'es6', 'promise', 'async', 'closure'],
    node: ['node', 'express', 'npm'],
    api: ['api', 'rest', 'graphql', 'endpoint'],
    security: ['security', 'xss', 'csrf', 'oauth', 'jwt', 'authentication'],
    testing: ['testing', 'phpunit', 'pest', 'test'],
    queues: ['queue', 'job', 'worker', 'kafka', 'rabbitmq'],
    architecture: ['architecture', 'microservice', 'monolith', 'design pattern', 'solid'],
    deployment: ['deploy', 'ci/cd', 'pipeline', 'github actions'],
    performance: ['performance', 'optimization', 'n+1', 'profile', 'benchmark'],
    git: ['git', 'github', 'branch', 'merge'],
    aws: ['aws', 'ec2', 's3', 'lambda', 'cloudfront'],
  }
  for (const [slug, keywords] of Object.entries(techMap)) {
    if (keywords.some((k) => lower.includes(k))) techs.add(slug)
  }
  return [...techs]
}

/** Parse a markdown file into Q&A pairs */
function parseMarkdown(content, filename) {
  const lines = content.split('\n')
  const questions = []
  let currentQ = null
  let currentA = []
  let part = filename.replace(/\.(md|MD)$/, '').replace(/\+/g, ' ')

  for (const line of lines) {
    const trimmed = line.trim()
    // Detect question lines (## headings, bold Q:, numbered Q patterns)
    const qMatch =
      trimmed.match(/^#{2,3}\s+(?:Q\d*[:.]\s*|Question\s*\d*[:.]\s*)?(.+)/i) ||
      trimmed.match(/^\*\*Q[:.]\s*(.+)\*\*/i) ||
      trimmed.match(/^Q[:.]\s*(.+)/i) ||
      trimmed.match(/^\d+\.\s+(?:Q[:.]\s*)?(.+)/i)

    if (qMatch && qMatch[1] && qMatch[1].length > 10) {
      // Save previous Q&A
      if (currentQ && currentA.join('').trim().length > 20) {
        questions.push({
          q: currentQ,
          a: currentA.join('\n').trim(),
          part,
        })
      }
      currentQ = qMatch[1].trim()
      currentA = []
    } else if (currentQ) {
      // Accumulate answer text
      if (trimmed.length > 0) {
        currentA.push(line)
      }
    }
  }
  // Don't forget the last one
  if (currentQ && currentA.join('').trim().length > 20) {
    questions.push({
      q: currentQ,
      a: currentA.join('\n').trim(),
      part,
    })
  }

  return questions
}

// Main
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'))
const existingIds = new Set(bank.map((q) => q.code))
let added = 0
let skipped = 0

for (const file of mdFiles) {
  const fp = path.join(root, file)
  if (!fs.existsSync(fp)) {
    console.warn(`  ! Not found: ${file}`)
    continue
  }
  const content = fs.readFileSync(fp, 'utf8')
  const parsed = parseMarkdown(content, file)
  console.log(`  ${file}: ${parsed.length} Q&A pairs found`)

  for (const item of parsed) {
    // Generate a unique ID
    let id = `MD-${added + 1}`
    let n = 1
    while (existingIds.has(id)) {
      id = `MD-${added + 1}-${n}`
      n++
    }

    // Skip if the question text is too short or looks like noise
    if (item.q.length < 15 || item.a.length < 30) {
      skipped++
      continue
    }

    // Deduplicate by checking if a similar question already exists
    const qLower = item.q.toLowerCase().slice(0, 80)
    const dup = bank.some((q) => q.q.toLowerCase().slice(0, 80) === qLower)
    if (dup) {
      skipped++
      continue
    }

    const level = detectLevel(item.q + ' ' + item.a)
    const techs = extractTechs(item.q + ' ' + item.a)

    bank.push({
      code: id,
      q: item.q,
      a: item.a,
      l: level,
      p: item.part.slice(0, 100),
      c: 'Markdown Import',
      f: '',
      t: techs,
      s: 'import',
      updatedAt: Date.now(),
    })
    existingIds.add(id)
    added++
  }
}

console.log(`\nAdded: ${added}, Skipped: ${skipped} (duplicates/short)`)
console.log(`Bank total: ${bank.length} questions (was ${bank.length - added})`)

// Write the updated bank
fs.writeFileSync(bankPath, JSON.stringify(bank))

// Update meta.json count
if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  meta.count = bank.length
  meta.builtAt = new Date().toISOString().slice(0, 10)
  // Add the new part to the parts list
  const newParts = [...new Set(bank.map((q) => q.p))].sort()
  meta.parts = newParts
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  console.log(`meta.json updated: ${meta.count} questions, ${newParts.length} parts`)
}
