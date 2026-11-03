import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { Collection, Db } from 'mongodb'
import { getDb } from './mongodb'

const scrypt = promisify(scryptCallback)
const COOKIE = 'ibx_session'
const SESSION_DAYS = 30

type User = { _id: string; email: string; name: string; passwordHash: string; salt: string; createdAt: number }
type Session = { _id: string; userId: string; expiresAt: Date; createdAt: number }

export type ApiRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: any
  socket?: { remoteAddress?: string }
}
export type ApiResponse = {
  status(code: number): ApiResponse
  json(value: unknown): void
  setHeader(name: string, value: string): void
  end(): void
}

async function collections(db: Db) {
  const users = db.collection<User>('users')
  const sessions = db.collection<Session>('sessions')
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
  ])
  return { users, sessions }
}

export function emailOf(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function cookieToken(req: ApiRequest): string {
  const raw = req.headers.cookie
  const cookie = Array.isArray(raw) ? raw.join(';') : raw || ''
  const entry = cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith(COOKIE + '='))
  return entry ? decodeURIComponent(entry.slice(COOKIE.length + 1)) : ''
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function setSessionCookie(res: ApiResponse, token: string) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`)
}

export function clearSessionCookie(res: ApiResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
}

export async function createSession(db: Db, userId: string) {
  const { sessions } = await collections(db)
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  await sessions.insertOne({
    _id: tokenHash(token), userId,
    createdAt: now,
    expiresAt: new Date(now + SESSION_DAYS * 86400_000),
  })
  return token
}

export async function currentUser(req: ApiRequest) {
  const token = cookieToken(req)
  if (!token) return null
  const db = await getDb()
  const { users, sessions } = await collections(db)
  const session = await sessions.findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } })
  if (!session) return null
  const user = await users.findOne({ _id: session.userId })
  return user ? { id: user._id, email: user.email, name: user.name } : null
}

export async function removeSession(req: ApiRequest) {
  const token = cookieToken(req)
  if (!token) return
  const db = await getDb()
  const { sessions } = await collections(db)
  await sessions.deleteOne({ _id: tokenHash(token) })
}

export async function passwordHash(password: string, salt: string) {
  return (await scrypt(password, salt, 64)) as Buffer
}

export async function verifyPassword(password: string, user: User) {
  const actual = await passwordHash(password, user.salt)
  const expected = Buffer.from(user.passwordHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function registerUser(email: string, name: string, password: string) {
  const db = await getDb()
  const { users } = await collections(db)
  const salt = randomBytes(16).toString('hex')
  const hash = await passwordHash(password, salt)
  const id = randomBytes(16).toString('hex')
  const user: User = { _id: id, email, name, salt, passwordHash: hash.toString('hex'), createdAt: Date.now() }
  await users.insertOne(user)
  return { id, email, name }
}

export async function findUser(email: string) {
  const db = await getDb()
  const { users } = await collections(db)
  return users.findOne({ email })
}

export async function database() {
  return getDb()
}
