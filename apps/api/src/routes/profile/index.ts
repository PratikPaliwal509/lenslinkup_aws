import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

// ── Validation ────────────────────────────────────────────────────────────────

const editProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  title:       z.string().trim().max(100).optional().nullable(),
  bio:         z.string().trim().max(500).optional().nullable(),
  phone:       z.string().trim().max(20).optional().nullable(),
  website:     z.string().trim().url().optional().nullable().or(z.literal('')),
  instagram:   z.string().trim().max(60).optional().nullable(),
  youtube:     z.string().trim().max(60).optional().nullable(),
  address:     z.string().trim().max(200).optional().nullable(),
  area:        z.string().trim().max(100).optional().nullable(),
  city:        z.string().trim().max(100).optional().nullable(),
  state:       z.string().trim().max(100).optional().nullable(),
  pincode:     z.string().trim().max(10).optional().nullable(),
  isPublic:    z.boolean().optional(),
})

const categoriesSchema = z.object({
  categoryIds: z.array(z.string()).min(1).max(3),
})

const uploadUrlSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

// ── Profile select helper ─────────────────────────────────────────────────────

const PROFILE_SELECT = {
  id:          true,
  userId:      true,
  displayName: true,
  title:       true,
  bio:         true,
  phone:       true,
  website:     true,
  instagram:   true,
  youtube:     true,
  address:     true,
  area:        true,
  city:        true,
  state:       true,
  pincode:     true,
  avatarUrl:   true,
  bannerUrl:   true,
  isVerified:  true,
  isPremium:   true,
  isActive:    true,
  isPublic:    true,
  avgRating:   true,
  reviewCount: true,
  createdAt:   true,
  categories: {
    select: {
      category: {
        select: { id: true, name: true, slug: true, emoji: true },
      },
    },
  },
} as const

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function profileRoutes(fastify: FastifyInstance) {

  // GET /api/profile/:userId  — public
  fastify.get<{ Params: { userId: string } }>('/:userId', async (request, reply) => {
    const { userId } = request.params

    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      select: PROFILE_SELECT,
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' })
    }

    // Flatten categories array
    const flat = {
      ...profile,
      categories: profile.categories.map((pc) => pc.category),
    }

    return reply.send({ profile: flat })
  })

  // GET /api/profile/me  — own profile (protected)
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      select: PROFILE_SELECT,
    })

    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' })
    }

    return reply.send({
      profile: { ...profile, categories: profile.categories.map((pc) => pc.category) },
    })
  })

  // PUT /api/profile  — edit own profile (protected)
  fastify.put('/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const result = editProfileSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const profile = await fastify.prisma.profile.update({
      where: { userId },
      data:  result.data,
      select: PROFILE_SELECT,
    })

    return reply.send({
      profile: { ...profile, categories: profile.categories.map((pc) => pc.category) },
    })
  })

  // PUT /api/profile/categories  — set own categories (protected, max 3)
  fastify.put('/categories', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const result = categoriesSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Validation error',
      })
    }

    const { categoryIds } = result.data

    // Verify all categories exist
    const found = await fastify.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    })
    if (found.length !== categoryIds.length) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'One or more invalid category IDs' })
    }

    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' })
    }

    // Replace all categories atomically
    await fastify.prisma.$transaction([
      fastify.prisma.profileCategory.deleteMany({ where: { profileId: profile.id } }),
      fastify.prisma.profileCategory.createMany({
        data: categoryIds.map((categoryId) => ({ profileId: profile.id, categoryId })),
      }),
    ])

    return reply.send({ message: 'Categories updated' })
  })

  // POST /api/profile/avatar-url  — get presigned URL (protected)
  fastify.post('/avatar-url', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const result = uploadUrlSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Invalid content type',
      })
    }

    const ext = result.data.contentType.split('/')[1] // jpeg | png | webp
    const key = `avatars/${userId}.${ext}`

    const uploadUrl = await fastify.getPresignedUploadUrl(key, result.data.contentType)
    const publicUrl = `${process.env.S3_PUBLIC_URL ?? ''}/${key}`

    return reply.send({ uploadUrl, publicUrl, key })
  })

  // POST /api/profile/banner-url  — get presigned URL (protected)
  fastify.post('/banner-url', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string

    const result = uploadUrlSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error.issues[0]?.message ?? 'Invalid content type',
      })
    }

    const ext = result.data.contentType.split('/')[1]
    const key = `banners/${userId}.${ext}`

    const uploadUrl = await fastify.getPresignedUploadUrl(key, result.data.contentType)
    const publicUrl = `${process.env.S3_PUBLIC_URL ?? ''}/${key}`

    return reply.send({ uploadUrl, publicUrl, key })
  })

  // PATCH /api/profile/avatar  — confirm avatar URL after S3 upload (protected)
  fastify.patch('/avatar', { preHandler: authenticate }, async (request, reply) => {
    const userId  = (request as any).user.sub as string
    const { avatarUrl } = request.body as { avatarUrl?: string }

    if (!avatarUrl) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'avatarUrl required' })
    }

    await fastify.prisma.profile.update({
      where: { userId },
      data:  { avatarUrl },
    })

    return reply.send({ message: 'Avatar updated', avatarUrl })
  })

  // PATCH /api/profile/banner  — confirm banner URL after S3 upload (protected)
  fastify.patch('/banner', { preHandler: authenticate }, async (request, reply) => {
    const userId = (request as any).user.sub as string
    const { bannerUrl } = request.body as { bannerUrl?: string }

    if (!bannerUrl) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'bannerUrl required' })
    }

    await fastify.prisma.profile.update({
      where: { userId },
      data:  { bannerUrl },
    })

    return reply.send({ message: 'Banner updated', bannerUrl })
  })

  // GET /api/categories  — list all categories (public)
  fastify.get('/categories', async (_request, reply) => {
    const categories = await fastify.prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, emoji: true },
    })
    return reply.send({ categories })
  })
}
