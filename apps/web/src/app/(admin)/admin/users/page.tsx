'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search, CheckCircle2, Star, Shield, Ban, RefreshCw,
  ChevronLeft, ChevronRight, XCircle, MoreVertical,
} from 'lucide-react'
import { adminApi, type AdminUser } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILTERS = [
  { value: '',         label: 'All Users' },
  { value: 'verified', label: '✅ Verified' },
  { value: 'premium',  label: '⭐ Premium'  },
  { value: 'banned',   label: '🚫 Banned'   },
]

// ── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  user,
  onUpdate,
}: {
  user: AdminUser
  onUpdate: (userId: string, updates: Record<string, boolean | string>) => void
}) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const p = user.profile

  async function toggle(field: string, value: boolean | string) {
    setWorking(true)
    setOpen(false)
    try {
      await adminApi.patchUser(user.id, { [field]: value } as any)
      onUpdate(user.id, { [field]: value })
    } catch {}
    finally { setWorking(false) }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        disabled={working}
      >
        {working
          ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
          : <MoreVertical className="w-4 h-4 text-slate-400" />
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-xl border border-slate-100 shadow-lg py-1 overflow-hidden">

            {/* Verify / Unverify */}
            <button
              onClick={() => toggle('isVerified', !p?.isVerified)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
              {p?.isVerified ? 'Remove Verified' : 'Mark Verified'}
            </button>

            {/* Premium / Remove Premium */}
            <button
              onClick={() => toggle('isPremium', !p?.isPremium)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Star className="w-4 h-4 text-orange-500" />
              {p?.isPremium ? 'Remove Premium' : 'Grant Premium'}
            </button>

            {/* Ban / Unban */}
            <button
              onClick={() => toggle('isActive', !p?.isActive)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-slate-50',
                p?.isActive ? 'text-red-600' : 'text-teal-600',
              )}
            >
              {p?.isActive
                ? <><Ban className="w-4 h-4" /> Ban Account</>
                : <><Shield className="w-4 h-4" /> Unban Account</>
              }
            </button>

            {/* Promote / Demote Admin */}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => toggle('role', user.role === 'ADMIN' ? 'USER' : 'ADMIN') as any}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Shield className="w-4 h-4 text-purple-500" />
                {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onUpdate,
}: {
  user: AdminUser
  onUpdate: (userId: string, updates: Record<string, boolean | string>) => void
}) {
  const p = user.profile

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      {/* Avatar + name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-sm shrink-0">
            {p?.avatarUrl
              ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
              : p?.displayName?.[0]?.toUpperCase() ?? '?'
            }
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {p?.displayName ?? <span className="text-slate-400 font-normal">No profile</span>}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-4 py-3 text-xs text-slate-500">{p?.city ?? '—'}</td>

      {/* Category */}
      <td className="px-4 py-3 text-xs text-slate-500">
        {p?.categories?.[0]?.category
          ? `${p.categories[0].category.emoji} ${p.categories[0].category.name}`
          : '—'
        }
      </td>

      {/* Badges */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {p?.isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {p?.isPremium && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
              <Star className="w-2.5 h-2.5" /> PRO
            </span>
          )}
          {!p?.isActive && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              <Ban className="w-2.5 h-2.5" /> Banned
            </span>
          )}
          {user.role === 'ADMIN' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              <Shield className="w-2.5 h-2.5" /> Admin
            </span>
          )}
        </div>
      </td>

      {/* Counts */}
      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
        {user._count.workPosts}p / {user._count.bids}b
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-xs text-slate-400">
        {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <ActionMenu user={user} onUpdate={onUpdate} />
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminUsersInner() {
  const searchParams = useSearchParams()

  const [users,    setUsers]    = useState<AdminUser[]>([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState(searchParams.get('filter') ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (p: number, s: string, f: string) => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({ page: p, limit: 20, search: s || undefined, filter: f || undefined })
      setUsers(res.data.users)
      setTotal(res.data.pagination.total)
      setPages(res.data.pagination.totalPages)
    } catch {}
    finally { setLoading(false) }
  }, [])

  // Initial load + when filter/page changes
  useEffect(() => { load(page, search, filter) }, [page, filter, load])

  // Debounced search
  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(1, val, filter), 400)
  }

  function handleUpdate(userId: string, updates: Record<string, boolean | string>) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        const newProfile = u.profile ? { ...u.profile, ...updates } : u.profile
        const newUser    = { ...u, ...updates, profile: newProfile }
        return newUser as AdminUser
      }),
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total.toLocaleString('en-IN')} total users
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <XCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1) }}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-xl border transition-colors whitespace-nowrap',
                filter === f.value
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Badges</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Posts/Bids</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <UserRow key={u.id} user={u} onUpdate={handleUpdate} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading…</div>}>
      <AdminUsersInner />
    </Suspense>
  )
}
