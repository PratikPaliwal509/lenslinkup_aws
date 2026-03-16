import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' })
  }

  const token = auth.slice(7)
  try {
    const payload = verifyAccessToken(token)
    ;(request as any).user = payload

    // Fire-and-forget: update lastActiveAt (throttled to avoid excessive writes)
    const userId = payload.sub as string;
    (request.server as any).prisma.user
      .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
      .catch(() => {})
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' })
  }
}
