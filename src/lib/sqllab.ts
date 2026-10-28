/** SQL Lab. Runs entirely in the browser on sql.js.
 *
 *  The asm.js build is used on purpose (not the default wasm build): it needs
 *  no separate .wasm fetch, so there is no WebAssembly MIME/CSP problem and it
 *  works offline from the service worker cache. This is the same trade-off v7
 *  made, and it is the reason SQL Lab keeps working in every browser.
 */

import initSqlJs from 'sql.js/dist/sql-asm.js'
import type { Database } from 'sql.js'

export interface LabExercise {
  id: string
  set: string
  lvl: string
  /** Short title. */
  t: string
  /** The task. */
  p: string
  /** Reference solution. */
  sol: string
  /** ORDER BY terms that must match exactly. */
  ord?: string[]
  /** Hint. */
  h: string
  /** The question in plain words. */
  q: string
}

export interface LabData {
  seed: string[]
  exercises: LabExercise[]
}

let dbPromise: Promise<Database> | null = null
let cache: LabData | null = null

async function loadData(): Promise<LabData> {
  if (cache) return cache
  const res = await fetch('/data/sqllab.json')
  if (!res.ok) throw new Error('sqllab.json missing — run scripts/extract-v7.mjs')
  cache = (await res.json()) as LabData
  return cache
}

export async function labExercises(): Promise<LabExercise[]> {
  return (await loadData()).exercises
}

/** Boot sql.js and seed a fresh database. */
export async function openLab(): Promise<Database> {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    // No locateFile needed: the asm.js build embeds the engine.
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    const { seed } = await loadData()
    for (const stmt of seed) db.run(stmt)
    return db
  })()
  return dbPromise
}

export function resetLab(db: Database): void {
  const data = cache
  if (!data) return
  db.exec('DROP TABLE IF EXISTS employees; DROP TABLE IF EXISTS customers;')
  for (const stmt of data.seed) {
    // Skip the CREATE for tables that are dropped above; keep the rest.
    if (/^CREATE TABLE (employees|customers)/i.test(stmt)) continue
    try {
      db.run(stmt)
    } catch {
      /* a table that still exists is fine */
    }
  }
}

export interface RunResult {
  ok: boolean
  columns: string[]
  rows: (string | number | null)[][]
  error?: string
  ms: number
}

/** Run a query and return the result set. */
export function runQuery(db: Database, sql: string): RunResult {
  const t0 = performance.now()
  try {
    const res = db.exec(sql)
    const ms = Math.round(performance.now() - t0)
    if (!res.length) return { ok: true, columns: [], rows: [], ms }
    const first = res[0]
    return { ok: true, columns: first.columns, rows: first.values as any[], ms }
  } catch (e) {
    return {
      ok: false,
      columns: [],
      rows: [],
      error: (e as Error).message || 'SQL error',
      ms: Math.round(performance.now() - t0),
    }
  }
}

/** Insert rows a beginner would want handy (v7's keyword chips). */
export const QUICK_INSERT = [
  "INSERT INTO employees (name, department, salary) VALUES ('Ali', 'Engineering', 90000)",
  "UPDATE employees SET salary = salary * 1.1 WHERE department = 'Engineering'",
  "DELETE FROM employees WHERE salary < 50000",
  'SELECT COUNT(*) FROM employees',
  "SELECT * FROM customers WHERE city = 'Lahore' LIMIT 5",
  'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 10',
  "SELECT department, AVG(salary) FROM employees GROUP BY department",
]

/** Compare the user's result set with the reference solution.
 *  Order only matters when the exercise says so (`ord`). */
export function checkAnswer(
  ex: LabExercise,
  sql: string,
  db: Database,
): { pass: boolean; got: RunResult; want: RunResult; note: string } {
  const got = runQuery(db, sql)
  if (!got.ok) return { pass: false, got, want: { ok: true, columns: [], rows: [], ms: 0 }, note: 'Fix the error first.' }
  const want = runQuery(db, ex.sol)

  if (!want.rows.length && !got.rows.length) {
    return { pass: true, got, want, note: 'Ran without error. The reference returns no rows either.' }
  }
  if (got.rows.length !== want.rows.length) {
    return {
      pass: false,
      got,
      want,
      note: `Right idea, wrong row count. You got ${got.rows.length}, the answer has ${want.rows.length}.`,
    }
  }
  if (got.columns.length !== want.columns.length) {
    return { pass: false, got, want, note: 'Different number of columns. Check what you selected.' }
  }

  // Compare as sets of stringified cells unless order matters.
  const norm = (r: any[]) => r.map((c) => (c === null ? 'NULL' : String(c).trim().toLowerCase()))
  const ordered = !!ex.ord?.length
  const gotRows = got.rows.map(norm)
  const wantRows = want.rows.map(norm)
  if (ordered) {
    const same = gotRows.length === wantRows.length && gotRows.every((r, i) => r.join('|') === wantRows[i].join('|'))
    return {
      pass: same,
      got,
      want,
      note: same ? 'Correct, and the order matches too.' : 'Right rows, wrong order. This one checks the ordering.',
    }
  }
  const key = (r: string[]) => [...r].sort().join('|')
  const wantKeys = new Set(wantRows.map(key))
  const same = gotRows.every((r) => wantKeys.has(key(r)))
  return {
    pass: same,
    got,
    want,
    note: same ? 'Correct.' : 'Some values are not in the expected answer. Compare them side by side.',
  }
}

/** Which tables exist, for the playground helper list. */
export function tableNames(db: Database): string[] {
  const res = runQuery(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  return res.rows.map((r) => String(r[0]))
}
