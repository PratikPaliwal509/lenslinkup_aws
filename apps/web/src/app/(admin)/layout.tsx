'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Briefcase, Settings, LogOut, ChevronRight,
  CreditCard, Star,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'

const NAV = [
  { href: '/admin',                 icon: LayoutDashboard, label: 'Dashboard'       },
  { href: '/admin/users',           icon: Users,           label: 'Users'           },
  { href: '/admin/posts',           icon: Briefcase,       label: 'Posts'           },
  { href: '/admin/subscriptions',   icon: Star,            label: 'Subscriptions'   },
  { href: '/admin/payment-gateway', icon: CreditCard,      label: 'Payment Gateway' },
  { href: '/admin/settings',        icon: Settings,        label: 'Settings'        },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router     = useRouter()
  const pathname   = usePathname()
  const user       = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const clearAuth  = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    if (!isHydrated) return
    // Redirect non-admins — in production, role is on the JWT payload
    // Here we just check if logged in; backend enforces ADMIN role on every request
    if (!user) {
      router.replace('/login')
    }
  }, [isHydrated, user, router])

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function handleLogout() {
    clearAuth()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <Logo width={130} />
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-1.5 pl-0.5">
            Super Admin
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-teal-400" />}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {user.profile?.displayName?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.profile?.displayName ?? user.email}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
