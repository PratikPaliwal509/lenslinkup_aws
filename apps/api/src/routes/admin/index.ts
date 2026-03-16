import type { FastifyInstance } from 'fastify'
import { adminAuthenticate } from '../../middleware/adminAuthenticate.js'

// ── Default settings (first-boot fallback) ────────────────────────────────────

const DEFAULT_SETTINGS: Record<string, string> = {
  free_post_limit:       '3',   // OPEN posts a free user can have at once
  premium_post_limit:    '20',  // OPEN posts a premium user can have at once
  free_bid_limit:        '10',  // bids a free user can submit total per month
  premium_bid_limit:     '100', // bids a premium user can submit per month
  free_service_limit:    '5',   // services/products a free user can list
  premium_service_limit: '25',  // services/products a premium user can list
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function adminRoutes(fastify: FastifyInstance) {

  // ── Stats dashboard ──────────────────────────────────────────────────────────

  fastify.get(
    '/stats',
    { preHandler: adminAuthenticate },
    async (_request, reply) => {
      const [
        totalUsers,
        totalProfiles,
        verifiedUsers,
        premiumUsers,
        totalPosts,
        openPosts,
        totalBids,
        totalConnections,
        recentUsers,
      ] = await Promise.all([
        fastify.prisma.user.count(),
        fastify.prisma.profile.count(),
        fastify.prisma.profile.count({ where: { isVerified: true } }),
        fastify.prisma.profile.count({ where: { isPremium: true } }),
        fastify.prisma.workPost.count(),
        fastify.prisma.workPost.count({ where: { status: 'OPEN' } }),
        fastify.prisma.bid.count(),
        fastify.prisma.connection.count({ where: { status: 'ACCEPTED' } }),
        fastify.prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        }),
      ])

      return reply.send({
        stats: {
          users:       { total: totalUsers, withProfile: totalProfiles, verified: verifiedUsers, premium: premiumUsers, last7Days: recentUsers },
          posts:       { total: totalPosts, open: openPosts },
          bids:        { total: totalBids },
          connections: { total: totalConnections },
        },
      })
    },
  )

  // ── User management ──────────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string; filter?: string }
  }>(
    '/users',
    { preHandler: adminAuthenticate },
    async (request, reply) => {
      const page   = Math.max(1, parseInt(request.query.page  ?? '1',  10))
      const limit  = Math.min(50, parseInt(request.query.limit ?? '20', 10))
      const skip   = (page - 1) * limit
      const search = request.query.search?.trim()
      const filter = request.query.filter  // 'verified' | 'premium' | 'banned' | undefined

      const profileWhere: Record<string, unknown> = {}
      if (filter === 'verified') profileWhere.isVerified = true
      if (filter === 'premium')  profileWhere.isPremium  = true
      if (filter === 'banned')   profileWhere.isActive   = false

      const where: Record<string, unknown> = {}
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { displayName: { contains: search, mode: 'insensitive' } } },
        ]
      }
      if (Object.keys(profileWhere).length > 0) {
        where.profile = { ...((where.profile as object | undefined) ?? {}), ...profileWhere }
      }

      const [users, total] = await Promise.all([
        fastify.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id:              true,
            email:           true,
            role:            true,
            isEmailVerified: true,
            createdAt:       true,
            profile: {
              select: {
                displayName: true,
                avatarUrl:   true,
                city:        true,
                isVerified:  true,
                isPremium:   true,
                isActive:    true,
                categories: {
                  take: 1,
                  select: { category: { select: { name: true, emoji: true } } },
                },
              },
            },
            _count: {
              select: { workPosts: true, bids: true, sentConnections: true },
            },
          },
        }),
        fastify.prisma.user.count({ where }),
      ])

      return reply.send({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      })
    },
  )

  // PATCH /admin/users/:userId — toggle verified / premium / banned / promote admin
  fastify.patch<{
    Params: { userId: string }
    Body: {
      isVerified?: boolean
      isPremium?:  boolean
      isActive?:   boolean   // false = banned
      role?:       'USER' | 'ADMIN'
    }
  }>(
    '/users/:userId',
    { preHandler: adminAuthenticate },
    async (request, reply) => {
      const { userId } = request.params
      const { isVerified, isPremium, isActive, role } = request.body

      // Update profile fields (verified, premium, active/banned)
      const profileUpdates: Record<string, unknown> = {}
      if (isVerified !== undefined) profileUpdates.isVerified = isVerified
      if (isPremium  !== undefined) profileUpdates.isPremium  = isPremium
      if (isActive   !== undefined) profileUpdates.isActive   = isActive

      const [profile, user] = await Promise.all([
        Object.keys(profileUpdates).length > 0
          ? fastify.prisma.profile.update({
              where:  { userId },
              data:   profileUpdates,
              select: { isVerified: true, isPremium: true, isActive: true },
            })
          : Promise.resolve(null),

        role !== undefined
          ? fastify.prisma.user.update({
              where:  { id: userId },
              data:   { role },
              select: { role: true },
            })
          : Promise.resolve(null),
      ])

      return reply.send({ updated: { ...profile, ...user } })
    },
  )

  // ── Posts management ──────────────────────────────────────────────────────────

  fastify.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string }
  }>(
    '/posts',
    { preHandler: adminAuthenticate },
    async (request, reply) => {
      const page   = Math.max(1, parseInt(request.query.page  ?? '1',  10))
      const limit  = Math.min(50, parseInt(request.query.limit ?? '20', 10))
      const skip   = (page - 1) * limit
      const search = request.query.search?.trim()
      const status = request.query.status  // 'OPEN' | 'CLOSED' | 'CANCELLED' | undefined

      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (search) {
        where.OR = [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [posts, total] = await Promise.all([
        fastify.prisma.workPost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id:           true,
            title:        true,
            status:       true,
            categorySlug: true,
            city:         true,
            budget:       true,
            createdAt:    true,
            user: {
              select: {
                id:    true,
                email: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
            _count: { select: { bids: true } },
          },
        }),
        fastify.prisma.workPost.count({ where }),
      ])

      return reply.send({
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      })
    },
  )

  // PATCH /admin/posts/:postId/cancel — force cancel any post
  fastify.patch<{ Params: { postId: string } }>(
    '/posts/:postId/cancel',
    { preHandler: adminAuthenticate },
    async (request, reply) => {
      const post = await fastify.prisma.workPost.update({
        where:  { id: request.params.postId },
        data:   { status: 'CANCELLED' },
        select: { id: true, status: true },
      })
      return reply.send({ post })
    },
  )

  // ── App Settings ─────────────────────────────────────────────────────────────

  fastify.get(
    '/settings',
    { preHandler: adminAuthenticate },
    async (_request, reply) => {
      const rows = await fastify.prisma.appSettings.findMany()

      // Merge DB rows with defaults for any missing keys
      const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
      for (const row of rows) {
        settingsMap[row.key] = row.value
      }

      return reply.send({ settings: settingsMap })
    },
  )

  fastify.put<{
    Body: {
      free_post_limit?:       number
      premium_post_limit?:    number
      free_bid_limit?:        number
      premium_bid_limit?:     number
      free_service_limit?:    number
      premium_service_limit?: number
    }
  }>(
    '/settings',
    { preHandler: adminAuthenticate },
    async (request, reply) => {
      const updates = request.body

      // Upsert each provided setting
      await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          fastify.prisma.appSettings.upsert({
            where:  { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
          }),
        ),
      )

      // Return current settings after update
      const rows = await fastify.prisma.appSettings.findMany()
      const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
      for (const row of rows) {
        settingsMap[row.key] = row.value
      }

      return reply.send({ settings: settingsMap })
    },
  )
}
