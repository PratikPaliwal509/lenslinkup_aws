import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { notify }       from '../../lib/notify.js'

// ── Shared profile select ─────────────────────────────────────────────────────

const MINI_PROFILE = {
  displayName: true,
  title:       true,
  avatarUrl:   true,
  city:        true,
  area:        true,
  isVerified:  true,
  isPremium:   true,
  categories: {
    take: 2,
    select: { category: { select: { name: true, emoji: true, slug: true } } },
  },
} as const

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function connectionRoutes(fastify: FastifyInstance) {

  // POST /api/connections/:targetUserId  — send connection request
  fastify.post<{ Params: { targetUserId: string } }>(
    '/:targetUserId',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId       = (request as any).user.sub as string
      const { targetUserId } = request.params

      if (myId === targetUserId) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot connect to yourself' })
      }

      // Check target user exists
      const target = await fastify.prisma.user.findUnique({
        where:  { id: targetUserId },
        select: { id: true },
      })
      if (!target) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
      }

      // Check if connection already exists in either direction
      const existing = await fastify.prisma.connection.findFirst({
        where: {
          OR: [
            { senderId: myId,        receiverId: targetUserId },
            { senderId: targetUserId, receiverId: myId       },
          ],
        },
      })

      if (existing) {
        const msg =
          existing.status === 'ACCEPTED' ? 'Already connected' :
          existing.status === 'PENDING'  ? 'Request already sent or pending' :
          'Connection was previously rejected'
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: msg })
      }

      const connection = await fastify.prisma.connection.create({
        data: { senderId: myId, receiverId: targetUserId, status: 'PENDING' },
        select: { id: true, status: true, createdAt: true },
      })

      // Notify the receiver
      const senderProfile = await fastify.prisma.profile.findUnique({
        where: { userId: myId }, select: { displayName: true },
      })
      notify(fastify.prisma, {
        userId:    targetUserId,
        type:      'CONNECTION_REQUEST',
        title:     'New connection request',
        message:   `${senderProfile?.displayName ?? 'Someone'} sent you a connection request.`,
        relatedId: connection.id,
      })

      return reply.status(201).send({ connection })
    },
  )

  // PATCH /api/connections/:connectionId/accept  — accept a pending request
  fastify.patch<{ Params: { connectionId: string } }>(
    '/:connectionId/accept',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId             = (request as any).user.sub as string
      const { connectionId } = request.params

      const conn = await fastify.prisma.connection.findUnique({
        where:  { id: connectionId },
        select: { id: true, receiverId: true, status: true },
      })

      if (!conn) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Connection not found' })
      }
      if (conn.receiverId !== myId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the receiver can accept' })
      }
      if (conn.status !== 'PENDING') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Connection is not pending' })
      }

      const updated = await fastify.prisma.connection.update({
        where: { id: connectionId },
        data:  { status: 'ACCEPTED' },
        select: { id: true, status: true, senderId: true },
      })

      // Notify the original sender that their request was accepted
      const acceptorProfile = await fastify.prisma.profile.findUnique({
        where: { userId: myId }, select: { displayName: true },
      })
      notify(fastify.prisma, {
        userId:    updated.senderId,
        type:      'CONNECTION_ACCEPTED',
        title:     'Connection accepted',
        message:   `${acceptorProfile?.displayName ?? 'Someone'} accepted your connection request.`,
        relatedId: connectionId,
      })

      // Auto-create CRM Contacts for both parties (fire-and-forget)
      ;(async () => {
        try {
          const senderId = updated.senderId
          for (const [ownerId, linkedId] of [[myId, senderId], [senderId, myId]] as [string, string][]) {
            const exists = await fastify.prisma.contact.findFirst({
              where: { userId: ownerId, linkedUserId: linkedId }, select: { id: true },
            })
            if (!exists) {
              const prof = await fastify.prisma.profile.findUnique({
                where: { userId: linkedId }, select: { displayName: true, phone: true },
              })
              await fastify.prisma.contact.create({
                data: { userId: ownerId, linkedUserId: linkedId, name: prof?.displayName ?? 'Unknown', phone: prof?.phone ?? undefined },
              })
            }
          }
        } catch {}
      })()

      return reply.send({ connection: updated })
    },
  )

  // PATCH /api/connections/:connectionId/reject  — reject a pending request
  fastify.patch<{ Params: { connectionId: string } }>(
    '/:connectionId/reject',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId             = (request as any).user.sub as string
      const { connectionId } = request.params

      const conn = await fastify.prisma.connection.findUnique({
        where:  { id: connectionId },
        select: { id: true, receiverId: true, status: true },
      })

      if (!conn) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Connection not found' })
      }
      if (conn.receiverId !== myId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Only the receiver can reject' })
      }
      if (conn.status !== 'PENDING') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Connection is not pending' })
      }

      await fastify.prisma.connection.update({
        where: { id: connectionId },
        data:  { status: 'REJECTED' },
      })

      return reply.status(204).send()
    },
  )

  // DELETE /api/connections/:connectionId  — remove/withdraw a connection
  fastify.delete<{ Params: { connectionId: string } }>(
    '/:connectionId',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId             = (request as any).user.sub as string
      const { connectionId } = request.params

      const conn = await fastify.prisma.connection.findUnique({
        where:  { id: connectionId },
        select: { id: true, senderId: true, receiverId: true },
      })

      if (!conn) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Connection not found' })
      }
      if (conn.senderId !== myId && conn.receiverId !== myId) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your connection' })
      }

      await fastify.prisma.connection.delete({ where: { id: connectionId } })
      return reply.status(204).send()
    },
  )

  // GET /api/connections  — my connections list (accepted)
  fastify.get(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string

      const connections = await fastify.prisma.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ senderId: myId }, { receiverId: myId }],
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id:        true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: { id: true, profile: { select: MINI_PROFILE } },
          },
          receiver: {
            select: { id: true, profile: { select: MINI_PROFILE } },
          },
        },
      })

      // Normalise: return the "other" user from each connection
      const list = connections.map((c) => {
        const other = c.sender.id === myId ? c.receiver : c.sender
        return {
          connectionId: c.id,
          connectedAt:  c.updatedAt,
          user: {
            id:      other.id,
            profile: {
              ...other.profile,
              categories: other.profile?.categories.map((pc) => pc.category) ?? [],
            },
          },
        }
      })

      return reply.send({ connections: list, total: list.length })
    },
  )

  // GET /api/connections/pending  — incoming pending requests
  fastify.get(
    '/pending',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string

      const requests = await fastify.prisma.connection.findMany({
        where:   { receiverId: myId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          createdAt: true,
          sender: {
            select: { id: true, profile: { select: MINI_PROFILE } },
          },
        },
      })

      const list = requests.map((r) => ({
        connectionId: r.id,
        requestedAt:  r.createdAt,
        user: {
          id:      r.sender.id,
          profile: {
            ...r.sender.profile,
            categories: r.sender.profile?.categories.map((pc) => pc.category) ?? [],
          },
        },
      }))

      return reply.send({ requests: list, total: list.length })
    },
  )

  // GET /api/connections/sent  — my outgoing pending requests
  fastify.get(
    '/sent',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId = (request as any).user.sub as string

      const sent = await fastify.prisma.connection.findMany({
        where:   { senderId: myId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          createdAt: true,
          receiver: {
            select: { id: true, profile: { select: MINI_PROFILE } },
          },
        },
      })

      const list = sent.map((s) => ({
        connectionId: s.id,
        requestedAt:  s.createdAt,
        user: {
          id:      s.receiver.id,
          profile: {
            ...s.receiver.profile,
            categories: s.receiver.profile?.categories.map((pc) => pc.category) ?? [],
          },
        },
      }))

      return reply.send({ sent: list, total: list.length })
    },
  )

  // GET /api/connections/status/:targetUserId  — connection status with a specific user
  fastify.get<{ Params: { targetUserId: string } }>(
    '/status/:targetUserId',
    { preHandler: authenticate },
    async (request, reply) => {
      const myId             = (request as any).user.sub as string
      const { targetUserId } = request.params

      const conn = await fastify.prisma.connection.findFirst({
        where: {
          OR: [
            { senderId: myId,        receiverId: targetUserId },
            { senderId: targetUserId, receiverId: myId       },
          ],
        },
        select: { id: true, status: true, senderId: true },
      })

      if (!conn) {
        return reply.send({ status: 'NONE', connectionId: null })
      }

      return reply.send({
        status:       conn.status,
        connectionId: conn.id,
        isSender:     conn.senderId === myId,
      })
    },
  )
}
