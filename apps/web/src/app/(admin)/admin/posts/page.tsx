'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search, MapPin, IndianRupee, Users, XCircle, Ban, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { adminApi, type AdminPost } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',           label: 'All'        },
  { value: 'OPEN',      label: '🟢 Open'    },
  { value: 'CLOSED',    label: '✅ Closed'  },
  { value: 'CANCELLED', label: '❌ Cancelled'},
]

function StatusBadge({ status }: { status: AdminPost['status'] }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />OPEN
      </span>
    )
  }
  if (status === 'CLOSED') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        CLOSED
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
      CANCELLED
    </span>
  )
}

// ── Post Row ──────────────────────────────────────────────────────────────────

function PostRow({
  post,
  onCancel,
}: {
  post: AdminPost
  onCancel: (postId: string) => void
}) {
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Force-cancel this post?')) return
    setCancelling(true)
    try {
      await adminApi.cancelPost(post.id)
      onCancel(post.id)
    } catch {}
    finally { setCancelling(false) }
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      {/* Title + poster */}
      <td className="px-4 py-3 max-w-[260px]">
        <p className="font-semibold text-slate-900 text-sm line-clamp-1">{post.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {post.user.profile?.displayName ?? post.user.email}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={post.status} />
      </td>

      {/* Category */}
      <td className="px-4 py-3 text-xs text-slate-500">
        {post.categorySlug ?? '—'}
      </td>

      {/* City */}
      <td className="px-4 py-3 text-xs text-slate-500">
        {post.city
          ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-teal-500" />{post.city}</span>
          : '—'
        }
      </td>

      {/* Budget */}
      <td className="px-4 py-3 text-xs font-bold text-orange-600 tabular-nums">
        {post.budget
          ? <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{post.budget.toLocaleString('en-IN')}</span>
          : <span className="text-slate-400 font-normal">—</span>
        }
      </td>

      {/* Bids */}
      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />{post._count.bids}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-xs text-slate-400">
        {new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        {post.status === 'OPEN' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
          >
            <Ban className="w-3 h-3" />
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminPostsInner() {
  const searchParams = useSearchParams()

  const [posts,   setPosts]   = useState<AdminPost[]>([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState(searchParams.get('status') ?? '')

  const load = useCallback(async (p: number, s: string, st: string) => {
    setLoading(true)
    try {
      const res = await adminApi.getPosts({
        page: p, limit: 20,
        search: s   || undefined,
        status: st  || undefined,
      })
      setPosts(res.data.posts)
      setTotal(res.data.pagination.total)
      setPages(res.data.pagination.totalPages)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, search, status) }, [page, status, load])

  function handleCancel(postId: string) {
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, status: 'CANCELLED' } : p),
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Posts</h1>
        <p className="text-slate-500 text-sm mt-1">{total.toLocaleString('en-IN')} total work posts</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search title or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            onKeyDown={(e) => e.key === 'Enter' && load(1, search, status)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {search && (
            <button onClick={() => { setSearch(''); load(1, '', status) }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <XCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1) }}
              className={cn(
                'text-xs font-semibold px-3 py-2 rounded-xl border transition-colors whitespace-nowrap',
                status === f.value
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
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Post</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Budget</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Bids</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6,7,8].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                    No posts found
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <PostRow key={p.id} post={p} onCancel={handleCancel} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {page} of {pages}</p>
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

export default function AdminPostsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading…</div>}>
      <AdminPostsInner />
    </Suspense>
  )
}
