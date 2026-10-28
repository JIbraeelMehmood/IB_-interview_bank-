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

// In AND mode every visible card must show both selected technologies as
// highlighted badges, so it is obvious *why* the card matched.
if ((await quick('Match all').getAttribute('aria-pressed')) !== 'true') await quick('Match all').click()
await page.waitForTimeout(900)
const bad = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.qcard')]
  return cards.filter((c) => {
    const marks = [...c.querySelectorAll('.qmeta .badge.ok')].map((b) => b.textContent.trim().toLowerCase())
    return !marks.includes('laravel') || !marks.includes('react')
  }).length
})
ok('each card highlights the technologies it matched', bad === 0, `${bad} of 30 wrong`)

await browser.close()
console.log(`\n${fails.length ? `FAILURES: ${JSON.stringify(fails)}` : 'filter checks passed'}`)
process.exit(fails.length ? 1 : 0)
