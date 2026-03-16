'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, IndianRupee, MapPin, Users } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { postsApi, discoverApi } from '@/lib/api'

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
    profile: { displayName: string; avatarUrl?: string | null; city?: string | null } | null
  }
  _count: { bids: number }
}

interface NearbyProfile {
  userId:      string
  displayName: string
  title?:      string | null
  avatarUrl?:  string | null
  isVerified:  boolean
  isPremium:   boolean
}

// ── Active Near You ────────────────────────────────────────────────────────────

function StoryRing({ profile }: { profile: NearbyProfile }) {
  return (
    <Link href={`/profile/${profile.userId}`} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
      <div className={`p-0.5 rounded-full ${profile.isPremium ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-gradient-to-br from-teal-500 to-teal-600'}`}>
        <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white overflow-hidden flex items-center justify-center font-bold text-slate-500 text-base">
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
            : profile.displayName[0]?.toUpperCase()
          }
        </div>
      </div>
      <span className="text-[10px] text-slate-600 text-center leading-tight line-clamp-2 w-full">
        {profile.displayName}
      </span>
    </Link>
  )
}

function StoryRingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-16 animate-pulse">
      <div className="w-13 h-13 rounded-full bg-slate-200 p-0.5">
        <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white" />
      </div>
      <div className="h-2 bg-slate-100 rounded w-12" />
    </div>
  )
}

// ── Mini post card ────────────────────────────────────────────────────────────

function MiniPostCard({ post }: { post: WorkPost }) {
  const p = post.user.profile

  return (
    <Link href={`/posts/${post.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 transition-shadow group-hover:shadow-md">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="font-bold text-slate-900 text-sm line-clamp-1 flex-1">
            {post.title}
          </h4>
          {post.budget && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 shrink-0">
              <IndianRupee className="w-3 h-3" />
              ₹{post.budget.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {post.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-[10px]">
              {p?.avatarUrl
                ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                : p?.displayName?.[0]?.toUpperCase()
              }
            </div>
            <span>{p?.displayName}</span>
            {post.city && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-teal-500" />
                  {post.city}
                </span>
              </>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {post._count.bids}
          </span>
        </div>
      </div>
    </Link>
  )
}

function MiniPostSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-slate-200 rounded w-36" />
          <div className="h-2 bg-slate-100 rounded w-20" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-3 bg-slate-100 rounded w-3/4" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const user = useAuthStore((s) => s.user)

  const [posts,          setPosts]          = useState<WorkPost[]>([])
  const [nearbyProfiles, setNearbyProfiles] = useState<NearbyProfile[]>([])
  const [nearbyCity,     setNearbyCity]     = useState('')
  const [loadingPosts,   setLoadingPosts]   = useState(true)
  const [loadingNearby,  setLoadingNearby]  = useState(true)

  useEffect(() => {
    postsApi
      .feed({ limit: 5 })
      .then((res) => setPosts(res.data.posts))
      .catch(() => {})
      .finally(() => setLoadingPosts(false))

    discoverApi
      .activeNearYou()
      .then((res: any) => {
        setNearbyProfiles(res.data.profiles ?? [])
        setNearbyCity(res.data.city ?? '')
      })
      .catch(() => {})
      .finally(() => setLoadingNearby(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto">
      {/* No sub-header needed — logo + bell live in the global TopNavBar */}

      <div className="px-4 py-6 space-y-6">
        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-5 text-white">
          <p className="text-sm text-teal-100 mb-1">Welcome back 👋</p>
          <h2 className="text-xl font-bold">{user?.profile?.displayName ?? 'Photographer'}</h2>
          <p className="text-sm text-teal-100 mt-2">
            Complete your profile to get discovered by clients.
          </p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-block bg-white text-teal-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-50 transition-colors"
          >
            Complete Profile →
          </Link>
        </div>

        {/* Active Near You */}
        {(loadingNearby || nearbyProfiles.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800">Active Near You</h3>
                {nearbyCity && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-500" /> {nearbyCity}
                  </p>
                )}
              </div>
              <Link
                href="/discover"
                className="flex items-center gap-0.5 text-xs text-teal-600 font-semibold hover:underline"
              >
                See all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
              {loadingNearby
                ? [1, 2, 3, 4, 5].map((i) => <StoryRingSkeleton key={i} />)
                : nearbyProfiles.map((p) => <StoryRing key={p.userId} profile={p} />)
              }
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/discover',    emoji: '🔍', label: 'Browse Pros',     desc: 'Find studios & talent' },
            { href: '/post/new',    emoji: '📋', label: 'Post a Job',      desc: 'Get quotes from pros' },
            { href: '/connections', emoji: '🤝', label: 'My Network',      desc: 'Connect with others'  },
            { href: '/profile/me',  emoji: '👤', label: 'My Profile',      desc: 'Edit & share profile' },
          ].map(({ href, emoji, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">{emoji}</div>
              <p className="font-semibold text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Latest jobs feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">Latest Jobs</h3>
            <Link
              href="/posts"
              className="flex items-center gap-0.5 text-xs text-teal-600 font-semibold hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingPosts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <MiniPostSkeleton key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-400 mb-3">No open jobs yet.</p>
              <Link
                href="/post/new"
                className="inline-block bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors"
              >
                Post First Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <MiniPostCard key={post.id} post={post} />
              ))}
              <Link
                href="/posts"
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors"
              >
                Browse all open jobs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
