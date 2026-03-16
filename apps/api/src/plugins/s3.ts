import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

declare module 'fastify' {
  interface FastifyInstance {
    s3: S3Client
    getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>
  }
}

export default fp(async function s3Plugin(fastify: FastifyInstance) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
    // Support S3-compatible endpoints (Cloudflare R2, MinIO, etc.)
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
  })

  async function getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300, // 5 minutes
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET ?? 'lenslinkup',
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(s3, command, { expiresIn })
  }

  fastify.decorate('s3', s3)
  fastify.decorate('getPresignedUploadUrl', getPresignedUploadUrl)
})
