import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/lib/db'
import { backupText, importBackup, makeBackup, resetProgress } from '../src/lib/backup'

async function clearLocalData() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
}

beforeEach(async () => {
  await clearLocalData()
  localStorage.setItem('ibx-active-account', 'guest')
})

afterEach(async () => {
  await clearLocalData()
  localStorage.removeItem('ibx-active-account')
})

describe('complete backup and restore', () => {
  it('round-trips explanations, cached audio and the local community vote', async () => {
    await db.questions.put({
      code: 'CUSTOM-1', q: 'Explain queues', a: 'A queue defers work.',
      l: 'm', p: 'My questions', c: '', f: '', t: ['laravel'],
      s: 'my', search: 'explain queues', updatedAt: 10,
    })
    await db.explains.put({
      id: 'CUSTOM-1|x|ur|both|simple', code: 'CUSTOM-1',
      lang: 'ur', focus: 'both', style: 'simple',
      markdown: 'Queue ki wazahat', updatedAt: 11,
    })
    await db.audio.put({
      id: 'CUSTOM-1|ur|mix', code: 'CUSTOM-1',
      lang: 'ur', mode: 'mix', url: 'https://example.test/audio.mp3',
      cachedAt: 12,
    })
    await db.communityVotes.put({
      code: 'CUSTOM-1', expYears: 2, company: 'Example Ltd',
      at: 13, updatedAt: 13,
    })

    const backup = await makeBackup()
    expect(backup.v).toBe(3)
    expect(backup.state.explains).toHaveLength(1)
    expect(backup.state.audio).toHaveLength(1)
    expect(backup.state.communityVotes).toHaveLength(1)

    await clearLocalData()
    const result = await importBackup(backupText(backup))
    expect(result.ok).toBe(true)
    expect(await db.explains.get('CUSTOM-1|x|ur|both|simple')).toBeTruthy()
    expect(await db.audio.get('CUSTOM-1|ur|mix')).toBeTruthy()
    expect(await db.communityVotes.get('CUSTOM-1')).toMatchObject({ expYears: 2, company: 'Example Ltd' })
  })

  it('resets user progress without deleting the built-in question bank', async () => {
    await db.questions.bulkPut([
      { code: 'BUILTIN-1', q: 'Built-in', a: '', l: 'm', p: 'PHP', c: '', f: '', t: ['php'], s: 'b', search: 'built-in', updatedAt: 1 },
      { code: 'CUSTOM-1', q: 'Custom', a: '', l: 'm', p: 'My questions', c: '', f: '', t: [], s: 'my', search: 'custom', updatedAt: 1 },
    ])
    await db.ratings.put({ code: 'CUSTOM-1', rating: 3, updatedAt: 1, deviceId: 'test' })

    await resetProgress()

    expect(await db.questions.get('BUILTIN-1')).toBeTruthy()
    expect(await db.questions.get('CUSTOM-1')).toBeUndefined()
    expect(await db.ratings.count()).toBe(0)
  })
})
