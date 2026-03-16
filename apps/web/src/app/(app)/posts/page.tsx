'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Briefcase, Plus, MapPin, IndianRupee, Calendar,
  Users, Loader2,
} from 'lucide-react'
import { postsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkPost {
  id: string
  title: string
  description: string
  categorySlug?: string | null
  city?: string | null
  budget?: number | null
  eventDate?: string | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  createdAt: string
  userId: string
  user: {
    id: string
    profile: {
      displayName: string
      avatarUrl?: string | null
      city?: string | null
      isVerified: boolean
      isPremium: boolean
    } | null
  }
  _count: { bids: number }
}

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: '',                     name: 'All'                },
  { slug: 'photographer',         name: '📷 Photo'           },
  { slug: 'videographer',         name: '🎬 Video'           },
  { slug: 'cinematographer',      name: '🎥 Cinema'          },
  { slug: 'drone-operator',       name: '🚁 Drone'           },
  { slug: 'event-photographer',   name: '🎉 Events'          },
  { slug: 'product-photographer', name: '📦 Product'         },
  { slug: 'photo-studio',         name: '🏢 Studio'          },
  { slug: 'photo-editor',         name: '✏️ Editing'         },
  { slug: 'album-designer',       name: '📖 Albums'          },
  { slug: 'print-lab',            name: '🖨️ Print'           },
  { slug: 'equipment-rental',     name: '🔧 Rental'          },
  { slug: 'photography-trainer',  name: '🎓 Training'        },
]

const CATEGORY_DISPLAY: Record<string, string> = {
  'photographer':          '📷 Photographer',
  'videographer':          '🎬 Videographer',
  'cinematographer':       '🎥 Cinematographer',
  'drone-operator':        '🚁 Drone Operator',
  'photo-studio':          '🏢 Photo Studio',
  'photo-editor':          '✏️ Photo Editor',
  'album-designer':        '📖 Album Designer',
  'event-photographer':    '🎉 Event Photographer',
  'product-photographer':  '📦 Product Photographer',
  'print-lab':             '🖨️ Print Lab',
  'equipment-rental':      '🔧 Equipment Rental',
  'photography-trainer':   '🎓 Photography Trainer',
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: WorkPost }) {
  const p = post.user.profile

  return (
    <Link href={`/posts/${post.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 transition-shadow group-hover:shadow-md">
        {/* Poster row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
            {p?.avatarUrl
              ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
              : p?.displayName?.[0]?.toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-700 truncate">{p?.displayName}</span>
            {p?.city && <span className="text-xs text-slate-400 ml-1.5">· {p.city}</span>}
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            {new Date(post.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short',
            })}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="font-bold text-slate-900 text-sm mb-1.5 leading-snug line-clamp-2">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {post.description}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.categorySlug && (
            <span className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
              {CATEGORY_DISPLAY[post.categorySlug] ?? post.categorySlug}
            </span>
          )}
          {post.city && (
            <span className="inline-flex items-center gap-0.5 text-[11px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
              <MapPin className="w-2.5 h-2.5" />{post.city}
            </span>
          )}
          {post.eventDate && (
            <span className="inline-flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(post.eventDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              })}
            </span>
          )}
        </div>

        {/* Footer: budget + bid count */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          {post.budget ? (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600">
              <IndianRupee className="w-3 h-3" />₹{post.budget.toLocaleString('en-IN')}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Budget TBD</span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Users className="w-3 h-3" />
            {post._count.bids} bid{post._count.bids !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}

function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
        <div className="h-3 bg-slate-200 rounded w-28" />
        <div className="h-2 bg-slate-100 rounded w-12 ml-auto" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-24 bg-slate-100 rounded-full" />
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="pt-2 border-t border-slate-50 flex justify-between">
        <div className="h-3 w-16 bg-slate-200 rounded" />
        <div className="h-3 w-12 bg-slate-100 rounded" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostsFeedPage() {
  const router = useRouter()

  const [posts,       setPosts]       = useState<WorkPost[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category,    setCategory]    = useState('')
  const [hasMore,     setHasMore]     = useState(true)

  const pageRef     = useRef(1)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        pageRef.current = 1
        setPosts([])
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      try {
        const res = await postsApi.feed({
          categorySlug: category || undefined,
          page:  pageRef.current,
          limit: 15,
        })
        const { posts: newPosts, pagination } = res.data
        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]))
        setHasMore(pagination.hasMore)
      } catch {}
      finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [category],
  )

  // Reset on filter change
  useEffect(() => {
    fetchPosts(true)
  }, [fetchPosts])

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          pageRef.current += 1
          fetchPosts(false)
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, fetchPosts])

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-teal-600" />
          <span className="font-bold text-slate-900">Work Board</span>
        </div>
        <button
          onClick={() => router.push('/post/new')}
          className="inline-flex items-center gap-1 bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Post Job
        </button>
      </header>

      {/* Category filter chips */}
      <div className="sticky top-[113px] z-30 bg-white border-b border-slate-100">
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={cn(
                'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap',
                category === c.slug
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No open jobs</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
              {category
                ? 'No posts in this category yet.'
                : 'Be the first to post a requirement!'}
            </p>
            <button
              onClick={() => (category ? setCategory('') : router.push('/post/new'))}
              className="text-sm font-semibold text-teal-600 hover:underline"
            >
              {category ? 'Clear filter' : 'Post a Requirement'}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>

            {/* Load more spinner */}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              </div>
            )}

            {/* End of list */}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-xs text-slate-400 py-4">
                You've seen all open jobs
              </p>
            )}

            {/* Invisible sentinel */}
            <div ref={sentinelRef} className="h-1" />
          </>
        )}
      </div>
    </div>
  )
}
