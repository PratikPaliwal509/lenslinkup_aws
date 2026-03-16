'use client'

import { useEffect, useState } from 'react'
import { Users, Briefcase, GitMerge, TrendingUp, Star, CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import { adminApi, type AdminStats } from '@/lib/adminApi'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'teal',
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color?: 'teal' | 'orange' | 'blue' | 'purple'
}) {
  const colors = {
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-600',   text: 'text-teal-600'  },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-500', text: 'text-orange-500' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-600',   text: 'text-blue-600'  },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
  }
  const c = colors[color]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
      <p className="text-3xl font-black text-slate-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      <p className="text-sm font-semibold text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="w-10 h-10 bg-slate-200 rounded-xl mb-4" />
      <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-28 bg-slate-100 rounded" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    adminApi.getStats()
      .then((res) => setStats(res.data.stats))
      .catch(() => setError('Failed to load stats. Check API connection.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview at a glance</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── User stats ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map((i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                icon={Users}
                label="Total Users"
                value={stats.users.total}
                sub={`${stats.users.withProfile} with profiles`}
                color="teal"
              />
              <StatCard
                icon={UserPlus}
                label="New This Week"
                value={stats.users.last7Days}
                sub="Last 7 days"
                color="blue"
              />
              <StatCard
                icon={CheckCircle2}
                label="Verified"
                value={stats.users.verified}
                sub={`${Math.round((stats.users.verified / (stats.users.total || 1)) * 100)}% of users`}
                color="teal"
              />
              <StatCard
                icon={Star}
                label="Premium"
                value={stats.users.premium}
                sub={`${Math.round((stats.users.premium / (stats.users.total || 1)) * 100)}% of users`}
                color="orange"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* ── Activity stats ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Activity</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map((i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                icon={Briefcase}
                label="Total Posts"
                value={stats.posts.total}
                sub={`${stats.posts.open} currently open`}
                color="blue"
              />
              <StatCard
                icon={TrendingUp}
                label="Open Posts"
                value={stats.posts.open}
                sub="Accepting bids now"
                color="teal"
              />
              <StatCard
                icon={Loader2}
                label="Total Bids"
                value={stats.bids.total}
                sub="Across all posts"
                color="purple"
              />
              <StatCard
                icon={GitMerge}
                label="Connections"
                value={stats.connections.total}
                sub="Accepted pairs"
                color="orange"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/admin/users?filter=verified', label: 'View Verified Users', emoji: '✅' },
            { href: '/admin/users?filter=premium',  label: 'View Premium Users',  emoji: '⭐' },
            { href: '/admin/posts?status=OPEN',     label: 'View Open Posts',     emoji: '📋' },
            { href: '/admin/posts?status=CANCELLED',label: 'View Cancelled',      emoji: '❌' },
            { href: '/admin/settings',              label: 'Adjust Post Caps',    emoji: '🔧' },
            { href: '/admin/users?filter=banned',   label: 'Banned Accounts',     emoji: '🚫' },
          ].map(({ href, label, emoji }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-colors text-sm font-medium text-slate-700"
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-xs leading-snug">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
