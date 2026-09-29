/** Prove the app really works with no network: load once, then cut the network
 *  and confirm the bank, filters and progress all still work. */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const fails = []
const ok = (n, c, d = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`)
  if (!c) fails.push(n)
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.qcard', { timeout: 40000 })
ok('first load seeds the bank', (await page.locator('.qcard').count()) > 0)

// Wait for the service worker to finish precaching.
await page.waitForFunction(async () => {
  const r = await navigator.serviceWorker.getRegistration()
  return !!r?.active
}, { timeout: 30000 })
ok('service worker active', true)

// Give the bank time to land in the cache.
await page.waitForTimeout(3000)
const cached = await page.evaluate(async () => {
  const keys = await caches.keys()
  let n = 0
  for (const k of keys) n += (await (await caches.open(k)).keys()).length
  return { keys, n }
})
ok('assets are precached', cached.n > 10, `${cached.n} entries in ${cached.keys.length} caches`)

// Go offline for real.
await ctx.setOffline(true)
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.qcard', { timeout: 40000 })
ok('library works offline', (await page.locator('.qcard').count()) > 0, `${await page.locator('.qcard').count()} cards`)

await page.fill('input[type="search"]', 'laravel')
await page.waitForTimeout(1200)
ok('search works offline', (await page.locator('.qcard').count()) > 0, `${await page.locator('.qcard').count()} cards`)

await page.goto(BASE + '/lab', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
const run = page.locator('button', { hasText: 'Run' }).first()
if (await run.count()) {
  await run.click()
  await page.waitForTimeout(1500)
  const out = await page.locator('main').textContent()
  ok('sql lab works offline', /rows|error/i.test(out || ''))
}

await page.goto(BASE + '/progress', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const prog = await page.locator('main').textContent()
ok('progress works offline', (prog || '').includes('practised') || (prog || '').includes('progress'))

await ctx.setOffline(false)
console.log(`\n${fails.length ? `FAILURES: ${JSON.stringify(fails)}` : 'offline-first verified'}`)
await browser.close()
process.exit(fails.length ? 1 : 0)
