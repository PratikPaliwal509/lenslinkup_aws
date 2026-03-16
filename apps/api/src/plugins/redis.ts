import { Redis } from 'ioredis'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  redis.on('error', (err) => fastify.log.error({ err }, 'Redis error'))
  redis.on('connect', () => fastify.log.info('Redis connected'))

  await redis.connect()

  fastify.decorate('redis', redis)
  fastify.addHook('onClose', async () => redis.quit())
}

export default fp(redisPlugin, { name: 'redis' })

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}
