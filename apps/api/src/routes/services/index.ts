import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ── Limits ────────────────────────────────────────────────────────────────────

const FREE_LIMIT    = 5
const PREMIUM_LIMIT = 25

async function getLimit(fastify: FastifyInstance, isPremium: boolean): Promise<number> {
  const key     = isPremium ? 'premium_service_limit' : 'free_service_limit'
  const setting = await fastify.prisma.appSettings.findUnique({ where: { key } })
  return parseInt(setting?.value ?? String(isPremium ? PREMIUM_LIMIT : FREE_LIMIT), 10)
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  type:        z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),
  name:        z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  price:       z.number().int().min(0).optional().nullable(),
  unit:        z.string().trim().max(40).optional().nullable(),
  imageUrl:    z.string().url().optional().nullable(),
  order:       z.number().int().min(0).optional(),
})

const updateSchema = createSchema.partial()

// ── Routes ────────────────────────────────────────────────────────────────────

export default async function serviceRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/services/:userId
   * Public — list all services/products for a user, ordered by `order` ASC.
   */
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }

    const items = await fastify.prisma.serviceProduct.findMany({
      where:   { userId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id:          true,
        type:        true,
        name:        true,
        description: true,
        price:       true,
        unit:        true,
        imageUrl:    true,
        order:       true,
        createdAt:   true,
      },
    })

    return reply.send({ items })
  })

  /**
   * POST /api/services
   * Authenticated — create a new service/product.
   * Enforces tier limit (5 free / 25 premium).
   */
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    // Check tier + current count in parallel
    const [profile, currentCount] = await Promise.all([
      fastify.prisma.profile.findUnique({ where: { userId }, select: { isPremium: true } }),
      fastify.prisma.serviceProduct.count({ where: { userId } }),
    ])

    const limit = await getLimit(fastify, profile?.isPremium ?? false)

    if (currentCount >= limit) {
      return reply.status(403).send({
        error:     'Service/product limit reached',
        limit,
        isPremium: profile?.isPremium ?? false,
        message:   profile?.isPremium
          ? `Premium accounts can have up to ${limit} services/products.`
          : `Free accounts can have up to ${limit} services/products. Upgrade to Premium for up to ${PREMIUM_LIMIT}.`,
      })
    }

    // Auto-assign order = current max + 1
    const maxOrder = await fastify.prisma.serviceProduct.aggregate({
      where: { userId },
      _max:  { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    const item = await fastify.prisma.serviceProduct.create({
      data: {
        userId,
        type:        body.data.type,
        name:        body.data.name,
        description: body.data.description ?? null,
        price:       body.data.price       ?? null,
        unit:        body.data.unit        ?? null,
        imageUrl:    body.data.imageUrl    ?? null,
        order:       body.data.order       ?? nextOrder,
      },
    })

    return reply.status(201).send({ item })
  })

  /**
   * PUT /api/services/:id
   * Authenticated — update own service/product.
   */
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as { id: string }

    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    // Verify ownership
    const existing = await fastify.prisma.serviceProduct.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ error: 'Service/product not found' })
    }

    const updated = await fastify.prisma.serviceProduct.update({
      where: { id },
      data:  {
        ...(body.data.type        !== undefined && { type:        body.data.type }),
        ...(body.data.name        !== undefined && { name:        body.data.name }),
        ...(body.data.description !== undefined && { description: body.data.description }),
        ...(body.data.price       !== undefined && { price:       body.data.price }),
        ...(body.data.unit        !== undefined && { unit:        body.data.unit }),
        ...(body.data.imageUrl    !== undefined && { imageUrl:    body.data.imageUrl }),
        ...(body.data.order       !== undefined && { order:       body.data.order }),
      },
    })

    return reply.send({ item: updated })
  })

  /**
   * DELETE /api/services/:id
   * Authenticated — delete own service/product.
   */
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as { id: string }

    const existing = await fastify.prisma.serviceProduct.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ error: 'Service/product not found' })
    }

    await fastify.prisma.serviceProduct.delete({ where: { id } })
    return reply.send({ success: true })
  })

  /**
   * PATCH /api/services/reorder
   * Authenticated — bulk update order for drag-and-drop reordering.
   * Body: { items: [{ id: string, order: number }] }
   */
  fastify.patch('/reorder', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const body = z.object({
      items: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    // Verify all items belong to this user, then update in transaction
    const ids   = body.data.items.map((i) => i.id)
    const owned = await fastify.prisma.serviceProduct.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true },
    })

    if (owned.length !== ids.length) {
      return reply.status(403).send({ error: 'Some items do not belong to you' })
    }

    await fastify.prisma.$transaction(
      body.data.items.map(({ id, order }) =>
        fastify.prisma.serviceProduct.update({ where: { id }, data: { order } }),
      ),
    )

    return reply.send({ success: true })
  })
}
