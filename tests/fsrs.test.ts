/** Spaced repetition: Weak / Okay / Solid must actually schedule the future. */
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/lib/db'
import { dueCodes, nextDue, review, weakestCodes } from '../src/lib/fsrs'

const CODE = 'CB-1'

beforeEach(async () => {
  await db.reviews.clear()
  await db.ratings.clear()
  await db.outbox.clear()
})

describe('FSRS', () => {
  it('sends a weak question back sooner than a solid one', async () => {
    const weak = await review('CB-1', 1, 'test')
    const solid = await review('CB-2', 3, 'test')
    const days = (r: typeof weak) => (new Date(r.due).getTime() - Date.now()) / 86_400_000
    expect(days(weak)).toBeLessThan(days(solid))
  })

  it('records the rating and queues it for the server', async () => {
    await review(CODE, 2, 'test')
    const r = await db.ratings.get(CODE)
    expect(r?.rating).toBe(2)
    expect(await db.outbox.count()).toBe(1)
  })

  it('spreads a question further each time it is answered well', async () => {
    const first = await review(CODE, 3, 'test')
    const second = await review(CODE, 3, 'test')
    expect(new Date(second.due).getTime()).toBeGreaterThan(new Date(first.due).getTime())
    expect(second.reps).toBe(first.reps + 1)
  })

  it('lists what is due, and only once the due time has passed', async () => {
    await review(CODE, 1, 'test')
    // A fresh "Again" card is short-term scheduled, so it is not due this second.
    expect(await dueCodes()).not.toContain(CODE)
    expect(await nextDue()).toBeTruthy()

    // Move the card into the past and it becomes due.
    const card = (await db.reviews.get(CODE))!
    card.due = new Date(Date.now() - 1000).toISOString()
    await db.reviews.put(card)
    expect(await dueCodes()).toContain(CODE)
  })

  it('finds the weakest questions for revision', async () => {
    await review('CB-1', 1, 'test')
    await review('CB-2', 1, 'test')
    await review('CB-3', 3, 'test')
    const weak = await weakestCodes(10)
    expect(weak).toContain('CB-1')
    expect(weak).not.toContain('CB-3')
  })
})
