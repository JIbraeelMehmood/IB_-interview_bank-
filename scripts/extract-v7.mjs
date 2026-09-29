/**
 * Extract every data asset from the v7 single-file app.
 *
 * The v7 sources (app.html, data.json, bank/b*.py, t*.py) lived in a build
 * sandbox that no longer exists, so the bank and the language/feature data are
 * recovered from the shipped file itself: the `<script id="bank">` JSON, plus
 * the JS array/object literals, which are evaluated in this Node process so
 * they come out exactly as the app had them.
 *
 * Usage:  node scripts/extract-v7.mjs ../interview-box.html
 * Output: public/data/*.json  (bank, meta, lexicons, dictionary, prompts,
 *                                sqllab, speaking)
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const src = process.argv[2] || path.resolve(root, '..', 'interview-box.html')
const outDir = path.join(root, 'public', 'data')

if (!fs.existsSync(src)) {
  console.error(`Not found: ${src}`)
  process.exit(1)
}

const html = fs.readFileSync(src, 'utf8')

/** Read the matching closing bracket, ignoring brackets inside strings. */
function bracketFrom(text, start) {
  let depth = 0
  let instr = null
  let esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (instr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === instr) instr = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') instr = c
    else if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  throw new Error('unbalanced brackets')
}

/** Find `NAME = <literal>` and return the literal source. */
function literalOf(name, text) {
  const m = new RegExp(`(?:^|[\\s;{,(])${name}\\s*=\\s*(?=['"\\[{])`).exec(text)
  if (!m) return null
  const from = m.index + m[0].length
  const c = text[from]
  if (c === "'" || c === '"' || c === '`') {
    // A concatenated string: read until a top-level semicolon.
    let depth = 0
    let instr = null
    let esc = false
    for (let i = from; i < text.length; i++) {
      const ch = text[i]
      if (instr) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === instr) instr = null
      } else if (ch === "'" || ch === '"' || ch === '`') instr = ch
      else if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') depth--
      else if (ch === ';' && depth === 0) return text.slice(from, i)
    }
    return text.slice(from)
  }
  return bracketFrom(text, from)
}

function evaluate(name, text) {
  const lit = literalOf(name, text)
  if (!lit) return null
  return vm.runInNewContext(`(${lit})`)
}

/* 1. the question bank ------------------------------------------------ */
const bankMatch = /<script type="application\/json" id="bank">([\s\S]*?)<\/script>/.exec(html)
if (!bankMatch) {
  console.error('Could not find <script id="bank"> in the v7 file.')
  process.exit(1)
}
const bank = JSON.parse(bankMatch[1])

/* 2. the rest of the data assets ------------------------------------- */
const techs = evaluate('BASE_TECHS', html)
const parts = [...new Set(bank.map((q) => q.p))].sort()
const chapters = [...new Set(bank.map((q) => q.c))].sort()
const techList = techs.map(([slug, label, keywords]) => ({ slug, label, keywords }))

const assets = {
  'meta.json': {
    parts,
    chapters,
    techs: techList,
    count: bank.length,
    builtAt: new Date().toISOString().slice(0, 10),
  },
  'lexicons.json': {
    ur: evaluate('LEX_UR', html),
    hi: evaluate('LEX_HI', html),
    ru: evaluate('LEX_RU', html),
    ruNorm: evaluate('RU_NORM', html),
  },
  'dictionary.json': evaluate('DICT_RAW', html),
  'prompts.json': {
    trStyle: evaluate('TR_STYLE', html),
    hiStyle: evaluate('HI_STYLE', html),
    ruSpell: evaluate('RU_SPELL', html),
  },
  'sqllab.json': {
    seed: evaluate('LAB_SEED', html),
    exercises: evaluate('LAB_EX', html),
  },
  'speaking.json': {
    sounds: evaluate('SP_SOUNDS', html),
    fixes: evaluate('SP_FIX', html),
    phrases: evaluate('SP_PHR', html),
    fnWords: evaluate('SP_FN', html),
    tabs: evaluate('SP_TABS', html),
    breathing: evaluate('SP_BR', html),
    practiceQs: evaluate('SP_QS', html),
    core: evaluate('SP_CORE', html),
  },
}

fs.mkdirSync(outDir, { recursive: true })
const write = (name, value) => {
  if (value === null || value === undefined) {
    console.warn(`  ! ${name} could not be extracted`)
    return
  }
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(value))
  const n = Array.isArray(value) ? value.length : Object.keys(value).length
  console.log(`  ✓ ${name} (${n} ${Array.isArray(value) ? 'items' : 'keys'})`)
}

write('bank.json', bank)
for (const [name, value] of Object.entries(assets)) write(name, value)

console.log(`\nExtracted from ${src}`)
console.log(`  bank: ${bank.length} questions, ${parts.length} parts, ${chapters.length} chapters, ${techList.length} techs`)
const lex = assets['lexicons.json']
console.log(`  lexicon: ur ${lex.ur.length}, hi ${lex.hi.length}, ru ${lex.ru.length}, ruNorm ${lex.ruNorm.length}`)
console.log(`  dictionary: ${assets['dictionary.json'].length} terms`)
console.log(`  sql lab: ${assets['sqllab.json'].exercises.length} exercises, ${assets['sqllab.json'].seed.length} seed statements`)
