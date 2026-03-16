import { randomBytes }    from 'crypto'
import type { FastifyInstance } from 'fastify'
import { z }               from 'zod'
import { hashPassword, verifyPassword }                         from '../../lib/hash.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../lib/jwt.js'
import { authenticate }    from '../../middleware/authenticate.js'
import { sendVerificationEmail, sendPasswordResetEmail }        from '../../lib/mailer.js'

// ── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email:       z.string().trim().toLowerCase().email(),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
})

const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

const resetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const REFRESH_TTL_SEC    = 7 * 24 * 60 * 60   // 7 days
const RESET_EXPIRY_MS    = 60 * 60 * 1000      // 1 hour

function refreshKey(userId: string) { return `refresh:${userId}` }
function token32()                  { return randomBytes(32).toString('hex') }

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function authRoutes(fastify: FastifyInstance) {

  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { email, password, displayName } = result.data
    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Email already in use' })
    }

    const passwordHash     = await hashPassword(password)
    const emailVerifyToken = token32()

    const user = await fastify.prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerifyToken,
        profile: { create: { displayName } },
      },
      select: { id: true, email: true, role: true },
    })

    // Send verification email (non-blocking — don't fail register if mail fails)
    sendVerificationEmail(email, emailVerifyToken).catch(() => {})

    const tokenPayload = { sub: user.id, email: user.email, role: user.role }
    const accessToken  = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    await fastify.redis.setex(refreshKey(user.id), REFRESH_TTL_SEC, refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)
    await fastify.prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt },
    })

    return reply.status(201).send({ accessToken, refreshToken, user })
  })

  // GET /api/auth/verify-email?token=...
  fastify.get('/verify-email', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Missing token' })
    }

    const user = await fastify.prisma.user.findFirst({
      where: { emailVerifyToken: token },
      select: { id: true },
    })
    if (!user) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid or expired token' })
    }

    await fastify.prisma.user.update({
      where: { id: user.id },
      data:  { isEmailVerified: true, emailVerifyToken: null },
    })

    return reply.send({ message: 'Email verified successfully' })
  })

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const result = forgotSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { email } = result.data
    const user = await fastify.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    // Always respond the same regardless of whether the user exists (prevents email enumeration)
    if (user) {
      const resetToken  = token32()
      const resetExpiry = new Date(Date.now() + RESET_EXPIRY_MS)
      await fastify.prisma.user.update({
        where: { id: user.id },
        data:  { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
      })
      sendPasswordResetEmail(email, resetToken).catch(() => {})
    }

    return reply.send({ message: 'If an account with that email exists, a reset link has been sent.' })
  })

  // POST /api/auth/reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const result = resetSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { token, password } = result.data
    const user = await fastify.prisma.user.findFirst({
      where: {
        passwordResetToken:  token,
        passwordResetExpiry: { gt: new Date() },   // not expired
      },
      select: { id: true },
    })

    if (!user) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: 'Invalid or expired reset token',
      })
    }

    const passwordHash = await hashPassword(password)
    await fastify.prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    })

    // Invalidate all sessions so the old password can't be used via cached tokens
    await fastify.prisma.session.deleteMany({ where: { userId: user.id } })
    await fastify.redis.del(refreshKey(user.id))

    return reply.send({ message: 'Password reset successfully. Please sign in with your new password.' })
  })

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { email, password } = result.data
    const user = await fastify.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true, isEmailVerified: true },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password' })
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role }
    const accessToken  = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    await fastify.prisma.session.deleteMany({ where: { userId: user.id } })
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)
    await fastify.prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt },
    })
    await fastify.redis.setex(refreshKey(user.id), REFRESH_TTL_SEC, refreshToken)

    const { passwordHash: _, ...safeUser } = user
    return reply.send({ accessToken, refreshToken, user: safeUser })
  })

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const body  = request.body as { refreshToken?: string }
    const token = body?.refreshToken
    if (!token) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Missing refreshToken' })
    }

    let payload
    try { payload = verifyRefreshToken(token) }
    catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token' })
    }

    const session = await fastify.prisma.session.findUnique({ where: { refreshToken: token } })
    if (!session || session.expiresAt < new Date()) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Session expired' })
    }

    const user = await fastify.prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, email: true, role: true },
    })
    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' })
    }

    const tokenPayload   = { sub: user.id, email: user.email, role: user.role }
    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefresh     = generateRefreshToken(tokenPayload)

    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)
    await fastify.prisma.session.update({
      where: { id: session.id },
      data:  { refreshToken: newRefresh, expiresAt },
    })
    await fastify.redis.setex(refreshKey(user.id), REFRESH_TTL_SEC, newRefresh)

    return reply.send({ accessToken: newAccessToken, refreshToken: newRefresh })
  })

  // GET /api/auth/me  (protected)
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const user = await fastify.prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, email: true, role: true, isEmailVerified: true, createdAt: true,
        profile: {
          select: {
            displayName: true, title: true, avatarUrl: true,
            city: true, state: true, isPremium: true, isVerified: true,
          },
        },
      },
    })
    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    }
    return reply.send({ user })
  })

  // POST /api/auth/logout  (protected)
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    await fastify.prisma.session.deleteMany({ where: { userId } })
    await fastify.redis.del(refreshKey(userId))
    return reply.status(204).send()
  })
}
