import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  role: string
  profile?: {
    displayName: string
    avatarUrl?: string | null
    isPremium: boolean
    isVerified: boolean
  }
}

interface AuthState {
  accessToken:  string | null
  refreshToken: string | null
  user:         AuthUser | null
  isHydrated:   boolean

  setAuth:      (accessToken: string, refreshToken: string, user: AuthUser | null) => void
  setUser:      (user: AuthUser) => void
  clearAuth:    () => void
  setHydrated:  () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      user:         null,
      isHydrated:   false,

      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),

      setUser: (user) => set({ user }),

      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'lenslinkup-auth',
      // Only persist refresh token + user; access token is short-lived
      partialize: (s) => ({
        refreshToken: s.refreshToken,
        user:         s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)
