'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Users, User, BriefcaseBusiness } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/home',        label: 'Home',    Icon: Home             },
  { href: '/discover',    label: 'Discover', Icon: Search          },
  { href: '/post/new',    label: 'Post',     Icon: PlusSquare      },
  { href: '/connections', label: 'Network',  Icon: Users           },
  { href: '/crm',         label: 'CRM',      Icon: BriefcaseBusiness },
  { href: '/profile/me',  label: 'Profile',  Icon: User            },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
      <div className="grid grid-cols-6 h-16">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/crm'
            ? pathname.startsWith('/crm') || pathname.startsWith('/todos')
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 font-medium transition-colors',
                active
                  ? 'text-teal-600'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon
                className={cn('w-5 h-5', active && 'stroke-[2.5]')}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
