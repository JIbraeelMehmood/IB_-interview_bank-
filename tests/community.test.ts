import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/lib/db'
import { unvoteQuestion } from '../src/lib/community'

beforeEach(async () => {
  await db.transaction('rw', [db.communityVotes, db.outbox], async () => {
    await db.communityVotes.clear()
    await db.outbox.clear()
  })
  localStorage.setItem('ibx-user-cache', JSON.stringify({
    id: 'test-user', email: 'test@example.test', name: 'Test User',
  }))
})

afterEach(async () => {
  await db.transaction('rw', [db.communityVotes, db.outbox], async () => {
    await db.communityVotes.clear()
    await db.outbox.clear()
  })
  localStorage.removeItem('ibx-user-cache')
})

describe('community vote removal', () => {
  it('removes the local vote and queues an account-scoped server deletion', async () => {
    await db.communityVotes.put({
      code: 'LARAVEL-1', expYears: 2, at: 10, updatedAt: 10,
    })

    await unvoteQuestion('LARAVEL-1')

    expect(await db.communityVotes.get('LARAVEL-1')).toBeUndefined()
    const queued = await db.outbox.where('type').equals('communityVoteDelete').toArray()
    expect(queued).toHaveLength(1)
    expect(queued[0].payload).toMatchObject({ code: 'LARAVEL-1' })
  })

  it('does not change local vote data for a guest', async () => {
    await db.communityVotes.put({
      code: 'LARAVEL-2', expYears: 1, at: 10, updatedAt: 10,
    })
    localStorage.removeItem('ibx-user-cache')

    await expect(unvoteQuestion('LARAVEL-2')).rejects.toThrow('Please sign in')
    expect(await db.communityVotes.get('LARAVEL-2')).toBeTruthy()
  })
})
