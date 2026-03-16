import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoverQuery {
  search?:      string
  categorySlug?: string
  city?:        string
  page?:        string
  limit?:       string
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function discoverRoutes(fastify: FastifyInstance) {

  // GET /api/discover  — public, paginated profile search
  fastify.get<{ Querystring: DiscoverQuery }>('/', async (request, reply) => {
    const {
      search,
      categorySlug,
      city,
      page  = '1',
      limit = '20',
    } = request.query

    const pageNum  = Math.max(1, parseInt(page,  10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const skip     = (pageNum - 1) * limitNum

    // ── Build Prisma WHERE ────────────────────────────────────────────────────
    const where: Record<string, unknown> = {
      isActive: true,
      isPublic: true,
    }

    if (search?.trim()) {
      const term = search.trim()
      where['OR'] = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { title:       { contains: term, mode: 'insensitive' } },
        { bio:         { contains: term, mode: 'insensitive' } },
      ]
    }

    if (city?.trim()) {
      where['city'] = { contains: city.trim(), mode: 'insensitive' }
    }

    if (categorySlug?.trim()) {
      where['categories'] = {
        some: {
          category: { slug: categorySlug.trim() },
        },
      }
    }

    // ── Query ─────────────────────────────────────────────────────────────────
    const [profiles, total] = await Promise.all([
      fastify.prisma.profile.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { isPremium:  'desc' }, // premium first
          { isVerified: 'desc' },
          { updatedAt:  'desc' },
        ],
        select: {
          id:          true,
          userId:      true,
          displayName: true,
          title:       true,
          bio:         true,
          city:        true,
          state:       true,
          area:        true,
          avatarUrl:   true,
          isVerified:   true,
          isPremium:    true,
          avgRating:    true,
          reviewCount:  true,
          categories: {
            take: 3,
            select: {
              category: {
                select: { id: true, name: true, slug: true, emoji: true },
              },
            },
          },
        },
      }),
      fastify.prisma.profile.count({ where }),
    ])

    const flat = profiles.map((p) => ({
      ...p,
      categories: p.categories.map((pc) => pc.category),
    }))

    return reply.send({
      profiles: flat,
      pagination: {
        page:      pageNum,
        limit:     limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore:   pageNum * limitNum < total,
      },
    })
  })

  // GET /api/discover/active-near-you  — protected, active users in same city
  fastify.get('/active-near-you', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    // Get current user's city
    const me = await fastify.prisma.profile.findUnique({
      where:  { userId },
      select: { city: true },
    })

    if (!me?.city) {
      return reply.send({ profiles: [] })
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days

    const profiles = await fastify.prisma.profile.findMany({
      where: {
        isActive: true,
        isPublic: true,
        city:     { equals: me.city, mode: 'insensitive' },
        userId:   { not: userId },
        user:     { lastActiveAt: { gte: since } },
      },
      take:    15,
      orderBy: { user: { lastActiveAt: 'desc' } },
      select: {
        userId:      true,
        displayName: true,
        title:       true,
        avatarUrl:   true,
        isVerified:  true,
        isPremium:   true,
        user: { select: { lastActiveAt: true } },
      },
    })

    return reply.send({ city: me.city, profiles })
  })

  // GET /api/discover/cities  — public, list of active cities for filter
  fastify.get('/cities', async (_request, reply) => {
    const result = await fastify.prisma.profile.groupBy({
      by:      ['city'],
      where:   { isActive: true, isPublic: true, city: { not: null } },
      orderBy: { _count: { city: 'desc' } },
      take:    30,
      _count:  { city: true },
    })

    const cities = result
      .filter((r) => r.city)
      .map((r) => ({ city: r.city as string, count: r._count.city }))

    return reply.send({ cities })
  })
}
