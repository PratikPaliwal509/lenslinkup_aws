import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createContactSchema = z.object({
  name:         z.string().trim().min(1).max(100),
  phone:        z.string().trim().max(20).optional(),
  email:        z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  company:      z.string().trim().max(100).optional(),
  notes:        z.string().trim().max(500).optional(),
  linkedUserId: z.string().trim().optional(),
})

const updateContactSchema = createContactSchema.partial()

const createLeadSchema = z.object({
  title:             z.string().trim().min(1).max(150),
  description:       z.string().trim().max(1000).optional(),
  contactId:         z.string().trim().optional(),
  value:             z.number().int().positive().optional(),
  expectedCloseDate: z.string().datetime({ offset: true }).optional(),
  notes:             z.string().trim().max(500).optional(),
  status:            z.enum(['NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST']).optional(),
})

const updateLeadSchema = createLeadSchema.partial()

const createOrderSchema = z.object({
  title:       z.string().trim().min(1).max(150),
  amount:      z.number().int().positive(),
  description: z.string().trim().max(1000).optional(),
  contactId:   z.string().trim().optional(),
  leadId:      z.string().trim().optional(),
  deliveryDate: z.string().datetime({ offset: true }).optional(),
  notes:       z.string().trim().max(500).optional(),
  status:      z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

const updateOrderSchema = createOrderSchema.partial()

const createPaymentSchema = z.object({
  amount:      z.number().int().positive(),
  method:      z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).default('CASH'),
  direction:   z.enum(['RECEIVED', 'SENT']).default('RECEIVED'),
  status:      z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  orderId:     z.string().trim().optional(),
  contactId:   z.string().trim().optional(),
  description: z.string().trim().max(200).optional(),
  reference:   z.string().trim().max(100).optional(),
  dueDate:     z.string().datetime({ offset: true }).optional(),
})

const updatePaymentSchema = createPaymentSchema.partial()

// ─── Select helpers ────────────────────────────────────────────────────────────

const CONTACT_SELECT = {
  id: true, name: true, phone: true, email: true, company: true,
  notes: true, linkedUserId: true, createdAt: true, updatedAt: true,
  linkedUser: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  _count: { select: { leads: true, orders: true, todos: true } },
} as const

const LEAD_SELECT = {
  id: true, title: true, description: true, status: true, value: true,
  expectedCloseDate: true, notes: true, contactId: true, linkedPostId: true,
  linkedBidId: true, createdAt: true, updatedAt: true,
  contact: { select: { id: true, name: true, company: true, linkedUserId: true } },
  workPost: { select: { id: true, title: true } },
  _count: { select: { orders: true, todos: true } },
} as const

const ORDER_SELECT = {
  id: true, title: true, description: true, amount: true, status: true,
  orderDate: true, deliveryDate: true, notes: true, contactId: true, leadId: true,
  createdAt: true, updatedAt: true,
  contact: { select: { id: true, name: true, company: true } },
  lead: { select: { id: true, title: true } },
  _count: { select: { payments: true, todos: true } },
} as const

const PAYMENT_SELECT = {
  id: true, amount: true, method: true, status: true, direction: true,
  description: true, reference: true, dueDate: true, paidAt: true,
  orderId: true, contactId: true, createdAt: true, updatedAt: true,
  order: { select: { id: true, title: true } },
  contact: { select: { id: true, name: true, company: true } },
} as const

// ─── Route Handler ─────────────────────────────────────────────────────────────

export default async function crmRoutes(fastify: FastifyInstance) {

  // ══════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════

  // GET /api/crm/contacts
  fastify.get('/contacts', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { search = '', page = '1', limit = '20' } = request.query as any
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where = {
      userId,
      ...(search ? {
        OR: [
          { name:    { contains: search, mode: 'insensitive' as const } },
          { phone:   { contains: search } },
          { email:   { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const [contacts, total] = await Promise.all([
      fastify.prisma.contact.findMany({ where, select: CONTACT_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      fastify.prisma.contact.count({ where }),
    ])

    return reply.send({ contacts, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + limitNum < total } })
  })

  // POST /api/crm/contacts
  fastify.post('/contacts', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createContactSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const { email, ...rest } = result.data
    const contact = await fastify.prisma.contact.create({
      data: { ...rest, email: email || undefined, userId },
      select: CONTACT_SELECT,
    })
    return reply.status(201).send({ contact })
  })

  // GET /api/crm/contacts/:id
  fastify.get('/contacts/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const contact = await fastify.prisma.contact.findFirst({
      where: { id, userId },
      select: {
        ...CONTACT_SELECT,
        leads: { select: { id: true, title: true, status: true, value: true, createdAt: true }, take: 5, orderBy: { createdAt: 'desc' } },
        orders: { select: { id: true, title: true, amount: true, status: true, createdAt: true }, take: 5, orderBy: { createdAt: 'desc' } },
        todos: { select: { id: true, title: true, status: true, priority: true, dueDate: true }, take: 5, orderBy: { dueDate: 'asc' } },
      },
    })

    if (!contact) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contact not found' })
    return reply.send({ contact })
  })

  // PATCH /api/crm/contacts/:id
  fastify.patch('/contacts/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any
    const result = updateContactSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const existing = await fastify.prisma.contact.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contact not found' })

    const { email, ...rest } = result.data
    const contact = await fastify.prisma.contact.update({
      where: { id },
      data: { ...rest, ...(email !== undefined ? { email: email || null } : {}) },
      select: CONTACT_SELECT,
    })
    return reply.send({ contact })
  })

  // DELETE /api/crm/contacts/:id
  fastify.delete('/contacts/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const existing = await fastify.prisma.contact.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Contact not found' })

    await fastify.prisma.contact.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ══════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════

  // GET /api/crm/leads
  fastify.get('/leads', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { status, contactId, page = '1', limit = '20' } = request.query as any
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: any = { userId }
    if (status) where.status = status
    if (contactId) where.contactId = contactId

    const [leads, total] = await Promise.all([
      fastify.prisma.lead.findMany({ where, select: LEAD_SELECT, orderBy: { updatedAt: 'desc' }, skip, take: limitNum }),
      fastify.prisma.lead.count({ where }),
    ])

    return reply.send({ leads, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + limitNum < total } })
  })

  // POST /api/crm/leads
  fastify.post('/leads', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createLeadSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const lead = await fastify.prisma.lead.create({
      data: { ...result.data, userId },
      select: LEAD_SELECT,
    })
    return reply.status(201).send({ lead })
  })

  // GET /api/crm/leads/:id
  fastify.get('/leads/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const lead = await fastify.prisma.lead.findFirst({
      where: { id, userId },
      select: {
        ...LEAD_SELECT,
        orders: { select: { id: true, title: true, amount: true, status: true }, take: 5, orderBy: { createdAt: 'desc' } },
        todos: { select: { id: true, title: true, status: true, priority: true, dueDate: true }, take: 10, orderBy: { dueDate: 'asc' } },
      },
    })

    if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' })
    return reply.send({ lead })
  })

  // PATCH /api/crm/leads/:id
  fastify.patch('/leads/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any
    const result = updateLeadSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const existing = await fastify.prisma.lead.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' })

    const lead = await fastify.prisma.lead.update({ where: { id }, data: result.data, select: LEAD_SELECT })
    return reply.send({ lead })
  })

  // DELETE /api/crm/leads/:id
  fastify.delete('/leads/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const existing = await fastify.prisma.lead.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' })

    await fastify.prisma.lead.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ══════════════════════════════════════════
  // ORDERS
  // ══════════════════════════════════════════

  // GET /api/crm/orders
  fastify.get('/orders', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { status, contactId, leadId, page = '1', limit = '20' } = request.query as any
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: any = { userId }
    if (status) where.status = status
    if (contactId) where.contactId = contactId
    if (leadId) where.leadId = leadId

    const [orders, total] = await Promise.all([
      fastify.prisma.order.findMany({ where, select: ORDER_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      fastify.prisma.order.count({ where }),
    ])

    return reply.send({ orders, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + limitNum < total } })
  })

  // POST /api/crm/orders
  fastify.post('/orders', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createOrderSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const order = await fastify.prisma.order.create({
      data: { ...result.data, userId },
      select: ORDER_SELECT,
    })
    return reply.status(201).send({ order })
  })

  // GET /api/crm/orders/:id
  fastify.get('/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const [order, paymentAgg] = await Promise.all([
      fastify.prisma.order.findFirst({
        where: { id, userId },
        select: {
          ...ORDER_SELECT,
          payments: { select: PAYMENT_SELECT, orderBy: { createdAt: 'desc' } },
          todos: { select: { id: true, title: true, status: true, priority: true, dueDate: true }, take: 10, orderBy: { dueDate: 'asc' } },
        },
      }),
      fastify.prisma.payment.aggregate({
        where: { orderId: id, userId, direction: 'RECEIVED', status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    if (!order) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' })

    const totalPaid = paymentAgg._sum.amount ?? 0
    return reply.send({ order: { ...order, totalPaid, totalPending: Math.max(0, (order as any).amount - totalPaid) } })
  })

  // PATCH /api/crm/orders/:id
  fastify.patch('/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any
    const result = updateOrderSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const existing = await fastify.prisma.order.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' })

    const order = await fastify.prisma.order.update({ where: { id }, data: result.data, select: ORDER_SELECT })
    return reply.send({ order })
  })

  // DELETE /api/crm/orders/:id
  fastify.delete('/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const existing = await fastify.prisma.order.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' })

    await fastify.prisma.order.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ══════════════════════════════════════════
  // PAYMENTS
  // ══════════════════════════════════════════

  // GET /api/crm/payments
  fastify.get('/payments', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { direction, status, orderId, page = '1', limit = '20' } = request.query as any
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: any = { userId }
    if (direction) where.direction = direction
    if (status) where.status = status
    if (orderId) where.orderId = orderId

    const [payments, total, summaryReceived, summaryPending] = await Promise.all([
      fastify.prisma.payment.findMany({ where, select: PAYMENT_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      fastify.prisma.payment.count({ where }),
      fastify.prisma.payment.aggregate({ where: { userId, direction: 'RECEIVED', status: 'PAID' }, _sum: { amount: true } }),
      fastify.prisma.payment.aggregate({ where: { userId, direction: 'RECEIVED', status: { in: ['PENDING', 'OVERDUE'] } }, _sum: { amount: true } }),
    ])

    return reply.send({
      payments,
      summary: { totalReceived: summaryReceived._sum.amount ?? 0, totalPending: summaryPending._sum.amount ?? 0 },
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + limitNum < total },
    })
  })

  // POST /api/crm/payments
  fastify.post('/payments', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createPaymentSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const data: any = { ...result.data, userId }
    if (data.status === 'PAID' && !data.paidAt) data.paidAt = new Date()

    const payment = await fastify.prisma.payment.create({ data, select: PAYMENT_SELECT })
    return reply.status(201).send({ payment })
  })

  // GET /api/crm/payments/:id
  fastify.get('/payments/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const payment = await fastify.prisma.payment.findFirst({ where: { id, userId }, select: PAYMENT_SELECT })
    if (!payment) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Payment not found' })
    return reply.send({ payment })
  })

  // PATCH /api/crm/payments/:id
  fastify.patch('/payments/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any
    const result = updatePaymentSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const existing = await fastify.prisma.payment.findFirst({ where: { id, userId }, select: { id: true, status: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Payment not found' })

    const data: any = { ...result.data }
    // Auto-set paidAt when marking as PAID
    if (data.status === 'PAID' && (existing as any).status !== 'PAID' && !data.paidAt) {
      data.paidAt = new Date()
    }

    const payment = await fastify.prisma.payment.update({ where: { id }, data, select: PAYMENT_SELECT })
    return reply.send({ payment })
  })

  // DELETE /api/crm/payments/:id
  fastify.delete('/payments/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const existing = await fastify.prisma.payment.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Payment not found' })

    await fastify.prisma.payment.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ══════════════════════════════════════════
  // SUMMARY DASHBOARD
  // ══════════════════════════════════════════

  // GET /api/crm/summary
  fastify.get('/summary', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const [
      contactCount,
      openLeadCount,
      activeOrderCount,
      pendingPayment,
      overduePayment,
    ] = await Promise.all([
      fastify.prisma.contact.count({ where: { userId } }),
      fastify.prisma.lead.count({ where: { userId, status: { in: ['NEW', 'CONTACTED', 'NEGOTIATING'] } } }),
      fastify.prisma.order.count({ where: { userId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
      fastify.prisma.payment.aggregate({ where: { userId, direction: 'RECEIVED', status: 'PENDING' }, _sum: { amount: true } }),
      fastify.prisma.payment.aggregate({ where: { userId, direction: 'RECEIVED', status: 'OVERDUE' }, _sum: { amount: true } }),
    ])

    return reply.send({
      contactCount,
      openLeadCount,
      activeOrderCount,
      pendingPaymentTotal: pendingPayment._sum.amount ?? 0,
      overduePaymentTotal: overduePayment._sum.amount ?? 0,
    })
  })
}
