import axios from 'axios'
import { useAuthStore } from '@/store/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://35.154.114.186:4000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { refreshToken, setAuth, clearAuth } = useAuthStore.getState()
        if (!refreshToken) { clearAuth(); return Promise.reject(error) }

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken })
        setAuth(data.accessToken, data.refreshToken, useAuthStore.getState().user)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth API ─────────────────────────────────────────────────────────────────

export interface RegisterPayload { email: string; password: string; displayName: string }
export interface LoginPayload    { email: string; password: string }

export const authApi = {
  register:       (data: RegisterPayload) => api.post('/api/auth/register', data),
  login:          (data: LoginPayload)    => api.post('/api/auth/login', data),
  refresh:        (refreshToken: string)  => api.post('/api/auth/refresh', { refreshToken }),
  logout:         ()                      => api.post('/api/auth/logout'),
  me:             ()                      => api.get('/api/auth/me'),
  verifyEmail:    (token: string)         => api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
  forgotPassword: (email: string)         => api.post('/api/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) =>
    api.post('/api/auth/reset-password', { token, password }),
}

// ── Profile API ───────────────────────────────────────────────────────────────

export interface EditProfilePayload {
  displayName?: string
  title?:       string | null
  bio?:         string | null
  phone?:       string | null
  website?:     string | null
  instagram?:   string | null
  youtube?:     string | null
  address?:     string | null
  area?:        string | null
  city?:        string | null
  state?:       string | null
  pincode?:     string | null
  isPublic?:    boolean
}

export const profileApi = {
  getById:          (userId: string)                    => api.get(`/api/profile/${userId}`),
  getMe:            ()                                  => api.get('/api/profile/me'),
  updateMe:         (data: EditProfilePayload)          => api.put('/api/profile/me', data),
  updateCategories: (categoryIds: string[])             => api.put('/api/profile/categories', { categoryIds }),
  getAvatarUploadUrl: (contentType: string)             => api.post('/api/profile/avatar-url', { contentType }),
  getBannerUploadUrl: (contentType: string)             => api.post('/api/profile/banner-url', { contentType }),
  confirmAvatar:    (avatarUrl: string)                 => api.patch('/api/profile/avatar', { avatarUrl }),
  confirmBanner:    (bannerUrl: string)                 => api.patch('/api/profile/banner', { bannerUrl }),
  getCategories:    ()                                  => api.get('/api/profile/categories'),
}

// ── Upload helper — PUT directly to S3 presigned URL ─────────────────────────

export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  await fetch(presignedUrl, {
    method:  'PUT',
    body:    file,
    headers: { 'Content-Type': file.type },
  })
}

// ── Discover API ──────────────────────────────────────────────────────────────

export interface DiscoverParams {
  search?:       string
  categorySlug?: string
  city?:         string
  page?:         number
  limit?:        number
}

export const discoverApi = {
  search:        (params: DiscoverParams) => api.get('/api/discover', { params }),
  cities:        ()                       => api.get('/api/discover/cities'),
  activeNearYou: ()                       => api.get('/api/discover/active-near-you'),
}

// ── Connections API ───────────────────────────────────────────────────────────

export const connectionsApi = {
  send:       (targetUserId: string) => api.post(`/api/connections/${targetUserId}`),
  accept:     (connectionId: string) => api.patch(`/api/connections/${connectionId}/accept`),
  reject:     (connectionId: string) => api.patch(`/api/connections/${connectionId}/reject`),
  remove:     (connectionId: string) => api.delete(`/api/connections/${connectionId}`),
  list:       ()                     => api.get('/api/connections'),
  pending:    ()                     => api.get('/api/connections/pending'),
  sent:       ()                     => api.get('/api/connections/sent'),
  statusWith: (targetUserId: string) => api.get(`/api/connections/status/${targetUserId}`),
}

// ── Posts API ─────────────────────────────────────────────────────────────────

export interface CreatePostPayload {
  title:        string
  description:  string
  categorySlug?: string
  city?:        string
  budget?:      number
  eventDate?:   string
}

export interface CreateBidPayload {
  amount:  number
  message: string
}

// Alias used by adminApi + notificationsApi (same instance, paths include /api prefix)
export { api as apiClient }

// ── Services & Products API ───────────────────────────────────────────────────

export type ServiceType = 'SERVICE' | 'PRODUCT'

export interface ServicePayload {
  type?:        ServiceType
  name:         string
  description?: string | null
  price?:       number | null
  unit?:        string | null
  imageUrl?:    string | null
  order?:       number
}

export const servicesApi = {
  list:    (userId: string)                                => api.get(`/api/services/${userId}`),
  create:  (data: ServicePayload)                          => api.post('/api/services', data),
  update:  (id: string, data: Partial<ServicePayload>)    => api.put(`/api/services/${id}`, data),
  remove:  (id: string)                                   => api.delete(`/api/services/${id}`),
  reorder: (items: { id: string; order: number }[])       => api.patch('/api/services/reorder', { items }),
}

// ── Reviews API ───────────────────────────────────────────────────────────────

export const reviewsApi = {
  list:   (userId: string)                                                       => api.get(`/api/reviews/${userId}`),
  submit: (userId: string, data: { rating: number; comment?: string; workPostId?: string }) =>
    api.post(`/api/reviews/${userId}`, data),
  remove: (userId: string)                                                       => api.delete(`/api/reviews/${userId}`),
}

// ── Subscription API ──────────────────────────────────────────────────────────

export const subscriptionApi = {
  createOrder:   (plan: 'MONTHLY' | 'YEARLY')            => api.post('/api/subscription/create-order', { plan }),
  verifyPayment: (data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post('/api/subscription/verify-payment', data),
  status:        ()                                       => api.get('/api/subscription/status'),
}

// ── CRM API ───────────────────────────────────────────────────────────────────

export const crmApi = {
  // Contacts
  listContacts:  (p?: { search?: string; page?: number }) => api.get('/api/crm/contacts', { params: p }),
  createContact: (d: object)                               => api.post('/api/crm/contacts', d),
  getContact:    (id: string)                              => api.get(`/api/crm/contacts/${id}`),
  updateContact: (id: string, d: object)                   => api.patch(`/api/crm/contacts/${id}`, d),
  deleteContact: (id: string)                              => api.delete(`/api/crm/contacts/${id}`),
  // Leads
  listLeads:  (p?: { status?: string; page?: number })     => api.get('/api/crm/leads', { params: p }),
  createLead: (d: object)                                  => api.post('/api/crm/leads', d),
  getLead:    (id: string)                                 => api.get(`/api/crm/leads/${id}`),
  updateLead: (id: string, d: object)                      => api.patch(`/api/crm/leads/${id}`, d),
  deleteLead: (id: string)                                 => api.delete(`/api/crm/leads/${id}`),
  // Orders
  listOrders:  (p?: { status?: string })                   => api.get('/api/crm/orders', { params: p }),
  createOrder: (d: object)                                 => api.post('/api/crm/orders', d),
  getOrder:    (id: string)                                => api.get(`/api/crm/orders/${id}`),
  updateOrder: (id: string, d: object)                     => api.patch(`/api/crm/orders/${id}`, d),
  deleteOrder: (id: string)                                => api.delete(`/api/crm/orders/${id}`),
  // Payments
  listPayments:  (p?: { direction?: string; status?: string }) => api.get('/api/crm/payments', { params: p }),
  createPayment: (d: object)                               => api.post('/api/crm/payments', d),
  updatePayment: (id: string, d: object)                   => api.patch(`/api/crm/payments/${id}`, d),
  deletePayment: (id: string)                              => api.delete(`/api/crm/payments/${id}`),
  // Summary
  summary: ()                                              => api.get('/api/crm/summary'),
}

// ── Todos API ─────────────────────────────────────────────────────────────────

export const todosApi = {
  list:   (p?: { status?: string; priority?: string })     => api.get('/api/todos', { params: p }),
  create: (d: object)                                      => api.post('/api/todos', d),
  update: (id: string, d: object)                          => api.patch(`/api/todos/${id}`, d),
  remove: (id: string)                                     => api.delete(`/api/todos/${id}`),
}

export const postsApi = {
  create:       (data: CreatePostPayload)                      => api.post('/api/posts', data),
  feed:         (params?: { categorySlug?: string; city?: string; page?: number; limit?: number }) => api.get('/api/posts', { params }),
  mine:         ()                                             => api.get('/api/posts/mine'),
  myBids:       ()                                             => api.get('/api/posts/my-bids'),
  getById:      (postId: string)                               => api.get(`/api/posts/${postId}`),
  cancel:       (postId: string)                               => api.delete(`/api/posts/${postId}`),
  submitBid:    (postId: string, data: CreateBidPayload)       => api.post(`/api/posts/${postId}/bids`, data),
  getBids:      (postId: string)                               => api.get(`/api/posts/${postId}/bids`),
  acceptBid:    (postId: string, bidId: string)                => api.patch(`/api/posts/${postId}/bids/${bidId}/accept`),
  rejectBid:    (postId: string, bidId: string)                => api.patch(`/api/posts/${postId}/bids/${bidId}/reject`),
}
