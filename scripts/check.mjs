/** Fast syntax check for every source file, using esbuild directly. */
import { transformSync } from 'esbuild'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(f)) out.push(p)
  }
  return out
}

let bad = 0
for (const file of walk('src')) {
  const loader = file.endsWith('.tsx') ? 'tsx' : 'ts'
  try {
    transformSync(readFileSync(file, 'utf8'), { loader })
  } catch (e) {
    bad++
    console.log(`\n${file}`)
    for (const err of e.errors) console.log(`  line ${err.location.line}: ${err.text}`)
  }
}
console.log(bad ? `\n${bad} file(s) failed to parse` : 'All files parse cleanly')
process.exit(bad ? 1 : 0)
