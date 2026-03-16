import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'

export default async function notificationRoutes(fastify: FastifyInstance) {

  // ── GET /api/notifications — my notifications (latest 50) ──────────────────

  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId  = (request as any).user.sub as string
      const page  = Math.max(1, parseInt((request.query as any).page  ?? '1',  10))
      const limit = Math.min(50, parseInt((request.query as any).limit ?? '20', 10))
      const skip  = (page - 1) * limit

      const [notifications, total] = await Promise.all([
        fastify.prisma.notification.findMany({
          where:   { userId: myId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true, type: true, title: true, message: true,
            relatedId: true, isRead: true, createdAt: true,
          },
        }),
        fastify.prisma.notification.count({ where: { userId: myId } }),
      ])

      return reply.send({
        notifications,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      })
    },
  )

  // ── GET /api/notifications/unread-count ────────────────────────────────────

  fastify.get(
    '/unread-count',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string
      const count = await fastify.prisma.notification.count({
        where: { userId: myId, isRead: false },
      })
      return reply.send({ count })
    },
  )

  // ── PATCH /api/notifications/:id/read — mark one as read ──────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/:id/read',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string
      await fastify.prisma.notification.updateMany({
        where: { id: request.params.id, userId: myId },
        data:  { isRead: true },
      })
      return reply.send({ ok: true })
    },
  )

  // ── PATCH /api/notifications/read-all — mark all read ─────────────────────

  fastify.patch(
    '/read-all',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string
      await fastify.prisma.notification.updateMany({
        where: { userId: myId, isRead: false },
        data:  { isRead: true },
      })
      return reply.send({ ok: true })
    },
  )
}
