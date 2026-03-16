import { prisma } from '@lenslinkup/db'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('prisma', prisma)
  fastify.addHook('onClose', async () => prisma.$disconnect())
}

export default fp(prismaPlugin, { name: 'prisma' })

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}
