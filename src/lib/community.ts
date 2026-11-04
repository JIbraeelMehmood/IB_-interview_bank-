/** Community question rating system.
 *
 *  Logged-in users can mark questions as "actually asked in an interview".
 *  Votes sync to MongoDB, and aggregated stats are pulled back so everyone
 *  sees which questions are most likely to come up — by category and
 *  experience level.
 */

import { db } from './db'
import { queue } from './sync'
import type { CommunityVote, ExpYears, QuestionStats } from './types'

/** Submit a community vote: "this question was asked to me in a real interview". */
export async function voteQuestion(
  code: string,
  expYears: ExpYears,
  company?: string,
): Promise<void> {
  const vote: CommunityVote = {
    code,
    expYears,
    company: company?.trim() || undefined,
    at: Date.now(),
    updatedAt: Date.now(),
  }
  await db.communityVotes.put(vote)
  await queue('communityVote', vote)
}

/** Remove the user's vote for a question. */
export async function unvoteQuestion(code: string): Promise<void> {
  await db.communityVotes.delete(code)
  await queue('communityVoteDelete', { code, updatedAt: Date.now() })
}

/** Has the current user voted on this question? */
export async function hasVoted(code: string): Promise<CommunityVote | null> {
  return (await db.communityVotes.get(code)) || null
}

/** Get cached community stats for a single question. */
export async function getQuestionStats(code: string): Promise<QuestionStats | null> {
  return (await db.questionStats.get(code)) || null
}

/** Fetch aggregated stats from the server and cache them locally.
 *  Call this periodically or on app load. */
export async function refreshQuestionStats(): Promise<number> {
  try {
    const res = await fetch('/api/v1/stats', { credentials: 'same-origin' })
    if (!res.ok) return 0
    const data = await res.json()
    const rows: QuestionStats[] = data.stats || []
    if (!rows.length) return 0
    await db.questionStats.bulkPut(rows)
    return rows.length
  } catch {
    return 0
  }
}

/** Get the top community-verified questions, optionally filtered by experience band.
 *  Returns question codes sorted by ask count descending. */
export async function topAskedCodes(
  expYears?: ExpYears,
  limit = 50,
): Promise<{ code: string; count: number }[]> {
  const stats = await db.questionStats.toArray()
  return stats
    .map((s) => ({
      code: s.code,
      count: expYears ? (s.askByExp[expYears] || 0) : s.askCount,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Summary stats for the community insights panel. */
export async function communitySummary() {
  const [totalVotes, topStats, allStats] = await Promise.all([
    db.communityVotes.count(),
    db.questionStats.orderBy('askCount').reverse().limit(10).toArray(),
    db.questionStats.toArray(),
  ])

  // Aggregate by experience band
  const byExp: Record<number, number> = {}
  let totalAsks = 0
  for (const s of allStats) {
    for (const [exp, count] of Object.entries(s.askByExp)) {
      byExp[Number(exp)] = (byExp[Number(exp)] || 0) + count
      totalAsks += count
    }
  }

  // Find top categories
  const categoryCounts = new Map<string, number>()
  for (const s of topStats) {
    const q = await db.questions.get(s.code)
    if (q) {
      categoryCounts.set(q.p, (categoryCounts.get(q.p) || 0) + s.askCount)
    }
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return {
    totalVotes,
    totalAsks,
    topQuestions: topStats.map((s) => ({ code: s.code, count: s.askCount })),
    byExp,
    topCategories,
    questionsTracked: allStats.length,
  }
}
