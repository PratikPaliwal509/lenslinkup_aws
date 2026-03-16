import { FastifyInstance } from 'fastify'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLANS = {
  MONTHLY: { amount: 29900, label: 'Monthly', durationDays: 30 },  // ₹299 in paise
  YEARLY:  { amount: 249900, label: 'Yearly', durationDays: 365 }, // ₹2499 in paise
} as const

type PlanKey = keyof typeof PLANS

// ─── Razorpay instance (lazy init so missing env doesn't crash on import) ─────

function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured')
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  plan: z.enum(['MONTHLY', 'YEARLY']),
})

const verifyPaymentSchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function subscriptionRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/subscription/create-order
   * Creates a Razorpay order and a pending Subscription record.
   * Returns: { orderId, amount, currency, keyId, plan }
   */
  fastify.post('/create-order', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const body = createOrderSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const plan = body.data.plan as PlanKey
    const { amount, label, durationDays } = PLANS[plan]

    // Check if already active premium
    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      select: { isPremium: true },
    })
    if (profile?.isPremium) {
      return reply.status(409).send({ error: `Already a Premium member` })
    }

    let razorpay: Razorpay
    try {
      razorpay = getRazorpay()
    } catch {
      return reply.status(503).send({ error: 'Payment service not configured' })
    }

    // Create Razorpay order
    const order = await (razorpay.orders.create as any)({
      amount,
      currency: 'INR',
      receipt:  `llu_${userId.slice(-8)}_${Date.now()}`,
      notes:    { userId, plan, durationDays: String(durationDays) },
    })

    // Persist pending subscription
    await fastify.prisma.subscription.create({
      data: {
        userId,
        plan,
        status:          'PENDING',
        amount,
        razorpayOrderId: order.id,
      },
    })

    return reply.send({
      orderId:  order.id,
      amount,
      currency: 'INR',
      keyId:    process.env.RAZORPAY_KEY_ID,
      plan:     label,
    })
  })

  /**
   * POST /api/subscription/verify-payment
   * Verifies Razorpay signature, activates premium.
   * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
   */
  fastify.post('/verify-payment', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const body = verifyPaymentSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body.data

    // Verify HMAC signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''
    const expected  = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expected !== razorpaySignature) {
      return reply.status(400).send({ error: 'Payment verification failed — invalid signature' })
    }

    // Find the pending subscription
    const subscription = await fastify.prisma.subscription.findFirst({
      where: { razorpayOrderId, userId, status: 'PENDING' },
    })
    if (!subscription) {
      return reply.status(404).send({ error: 'Subscription order not found' })
    }

    const plan = subscription.plan as PlanKey
    const startsAt  = new Date()
    const expiresAt = new Date(startsAt.getTime() + PLANS[plan].durationDays * 86_400_000)

    // Update subscription + activate premium in one transaction
    await fastify.prisma.$transaction([
      fastify.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status:           'ACTIVE',
          razorpayPaymentId,
          razorpaySignature,
          startsAt,
          expiresAt,
        },
      }),
      fastify.prisma.profile.update({
        where: { userId },
        data:  { isPremium: true },
      }),
    ])

    return reply.send({
      success:   true,
      expiresAt: expiresAt.toISOString(),
      plan:      PLANS[plan].label,
    })
  })

  /**
   * GET /api/subscription/status
   * Returns current active subscription if any.
   */
  fastify.get('/status', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const subscription = await fastify.prisma.subscription.findFirst({
      where:   { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select:  { plan: true, startsAt: true, expiresAt: true, amount: true, createdAt: true },
    })

    const profile = await fastify.prisma.profile.findUnique({
      where:  { userId },
      select: { isPremium: true },
    })

    return reply.send({
      isPremium:    profile?.isPremium ?? false,
      subscription: subscription ?? null,
    })
  })

  /**
   * POST /api/subscription/webhook
   * Razorpay webhook — handles payment.failed, subscription.cancelled, etc.
   * Must be registered WITHOUT authenticate middleware (Razorpay calls this).
   */
  fastify.post('/webhook', async (request, reply) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) return reply.status(200).send('ok') // ignore if not configured

    const signature = (request.headers['x-razorpay-signature'] as string) ?? ''
    const body      = JSON.stringify(request.body)

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    if (expected !== signature) {
      return reply.status(400).send({ error: 'Invalid webhook signature' })
    }

    const event   = (request.body as any)?.event as string
    const payment = (request.body as any)?.payload?.payment?.entity

    if (event === 'payment.failed' && payment?.order_id) {
      await fastify.prisma.subscription.updateMany({
        where: { razorpayOrderId: payment.order_id, status: 'PENDING' },
        data:  { status: 'CANCELLED' },
      }).catch(() => {})
    }

    return reply.status(200).send('ok')
  })
}
