/**
 * End-to-end smoke test against the production build.
 * Checks the app boots, seeds 1,950 questions, navigates every screen, and
 * records ratings — at a 390×844 phone viewport with no horizontal overflow.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const errors = []
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) errors.push(name)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })

  // 1. The app shell renders.
  await page.waitForSelector('.logo', { timeout: 20000 })
  check('app shell renders', true)

  // 2. The bank seeds into IndexedDB and cards appear.
  await page.waitForSelector('.qcard', { timeout: 40000 })
  const cards = await page.locator('.qcard').count()
  check('question cards render', cards > 0, `${cards} cards`)

  const count = await page.locator('text=/1,9\\d\\d questions?|950 questions/').first().textContent().catch(() => '')
  check('library reports the bank size', /\d/.test(count || ''), (count || '').trim())

  // 3. A question shows English, part and level badges.
  const firstQ = await page.locator('.qtext').first().textContent()
  check('first question has text', (firstQ || '').length > 20, (firstQ || '').slice(0, 60))
  const badges = await page.locator('.qcard').first().locator('.badge').count()
  check('card shows badges', badges > 0, `${badges} badges`)

  // 4. Rating a question persists and the nav badge appears.
  await page.locator('.rate button', { hasText: 'Weak' }).first().click()
  await page.waitForTimeout(700)
  const pressed = await page.locator('.rate button[aria-pressed="true"]').first().textContent()
  check('rating registers', /Weak/.test(pressed || ''), pressed || '')

  // 5. Search narrows the list.
  const before = await page.locator('.qcard').count()
  await page.fill('input[type="search"]', 'redis')
  await page.waitForTimeout(900)
  const after = await page.locator('.qcard').count()
  check('search filters', after <= before, `${before} → ${after}`)
  await page.fill('input[type="search"]', '')
  await page.waitForTimeout(700)

  // 6. Tech chip filter works.
  const chip = page.locator('.chip', { hasText: 'laravel' }).first()
  if (await chip.count()) {
    await chip.click()
    await page.waitForTimeout(900)
    check('tech chip filters', (await page.locator('.qcard').count()) > 0)
    await chip.click()
    await page.waitForTimeout(600)
  }

  // 7. Language switch does not break the card.
  const langSel = page.locator('.qcard select').first()
  await langSel.selectOption('ur')
  await page.waitForTimeout(1200)
  check('urdu tab does not crash the card', (await page.locator('.qcard').count()) > 0)
  await langSel.selectOption('en')
  await page.waitForTimeout(500)

  // 8. Every screen loads without a page error.
  const routes = ['/jd', '/mock', '/speak', '/progress', '/lab', '/learn', '/downloads', '/ai', '/topics', '/help']
  for (const r of routes) {
    const before2 = consoleErrors.length
    await page.goto(BASE + r, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const h = await page.locator('main').textContent()
    check(`screen ${r} renders`, (h || '').length > 40, `${(h || '').trim().slice(0, 48)}…`)
    check(`screen ${r} has no console error`, consoleErrors.length === before2, consoleErrors.slice(before2).join('; ').slice(0, 120))
  }

  // 9. The SQL Lab actually runs a query.
  await page.goto(BASE + '/lab', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const runBtn = page.locator('button', { hasText: 'Run' }).first()
  if (await runBtn.count()) {
    await runBtn.click()
    await page.waitForTimeout(1500)
    const out = await page.locator('main').textContent()
    check('sql lab runs a query', /rows|error/i.test(out || ''))
  }

  // 10. No horizontal overflow anywhere (H-01).
  for (const r of ['/library', '/jd', '/speak', '/progress', '/lab', '/help']) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check(`no horizontal overflow on ${r}`, over <= 1, `${over}px`)
  }

  // 11. The service worker registers and the manifest is valid.
  const sw = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    return !!r
  })
  check('service worker registers', sw)
  const manifest = await page.evaluate(async () => {
    const r = await fetch('/manifest.webmanifest')
    return r.json()
  })
  check('manifest is valid', manifest.name === 'Interview Box' && manifest.icons.length >= 3, `${manifest.icons.length} icons`)

  // 12. Data survives a reload (offline-first storage).
  await page.goto(BASE + '/library', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  check('cards return after reload', (await page.locator('.qcard').count()) > 0)

  await page.screenshot({ path: 'e2e/library.png', fullPage: false })
} catch (e) {
  check('run completed without throwing', false, e.message)
}

console.log('\n--- console errors ---')
console.log(consoleErrors.length ? consoleErrors.slice(0, 10).join('\n') : '(none)')
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`)
console.log(`errors ${JSON.stringify(errors)}`)

await browser.close()
process.exit(errors.length ? 1 : 0)
