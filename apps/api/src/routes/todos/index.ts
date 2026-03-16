import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createTodoSchema = z.object({
  title:           z.string().trim().min(1).max(200),
  description:     z.string().trim().max(500).optional(),
  priority:        z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate:         z.string().datetime({ offset: true }).optional(),
  linkedContactId: z.string().trim().optional(),
  linkedLeadId:    z.string().trim().optional(),
  linkedOrderId:   z.string().trim().optional(),
})

const updateTodoSchema = z.object({
  title:           z.string().trim().min(1).max(200).optional(),
  description:     z.string().trim().max(500).optional(),
  status:          z.enum(['PENDING', 'DONE']).optional(),
  priority:        z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate:         z.string().datetime({ offset: true }).nullable().optional(),
  linkedContactId: z.string().trim().nullable().optional(),
  linkedLeadId:    z.string().trim().nullable().optional(),
  linkedOrderId:   z.string().trim().nullable().optional(),
})

// ─── Select Helper ─────────────────────────────────────────────────────────────

const TODO_SELECT = {
  id: true, title: true, description: true, status: true, priority: true,
  dueDate: true, completedAt: true, createdAt: true, updatedAt: true,
  linkedContactId: true, linkedLeadId: true, linkedOrderId: true,
  contact: { select: { id: true, name: true, company: true } },
  lead:    { select: { id: true, title: true, status: true } },
  order:   { select: { id: true, title: true, status: true } },
} as const

// ─── Route Handler ─────────────────────────────────────────────────────────────

export default async function todosRoutes(fastify: FastifyInstance) {

  // GET /api/todos  — grouped response: overdue / today / upcoming / done
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { status, priority, linkedContactId, linkedLeadId, linkedOrderId } = request.query as any

    const where: any = { userId }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (linkedContactId) where.linkedContactId = linkedContactId
    if (linkedLeadId) where.linkedLeadId = linkedLeadId
    if (linkedOrderId) where.linkedOrderId = linkedOrderId

    const todos = await fastify.prisma.todo.findMany({
      where,
      select: TODO_SELECT,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    })

    // Group into sections
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday   = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)

    const overdue: typeof todos = []
    const today:   typeof todos = []
    const upcoming: typeof todos = []
    const done:    typeof todos = []

    for (const todo of todos) {
      if (todo.status === 'DONE') {
        done.push(todo)
        continue
      }
      if (!todo.dueDate) {
        upcoming.push(todo)
        continue
      }
      const due = new Date(todo.dueDate)
      if (due < startOfToday) {
        overdue.push(todo)
      } else if (due <= endOfToday) {
        today.push(todo)
      } else {
        upcoming.push(todo)
      }
    }

    return reply.send({ overdue, today, upcoming, done: done.slice(0, 20) })
  })

  // POST /api/todos
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const result = createTodoSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const todo = await fastify.prisma.todo.create({
      data: { ...result.data, userId },
      select: TODO_SELECT,
    })
    return reply.status(201).send({ todo })
  })

  // PATCH /api/todos/:id
  fastify.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any
    const result = updateTodoSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: result.error.issues[0]?.message ?? 'Validation error' })

    const existing = await fastify.prisma.todo.findFirst({ where: { id, userId }, select: { id: true, status: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Todo not found' })

    const data: any = { ...result.data }
    // Auto-set completedAt when marking as DONE
    if (data.status === 'DONE' && (existing as any).status !== 'DONE') data.completedAt = new Date()
    if (data.status === 'PENDING' && (existing as any).status === 'DONE') data.completedAt = null

    const todo = await fastify.prisma.todo.update({ where: { id }, data, select: TODO_SELECT })
    return reply.send({ todo })
  })

  // DELETE /api/todos/:id
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { id } = request.params as any

    const existing = await fastify.prisma.todo.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Todo not found' })

    await fastify.prisma.todo.delete({ where: { id } })
    return reply.status(204).send()
  })
}
