import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { Db } from 'mongodb'
import { getDb } from './mongodb.js'

const scrypt = promisify(scryptCallback)
const COOKIE = 'ibx_session'
const SESSION_DAYS = 30

type User = {
  _id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  createdAt: number
  /** Google OAuth subject id — present when signed in via Google. */
  googleId?: string
  /** Avatar URL from Google profile photo. */
  picture?: string
}
type Session = { _id: string; userId: string; expiresAt: Date; createdAt: number }
/** Per-user AI provider keys, stored server-side so they roam across devices. */
export type AiKeyRecord = { _id: string; keys: Record<string, string>; models: Record<string, string>; base: Record<string, string>; prov: string; mt: string; updatedAt: number }

export type ApiRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: any
  socket?: { remoteAddress?: string }
}
export type ApiResponse = {
  status(code: number): ApiResponse
  json(value: unknown): void
  setHeader(name: string, value: string | string[]): void
  end(): void
}

async function collections(db: Db) {
  const users = db.collection<User>('users')
  const sessions = db.collection<Session>('sessions')
  const aiKeys = db.collection<AiKeyRecord>('user_ai_keys')
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true, sparse: true }),
    users.createIndex({ googleId: 1 }, { unique: true, sparse: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
  ])
  return { users, sessions, aiKeys }
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

export function cookieIsSecure(req: ApiRequest) {
  const proto = req.headers['x-forwarded-proto']
  return process.env.VERCEL === '1' || proto === 'https'
}

export function setSessionCookie(res: ApiResponse, token: string, secure = true) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`)
}

export function clearSessionCookie(res: ApiResponse, secure = true) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`)
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
  return user ? { id: user._id, email: user.email, name: user.name, picture: user.picture } : null
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

/**
 * Find a user by their Google subject id (sub).
 * If no user exists yet for this Google account, create one (auto-register).
 * If a user with the same email already exists (from email/password signup),
 * link the Google id to that existing account.
 */
export async function upsertGoogleUser(googleId: string, email: string, name: string, picture?: string) {
  const db = await getDb()
  const { users } = await collections(db)

  // 1. Already has a Google account — update profile photo and return.
  const byGoogle = await users.findOneAndUpdate(
    { googleId },
    { $set: { name, picture } },
    { returnDocument: 'after' },
  )
  if (byGoogle) return { id: byGoogle._id, email: byGoogle.email, name: byGoogle.name, picture: byGoogle.picture }

  // 2. Email account exists — link the Google id to it.
  const byEmail = await users.findOneAndUpdate(
    { email },
    { $set: { googleId, picture } },
    { returnDocument: 'after' },
  )
  if (byEmail) return { id: byEmail._id, email: byEmail.email, name: byEmail.name, picture: byEmail.picture }

  // 3. Brand-new user — create account without a password.
  const id = randomBytes(16).toString('hex')
  const newUser: User = { _id: id, email, name, googleId, picture, passwordHash: '', salt: '', createdAt: Date.now() }
  await users.insertOne(newUser)
  return { id, email, name, picture }
}

/** Save AI provider key config for a user (upsert). */
export async function saveAiKeys(userId: string, payload: Omit<AiKeyRecord, '_id' | 'updatedAt'>) {
  const db = await getDb()
  const { aiKeys } = await collections(db)
  await aiKeys.updateOne(
    { _id: userId },
    { $set: { ...payload, updatedAt: Date.now() } },
    { upsert: true },
  )
}

/** Get saved AI provider key config for a user. */
export async function getAiKeys(userId: string): Promise<AiKeyRecord | null> {
  const db = await getDb()
  const { aiKeys } = await collections(db)
  return aiKeys.findOne({ _id: userId })
}

export async function database() {
  return getDb()
}
