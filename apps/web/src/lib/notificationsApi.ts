import { apiClient } from './api'

export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'BID_RECEIVED'
  | 'BID_ACCEPTED'
  | 'BID_REJECTED'

export interface AppNotification {
  id:        string
  type:      NotificationType
  title:     string
  message:   string
  relatedId: string | null
  isRead:    boolean
  createdAt: string
}

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<{
      notifications: AppNotification[]
      pagination: { page: number; total: number; hasMore: boolean }
    }>('/api/notifications', { params: { page, limit } }),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/api/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch(`/api/notifications/${id}/read`, {}),

  markAllRead: () =>
    apiClient.patch('/api/notifications/read-all', {}),
}
