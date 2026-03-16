import { createSigner, createVerifier } from 'fast-jwt'
import type { JwtPayload } from '../types/index.js'

// const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!
// const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_SECRET  = "abcdefghijklmnopqrstuvwxyz"
const REFRESH_SECRET = "abcdefghijklmnopqrstuvwxyz"


// ── Signers ──────────────────────────────────────────────────────────────────

const signAccess = createSigner({
  key: ACCESS_SECRET,
  expiresIn: 15 * 60 * 1000,        // 15 minutes in ms
  algorithm: 'HS256',
})

const signRefresh = createSigner({
  key: REFRESH_SECRET,
  expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  algorithm: 'HS256',
})

// ── Verifiers ────────────────────────────────────────────────────────────────

const verifyAccess = createVerifier({
  key: ACCESS_SECRET,
  algorithms: ['HS256'],
})

const verifyRefresh = createVerifier({
  key: REFRESH_SECRET,
  algorithms: ['HS256'],
})

// ── Public API ────────────────────────────────────────────────────────────────

export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return signAccess({ ...payload, type: 'access' })
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return signRefresh({ ...payload, type: 'refresh' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return verifyAccess(token) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return verifyRefresh(token) as JwtPayload
}
