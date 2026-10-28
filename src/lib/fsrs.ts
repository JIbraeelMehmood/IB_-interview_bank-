/** FSRS spaced repetition. Runs entirely on-device so reviews work offline;
 *  cards sync to the server when one is configured.
 *
 *  v7's Weak/Okay/Solid buttons map onto Again/Hard/Good. */

import { fsrs, generatorParameters, createEmptyCard, type Card, type Grade } from 'ts-fsrs'
import { db } from './db'
import type { Rating, Review } from './types'

const f = fsrs(generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  maximum_interval: 365,
}))

/** v7 rating (1 weak, 2 okay, 3 solid) → FSRS grade. */
function gradeFor(rating: 1 | 2 | 3): Grade {
  return rating === 1 ? 1 : rating === 2 ? 2 : 3
}

/** Default intervals in days for the three buttons, used before a card exists. */
export const PREVIEW_DAYS: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 7 }

function toCard(r: Review): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.lastReviewAt
      ? Math.max(0, (Date.now() - r.lastReviewAt) / 86_400_000)
      : 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state,
    last_review: r.lastReviewAt ? new Date(r.lastReviewAt) : undefined,
  }
}

function fromCard(code: string, c: Card): Review {
  return {
    code,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReviewAt: c.last_review ? c.last_review.getTime() : undefined,
    updatedAt: Date.now(),
  }
}

/** Review a question with a rating. Returns the saved card. */
export async function review(code: string, rating: 1 | 2 | 3, device: string): Promise<Review> {
  const now = new Date()
  const existing = await db.reviews.get(code)
  const card = existing
    ? toCard(existing)
    : { ...createEmptyCard(now), due: now }
  const result = f.next(card, now, gradeFor(rating))
  const next = fromCard(code, result.card)
  await db.transaction('rw', db.reviews, db.ratings, db.outbox, async () => {
    await db.reviews.put(next)
    const row: Rating = { code, rating, updatedAt: Date.now(), deviceId: device }
    await db.ratings.put(row)
    await db.outbox.add({ type: 'review', payload: { ...row, review: next }, createdAt: Date.now(), tries: 0 })
  })
  return next
}

/** Questions due now, most overdue first. */
export async function dueCodes(limit = 200): Promise<string[]> {
  const now = new Date().toISOString()
  const rows = await db.reviews.where('due').belowOrEqual(now).limit(limit).toArray()
  return rows.sort((a, b) => a.due.localeCompare(b.due)).map((r) => r.code)
}

/** How many cards are due, for the badge. */
export async function dueCount(): Promise<number> {
  return db.reviews.where('due').belowOrEqual(new Date().toISOString()).count()
}

/** Next due date across all cards, for the progress screen. */
export async function nextDue(): Promise<string | null> {
  const first = await db.reviews.orderBy('due').first()
  return first?.due || null
}

/** Cards not seen for a long time and rated weak — the best revision set. */
export async function weakestCodes(limit = 20): Promise<string[]> {
  const rows = await db.ratings.where('rating').equals(1).toArray()
  const scored: { code: string; t: number }[] = []
  for (const r of rows) {
    const card = await db.reviews.get(r.code)
    // Lower stability = more forgettable.
    scored.push({ code: r.code, t: card?.stability ?? 0 })
  }
  return scored
    .sort((a, b) => a.t - b.t)
    .slice(0, limit)
    .map((x) => x.code)
}
