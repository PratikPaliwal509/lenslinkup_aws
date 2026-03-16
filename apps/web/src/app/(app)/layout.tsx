'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { BottomNav } from '@/components/nav/BottomNav'
import { TopNavBar } from '@/components/nav/TopNavBar'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router       = useRouter()
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const isHydrated   = useAuthStore((s) => s.isHydrated)

  // Register for push notifications once the user is authenticated
  usePushNotifications()

  // Client-side auth guard — wait for hydration, then check tokens
  useEffect(() => {
    if (isHydrated && !refreshToken) {
      router.replace('/login')
    }
  }, [isHydrated, refreshToken, router])

  // Show spinner while Zustand rehydrates from localStorage
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
      </div>
    )
  }

  // After hydration, if still no token, return null (redirect in effect above)
  if (!refreshToken) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global top nav — fixed, 56px (h-14) */}
      <TopNavBar />

      {/* Page content — pt-14 clears the top nav, pb-20 clears the bottom nav */}
      <main className="pt-14 pb-20 min-h-screen">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
