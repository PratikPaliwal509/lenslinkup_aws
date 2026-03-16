import { apiClient } from './api'

export const adminApi = {
  // Stats
  getStats: () =>
    apiClient.get<{ stats: AdminStats }>('/api/admin/stats'),

  // Users
  getUsers: (params?: {
    page?: number; limit?: number; search?: string; filter?: string
  }) => apiClient.get<{ users: AdminUser[]; pagination: Pagination }>('/api/admin/users', { params }),

  patchUser: (userId: string, data: {
    isVerified?: boolean
    isPremium?:  boolean
    isActive?:   boolean
    role?:       'USER' | 'ADMIN'
  }) => apiClient.patch<{ updated: Record<string, unknown> }>(`/api/admin/users/${userId}`, data),

  // Posts
  getPosts: (params?: {
    page?: number; limit?: number; status?: string; search?: string
  }) => apiClient.get<{ posts: AdminPost[]; pagination: Pagination }>('/api/admin/posts', { params }),

  cancelPost: (postId: string) =>
    apiClient.patch<{ post: { id: string; status: string } }>(`/api/admin/posts/${postId}/cancel`, {}),

  // Settings
  getSettings: () =>
    apiClient.get<{ settings: Record<string, string> }>('/api/admin/settings'),

  putSettings: (data: Record<string, number>) =>
    apiClient.put<{ settings: Record<string, string> }>('/api/admin/settings', data),

  // Subscription plans
  getSubscriptionPlans: () =>
    apiClient.get<{ plans: SubscriptionPlan[] }>('/api/admin/subscriptions'),

  putSubscriptionPlan: (key: string, plan: SubscriptionPlan) =>
    apiClient.put<{ plan: SubscriptionPlan }>(`/api/admin/subscriptions/${key}`, plan),

  // Payment gateway
  getPaymentGatewayConfig: () =>
    apiClient.get<{ config: PaymentGatewayConfig }>('/api/admin/payment-gateway'),

  putPaymentGatewayConfig: (config: PaymentGatewayConfig) =>
    apiClient.put<{ config: PaymentGatewayConfig }>('/api/admin/payment-gateway', config),

  testPaymentGateway: () =>
    apiClient.post<{ ok: boolean; message: string }>('/api/admin/payment-gateway/test', {}),
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminStats {
  users: {
    total: number; withProfile: number; verified: number; premium: number; last7Days: number
  }
  posts:       { total: number; open: number }
  bids:        { total: number }
  connections: { total: number }
}

export interface AdminUser {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  isEmailVerified: boolean
  createdAt: string
  profile: {
    displayName: string
    avatarUrl?:  string | null
    city?:       string | null
    isVerified:  boolean
    isPremium:   boolean
    isActive:    boolean
    categories:  { category: { name: string; emoji: string } }[]
  } | null
  _count: { workPosts: number; bids: number; sentConnections: number }
}

export interface AdminPost {
  id: string
  title: string
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  categorySlug?: string | null
  city?:         string | null
  budget?:       number | null
  createdAt: string
  user: {
    id:    string
    email: string
    profile: { displayName: string; avatarUrl?: string | null } | null
  }
  _count: { bids: number }
}

export interface Pagination {
  page: number; limit: number; total: number; totalPages: number; hasMore: boolean
}

export interface SubscriptionPlan {
  key:           string
  name:          string
  isActive:      boolean
  priceMonthly:  number
  priceYearly:   number
  userCount:     number
  features:      string[]
  razorpayMonthlyPlanId?: string
  razorpayYearlyPlanId?:  string
}

export interface PaymentGatewayConfig {
  mode:                'test' | 'live'
  razorpayKeyId:       string
  razorpaySecret:      string
  webhookSecret:       string
  webhookUrl:          string
  autoActivatePremium: boolean
}
