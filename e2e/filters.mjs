/** Filter-combination checks against the real bank.
 *
 *  This is the behaviour people rely on most: pick several technologies plus a
 *  flag and get the intersection, not just the last thing tapped. */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const fails = []
const ok = (n, c, d = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`)
  if (!c) fails.push(n)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto(BASE, { waitUntil: 'load' })
await page.waitForSelector('.qcard', { timeout: 40000 })
await page.waitForTimeout(1200)

const label = async () =>
  (await page.locator('text=/\\d+ questions?/').first().textContent().catch(() => '')).trim()
const count = async () => Number((await label()).match(/(\d+)\s+questions?/)?.[1] || 0)

const chip = (name) => page.locator('.scroll-x .chip', { hasText: name }).first()
const quick = (name) => page.locator('.chip', { hasText: name }).first()

const laravel = await count()
ok('library shows the full bank', laravel === 1950, `${laravel} questions`)

await chip('laravel').click()
await page.waitForTimeout(700)
const onlyLaravel = await count()
ok('one technology narrows the list', onlyLaravel > 0 && onlyLaravel < laravel, `${onlyLaravel}`)

await chip(/^react/).click()
await page.waitForTimeout(700)
const andTwo = await count()
ok('two technologies combine with AND', andTwo > 0 && andTwo < onlyLaravel, `${onlyLaravel} → ${andTwo}`)
ok('label names both technologies', /laravel \+ react/.test(await label()), await label())

await quick('Most important').click()
await page.waitForTimeout(700)
const andFlag = await count()
ok('AND + a flag narrows further', andFlag > 0 && andFlag <= andTwo, `${andTwo} → ${andFlag}`)

await quick('Match any').click()
await page.waitForTimeout(700)
const orTwo = await count()
ok('match-any widens the result', orTwo > andFlag, `${andFlag} → ${orTwo}`)
ok('label shows the or-join', /laravel or react/.test(await label()), await label())

// Every visible card must genuinely carry both technologies in AND mode.
await quick('Match all').click()
await quick('Most important').click()
await page.waitForTimeout(800)
const bad = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.qcard')]
  return cards.filter((c) => {
    const meta = [...c.querySelectorAll('.qmeta .badge')].map((b) => b.textContent.trim())
    return !(meta.includes('laravel') && meta.includes('react') && meta.includes('Important'))
  }).length
})
ok('every card really has both technologies', bad === 0, `${bad} mismatched of 30 shown`)

// Clearing restores the full bank.
await page.locator('.card button', { hasText: 'Clear' }).first().click()
await page.waitForTimeout(800)
ok('clear restores everything', (await count()) === 1950, await label())

await browser.close()
console.log(`\n${fails.length ? `FAILURES: ${JSON.stringify(fails)}` : 'filter checks passed'}`)
process.exit(fails.length ? 1 : 0)
