import type { FastifyRequest } from 'fastify'

export interface JwtPayload {
  sub: string       // userId
  email: string
  role: string
  type: 'access' | 'refresh'
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload
}
