import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

const submitSchema = z.object({
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().trim().max(500).optional(),
  workPostId: z.string().optional(),
})

export default async function reviewRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/reviews/:userId
   * Submit (or update) a review for a user.
   * One review per reviewer–reviewee pair (upsert).
   */
  fastify.post('/:userId', { preHandler: authenticate }, async (request, reply) => {
    const reviewerId = (request as any).user.sub as string
    const revieweeId = (request.params as { userId: string }).userId

    if (reviewerId === revieweeId) {
      return reply.status(400).send({ error: 'You cannot review yourself' })
    }

    const body = submitSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { rating, comment, workPostId } = body.data

    // Verify workPost belongs to one of the two parties (optional check)
    if (workPostId) {
      const post = await fastify.prisma.workPost.findFirst({
        where: { id: workPostId, userId: { in: [reviewerId, revieweeId] } },
      })
      if (!post) return reply.status(404).send({ error: 'Work post not found' })
    }

    // Upsert the review
    const review = await fastify.prisma.review.upsert({
      where:  { reviewerId_revieweeId: { reviewerId, revieweeId } },
      update: { rating, comment: comment ?? null, workPostId: workPostId ?? null },
      create: { reviewerId, revieweeId, rating, comment: comment ?? null, workPostId: workPostId ?? null },
    })

    // Recompute and store avgRating + reviewCount on the profile
    const agg = await fastify.prisma.review.aggregate({
      where: { revieweeId },
      _avg:   { rating: true },
      _count: { rating: true },
    })

    await fastify.prisma.profile.updateMany({
      where: { userId: revieweeId },
      data:  {
        avgRating:   agg._avg.rating   ?? 0,
        reviewCount: agg._count.rating ?? 0,
      },
    })

    return reply.status(201).send({ review })
  })

  /**
   * GET /api/reviews/:userId
   * List all reviews for a user (newest first).
   */
  fastify.get('/:userId', async (request, reply) => {
    const revieweeId = (request.params as { userId: string }).userId

    const [reviews, profile] = await Promise.all([
      fastify.prisma.review.findMany({
        where:   { revieweeId },
        orderBy: { createdAt: 'desc' },
        take:    50,
        select: {
          id:        true,
          rating:    true,
          comment:   true,
          createdAt: true,
          workPost:  { select: { id: true, title: true } },
          reviewer:  {
            select: {
              id: true,
              profile: {
                select: { displayName: true, avatarUrl: true, title: true },
              },
            },
          },
        },
      }),
      fastify.prisma.profile.findUnique({
        where:  { userId: revieweeId },
        select: { avgRating: true, reviewCount: true },
      }),
    ])

    return reply.send({
      avgRating:   profile?.avgRating   ?? 0,
      reviewCount: profile?.reviewCount ?? 0,
      reviews,
    })
  })

  /**
   * DELETE /api/reviews/:userId
   * Delete your own review of a user.
   */
  fastify.delete('/:userId', { preHandler: authenticate }, async (request, reply) => {
    const reviewerId = (request as any).user.sub as string
    const revieweeId = (request.params as { userId: string }).userId

    const deleted = await fastify.prisma.review.deleteMany({
      where: { reviewerId, revieweeId },
    })

    if (deleted.count === 0) {
      return reply.status(404).send({ error: 'Review not found' })
    }

    // Recompute avg after deletion
    const agg = await fastify.prisma.review.aggregate({
      where: { revieweeId },
      _avg:   { rating: true },
      _count: { rating: true },
    })

    await fastify.prisma.profile.updateMany({
      where: { userId: revieweeId },
      data:  {
        avgRating:   agg._avg.rating   ?? 0,
        reviewCount: agg._count.rating ?? 0,
      },
    })

    return reply.send({ success: true })
  })
}
