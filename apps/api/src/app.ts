import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import prismaPlugin from './plugins/prisma.js'
import redisPlugin  from './plugins/redis.js'
import s3Plugin     from './plugins/s3.js'
import routes       from './routes/index.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  // ── Core plugins ──────────────────────────────────────────────────────────
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://35.154.114.186:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await fastify.register(cookie)
  await fastify.register(sensible)

  // ── Infrastructure plugins ────────────────────────────────────────────────
  await fastify.register(prismaPlugin)
  await fastify.register(redisPlugin)
  await fastify.register(s3Plugin)

  // ── Health check (used by Railway / load balancers) ──────────────────────
  fastify.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  // ── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(routes)

  return fastify
}
