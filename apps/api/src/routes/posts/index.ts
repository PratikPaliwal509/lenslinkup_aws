import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { notify }       from '../../lib/notify.js'

// ── Validation ────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  title:        z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description:  z.string().trim().min(20, 'Describe your requirement in at least 20 characters').max(2000),
  categorySlug: z.string().trim().optional(),
  city:         z.string().trim().max(100).optional(),
  budget:       z.number().int().positive().optional(),
  eventDate:    z.string().datetime().optional(),
})

const createBidSchema = z.object({
  amount:  z.number().int().positive('Amount must be a positive integer'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(500),
})

// ── Shared selects ────────────────────────────────────────────────────────────

const POST_SELECT = {
  id:           true,
  title:        true,
  description:  true,
  categorySlug: true,
  city:         true,
  budget:       true,
  eventDate:    true,
  status:       true,
  createdAt:    true,
  updatedAt:    true,
  userId:       true,
  user: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl:   true,
          city:        true,
          isVerified:  true,
          isPremium:   true,
        },
      },
    },
  },
  _count: { select: { bids: true } },
} as const

const BID_SELECT = {
  id:        true,
  amount:    true,
  message:   true,
  status:    true,
  createdAt: true,
  bidder: {
    select: {
      id: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl:   true,
          title:       true,
          city:        true,
          isVerified:  true,
        },
      },
    },
  },
} as const

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function postRoutes(fastify: FastifyInstance) {

  // POST /api/posts  — create a work post (protected)
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createPostSchema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { title, description, categorySlug, city, budget, eventDate } = result.data

    // ── Post cap check ───────────────────────────────────────────────────────
    const [profile, activeCount] = await Promise.all([
      fastify.prisma.profile.findUnique({ where: { userId }, select: { isPremium: true } }),
      fastify.prisma.workPost.count({ where: { userId, status: 'OPEN' } }),
    ])

    const limitKey  = profile?.isPremium ? 'premium_post_limit' : 'free_post_limit'
    const setting   = await fastify.prisma.appSettings.findUnique({ where: { key: limitKey } })
    const postLimit = parseInt(setting?.value ?? (profile?.isPremium ? '20' : '3'), 10)

    if (activeCount >= postLimit) {
      return reply.status(403).send({
        statusCode: 403, error: 'Forbidden',
        message: profile?.isPremium
          ? `Premium accounts can have up to ${postLimit} active posts.`
          : `Free accounts can have up to ${postLimit} active posts. Upgrade to Premium for more.`,
      })
    }
    // ─────────────────────────────────────────────────────────────────────────

    const post = await fastify.prisma.workPost.create({
      data: {
        userId,
        title,
        description,
        categorySlug,
        city,
        budget,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
      select: POST_SELECT,
    })

    return reply.status(201).send({ post })
  })

  // GET /api/posts  — public paginated feed
  fastify.get<{ Querystring: { categorySlug?: string; city?: string; page?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const { categorySlug, city, page = '1', limit = '15' } = request.query
      const pageNum  = Math.max(1, parseInt(page, 10)  || 1)
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15))
      const skip     = (pageNum - 1) * limitNum

      const where: Record<string, unknown> = { status: 'OPEN' }
      if (categorySlug) where['categorySlug'] = categorySlug
      if (city)         where['city']         = { contains: city, mode: 'insensitive' }

      const [posts, total] = await Promise.all([
        fastify.prisma.workPost.findMany({
          where,
          skip,
          take:    limitNum,
          orderBy: { createdAt: 'desc' },
          select:  POST_SELECT,
        }),
        fastify.prisma.workPost.count({ where }),
      ])

      return reply.send({
        posts,
        pagination: {
          page: pageNum, limit: limitNum, total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total,
        },
      })
    },
  )

  // GET /api/posts/mine  — my own posts (protected)
  fastify.get('/mine', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const posts = await fastify.prisma.workPost.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  POST_SELECT,
    })

    return reply.send({ posts })
  })

  // GET /api/posts/:postId  — single post detail (public)
  fastify.get<{ Params: { postId: string } }>('/:postId', async (request, reply) => {
    const { postId } = request.params

    const post = await fastify.prisma.workPost.findUnique({
      where:  { id: postId },
      select: POST_SELECT,
    })

    if (!post) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
    }

    return reply.send({ post })
  })

  // DELETE /api/posts/:postId  — cancel / delete (poster only)
  fastify.delete<{ Params: { postId: string } }>(
    '/:postId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId   = (request as any).user.sub as string
      const { postId } = request.params

      const post = await fastify.prisma.workPost.findUnique({
        where:  { id: postId },
        select: { id: true, userId: true },
      })

      if (!post) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
      if (post.userId !== userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your post' })

      await fastify.prisma.workPost.update({ where: { id: postId }, data: { status: 'CANCELLED' } })
      return reply.status(204).send()
    },
  )

  // ── Bids ────────────────────────────────────────────────────────────────────

  // POST /api/posts/:postId/bids  — submit a bid (protected, not own post)
  fastify.post<{ Params: { postId: string } }>(
    '/:postId/bids',
    { preHandler: authenticate },
    async (request, reply) => {
      const bidderId = (request as any).user.sub as string
      const { postId } = request.params

      const post = await fastify.prisma.workPost.findUnique({
        where:  { id: postId },
        select: { id: true, userId: true, status: true },
      })

      if (!post) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
      if (post.userId === bidderId) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot bid on your own post' })
      if (post.status !== 'OPEN') return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Post is no longer accepting bids' })

      const result = createBidSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({
          statusCode: 400, error: 'Bad Request',
          message: result.error.issues[0]?.message ?? 'Validation error',
        })
      }

      // Check duplicate bid
      const existing = await fastify.prisma.bid.findUnique({ where: { postId_bidderId: { postId, bidderId } } })
      if (existing) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'You have already bid on this post' })

      const bid = await fastify.prisma.bid.create({
        data: { postId, bidderId, amount: result.data.amount, message: result.data.message },
        select: BID_SELECT,
      })

      // Notify the poster
      const [postDetails, bidderProfile] = await Promise.all([
        fastify.prisma.workPost.findUnique({ where: { id: postId }, select: { title: true } }),
        fastify.prisma.profile.findUnique({ where: { userId: bidderId }, select: { displayName: true } }),
      ])
      notify(fastify.prisma, {
        userId:    post.userId,
        type:      'BID_RECEIVED',
        title:     'New bid received',
        message:   `${bidderProfile?.displayName ?? 'Someone'} submitted a bid on "${postDetails?.title ?? 'your post'}".`,
        relatedId: postId,
      })

      // Auto-create CRM Lead + Contact for post owner (fire-and-forget)
      ;(async () => {
        try {
          const bidderProf = await fastify.prisma.profile.findUnique({
            where: { userId: bidderId },
            select: { displayName: true, phone: true },
          })
          let contact = await fastify.prisma.contact.findFirst({
            where: { userId: post.userId, linkedUserId: bidderId },
            select: { id: true },
          })
          if (!contact) {
            contact = await fastify.prisma.contact.create({
              data: { userId: post.userId, linkedUserId: bidderId, name: bidderProf?.displayName ?? 'Unknown', phone: bidderProf?.phone ?? undefined },
              select: { id: true },
            })
          }
          await fastify.prisma.lead.create({
            data: { userId: post.userId, title: postDetails?.title ?? 'New lead from bid', contactId: contact.id, linkedPostId: postId, linkedBidId: bid.id, status: 'NEW' },
          })
        } catch {}
      })()

      return reply.status(201).send({ bid })
    },
  )

  // GET /api/posts/:postId/bids  — list bids (poster only)
  fastify.get<{ Params: { postId: string } }>(
    '/:postId/bids',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId   = (request as any).user.sub as string
      const { postId } = request.params

      const post = await fastify.prisma.workPost.findUnique({
        where:  { id: postId },
        select: { id: true, userId: true },
      })

      if (!post) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
      if (post.userId !== userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the poster can see bids' })

      const bids = await fastify.prisma.bid.findMany({
        where:   { postId },
        orderBy: { createdAt: 'desc' },
        select:  BID_SELECT,
      })

      return reply.send({ bids, total: bids.length })
    },
  )

  // PATCH /api/posts/:postId/bids/:bidId/accept  — accept a bid (poster only)
  fastify.patch<{ Params: { postId: string; bidId: string } }>(
    '/:postId/bids/:bidId/accept',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId   = (request as any).user.sub as string
      const { postId, bidId } = request.params

      const post = await fastify.prisma.workPost.findUnique({
        where:  { id: postId },
        select: { id: true, userId: true, status: true },
      })

      if (!post) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
      if (post.userId !== userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your post' })
      if (post.status !== 'OPEN') return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Post is already closed' })

      // Pre-fetch bid data for notifications (before transaction)
      const [bidToAccept, bidsToReject, postInfo] = await Promise.all([
        fastify.prisma.bid.findUnique({ where: { id: bidId }, select: { bidderId: true } }),
        fastify.prisma.bid.findMany({
          where:  { postId, id: { not: bidId }, status: 'PENDING' },
          select: { bidderId: true },
        }),
        fastify.prisma.workPost.findUnique({ where: { id: postId }, select: { title: true } }),
      ])

      // Accept target bid, reject all others, close post
      await fastify.prisma.$transaction([
        fastify.prisma.bid.update({
          where: { id: bidId },
          data:  { status: 'ACCEPTED' },
        }),
        fastify.prisma.bid.updateMany({
          where: { postId, id: { not: bidId }, status: 'PENDING' },
          data:  { status: 'REJECTED' },
        }),
        fastify.prisma.workPost.update({
          where: { id: postId },
          data:  { status: 'CLOSED' },
        }),
      ])

      // Notify accepted bidder
      if (bidToAccept) {
        notify(fastify.prisma, {
          userId:    bidToAccept.bidderId,
          type:      'BID_ACCEPTED',
          title:     '🎉 Your bid was accepted!',
          message:   `Your proposal for "${postInfo?.title ?? 'a post'}" was selected. The client will be in touch.`,
          relatedId: postId,
        })
      }
      // Notify rejected bidders
      for (const rb of bidsToReject) {
        notify(fastify.prisma, {
          userId:    rb.bidderId,
          type:      'BID_REJECTED',
          title:     'Post has been filled',
          message:   `The client selected another professional for "${postInfo?.title ?? 'a post'}".`,
          relatedId: postId,
        })
      }

      return reply.send({ message: 'Bid accepted, post closed' })
    },
  )

  // PATCH /api/posts/:postId/bids/:bidId/reject  — reject one bid (poster only)
  fastify.patch<{ Params: { postId: string; bidId: string } }>(
    '/:postId/bids/:bidId/reject',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId   = (request as any).user.sub as string
      const { postId, bidId } = request.params

      const post = await fastify.prisma.workPost.findUnique({
        where:  { id: postId },
        select: { id: true, userId: true },
      })

      if (!post) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Post not found' })
      if (post.userId !== userId) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your post' })

      await fastify.prisma.bid.update({
        where: { id: bidId },
        data:  { status: 'REJECTED' },
      })

      return reply.status(204).send()
    },
  )

  // GET /api/posts/my-bids  — bids I have submitted (protected)
  fastify.get('/my-bids', { preHandler: authenticate }, async (request, reply) => {
    const bidderId = (request as any).user.sub as string

    const bids = await fastify.prisma.bid.findMany({
      where:   { bidderId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        amount:    true,
        message:   true,
        status:    true,
        createdAt: true,
        post: {
          select: {
            id:    true,
            title: true,
            status: true,
            city:  true,
            user:  { select: { profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
      },
    })

    return reply.send({ bids })
  })
}
