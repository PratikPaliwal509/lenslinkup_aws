'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { crmApi } from '@/lib/api'
import { Users, TrendingUp, ShoppingBag, IndianRupee, Plus, CheckSquare } from 'lucide-react'

interface Summary {
  contactCount: number
  openLeadCount: number
  activeOrderCount: number
  pendingPaymentTotal: number
  overduePaymentTotal: number
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export default function CRMDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await crmApi.summary()
      setSummary(res.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const cards = [
    { label: 'Contacts', value: summary?.contactCount ?? 0, icon: Users, color: 'bg-teal-50 text-teal-600', href: '/crm/contacts' },
    { label: 'Open Leads', value: summary?.openLeadCount ?? 0, icon: TrendingUp, color: 'bg-blue-50 text-blue-600', href: '/crm/leads' },
    { label: 'Active Orders', value: summary?.activeOrderCount ?? 0, icon: ShoppingBag, color: 'bg-orange-50 text-orange-600', href: '/crm/orders' },
    { label: 'Pending ₹', value: fmt(summary?.pendingPaymentTotal ?? 0), icon: IndianRupee, color: 'bg-red-50 text-red-500', href: '/crm/payments' },
  ]

  const quickActions = [
    { label: '+ Contact', href: '/crm/contacts' },
    { label: '+ Lead',    href: '/crm/leads'    },
    { label: '+ Order',   href: '/crm/orders'   },
    { label: '+ Payment', href: '/crm/payments' },
    { label: '✓ Todos',   href: '/todos'        },
  ]

  const navTabs = [
    { label: 'Contacts', href: '/crm/contacts' },
    { label: 'Leads',    href: '/crm/leads'    },
    { label: 'Orders',   href: '/crm/orders'   },
    { label: 'Payments', href: '/crm/payments' },
    { label: 'Todos',    href: '/todos'        },
  ]

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-2">
        <BriefcaseIcon className="w-5 h-5 text-teal-600" />
        <h1 className="text-lg font-bold text-slate-800">Business CRM</h1>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 active:scale-95 transition-all">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{value}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Overdue alert */}
        {!loading && (summary?.overduePaymentTotal ?? 0) > 0 && (
          <Link href="/crm/payments?status=OVERDUE" className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-3.5">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <IndianRupee className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Overdue Payments</p>
              <p className="text-xs text-red-500">{fmt(summary!.overduePaymentTotal)} overdue — tap to review</p>
            </div>
          </Link>
        )}

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Add</p>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map(({ label, href }) => (
              <Link key={label} href={href}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors active:scale-95">
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Section links */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sections</p>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {navTabs.map(({ label, href }) => (
              <Link key={label} href={href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors active:bg-slate-100">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-slate-300">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  )
}
