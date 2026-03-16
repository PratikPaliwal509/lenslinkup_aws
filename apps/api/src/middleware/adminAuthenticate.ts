import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'

export async function adminAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' })
  }

  const token = auth.slice(7)
  let payload: any
  try {
    payload = verifyAccessToken(token)
    ;(request as any).user = payload
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' })
  }

  const userId = payload?.sub as string
  if (!userId) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token payload' })
  }

  const dbUser = await (request.server as any).prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== 'ADMIN') {
    return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Admin access required' })
  }
}
