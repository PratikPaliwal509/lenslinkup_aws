import type { PrismaClient } from '@prisma/client'

type NotifyPayload = {
  userId:    string
  type:      'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'BID_RECEIVED' | 'BID_ACCEPTED' | 'BID_REJECTED'
  title:     string
  message:   string
  relatedId?: string
}

/**
 * Fire-and-forget notification creator.
 * Errors are swallowed so a notification failure never breaks the calling route.
 */
export function notify(prisma: PrismaClient, payload: NotifyPayload): void {
  prisma.notification
    .create({ data: payload })
    .catch(() => {/* ignore */})
}
