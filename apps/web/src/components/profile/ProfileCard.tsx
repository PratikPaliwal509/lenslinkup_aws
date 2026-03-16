import Link from 'next/link'
import { MapPin, CheckCircle2, Crown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfileSummary } from '@/types/profile'

// ── Star rating row ────────────────────────────────────────────────────────────

function StarRating({ avg, count }: { avg: number; count: number }) {
  const full  = Math.floor(avg)
  const half  = avg - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return (
    <div className="flex items-center gap-1 mt-1">
      <div className="flex">
        {Array.from({ length: full  }).map((_, i) => (
          <Star key={`f${i}`} className="w-3 h-3 fill-orange-400 text-orange-400" />
        ))}
        {half === 1 && (
          <div className="relative w-3 h-3">
            <Star className="absolute w-3 h-3 text-slate-200 fill-slate-200" />
            <div className="absolute overflow-hidden w-1.5 h-3">
              <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
            </div>
          </div>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="w-3 h-3 text-slate-200 fill-slate-200" />
        ))}
      </div>
      <span className="text-[10px] text-slate-400">{avg.toFixed(1)} ({count})</span>
    </div>
  )
}

// ── ProfileCard ────────────────────────────────────────────────────────────────

interface Props {
  profile: ProfileSummary
  className?: string
}

export function ProfileCard({ profile, className }: Props) {
  const location   = [profile.area, profile.city].filter(Boolean).join(', ')
  const hasRating  = (profile.reviewCount ?? 0) > 0

  return (
    <Link
      href={`/profile/${profile.userId}`}
      className={cn(
        'block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden',
        className,
      )}
    >
      {/* Premium accent bar */}
      {profile.isPremium && (
        <div className="h-1 bg-gradient-to-r from-orange-400 to-orange-500" />
      )}

      <div className="p-4">
        {/* Avatar + info row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                  {profile.displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-0.5 border border-white">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm truncate">{profile.displayName}</h3>
              {profile.isPremium && (
                <span className="inline-flex items-center gap-0.5 shrink-0 bg-orange-50 text-orange-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-orange-200">
                  <Crown className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            {profile.title && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{profile.title}</p>
            )}
            {location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
                <span className="text-xs text-slate-400 truncate">{location}</span>
              </div>
            )}
            {hasRating && (
              <StarRating avg={profile.avgRating!} count={profile.reviewCount!} />
            )}
          </div>
        </div>

        {/* Bio snippet */}
        {profile.bio && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Category tags */}
        {profile.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-teal-100"
              >
                {cat.emoji} {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

export function ProfileCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-28" />
          <div className="h-3 bg-slate-100 rounded w-20" />
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-3 bg-slate-100 rounded w-3/4 mb-3" />
      <div className="flex gap-1.5">
        <div className="h-5 bg-slate-100 rounded-full w-20" />
        <div className="h-5 bg-slate-100 rounded-full w-16" />
      </div>
    </div>
  )
}
