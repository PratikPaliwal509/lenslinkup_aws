'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react'
import { discoverApi, profileApi } from '@/lib/api'
import { ProfileCard, ProfileCardSkeleton } from '@/components/profile/ProfileCard'
import type { Category, ProfileSummary } from '@/types/profile'
import { cn } from '@/lib/utils'

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [searchInput,    setSearchInput]    = useState('')
  const [activeCat,      setActiveCat]      = useState<string>('')  // slug, '' = all
  const [activeCity,     setActiveCity]     = useState('')
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showFilters,    setShowFilters]    = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [cities,     setCities]     = useState<{ city: string; count: number }[]>([])

  const [profiles,   setProfiles]   = useState<ProfileSummary[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const search = useDebounce(searchInput)

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
    setProfiles([])
    setInitialLoad(true)
  }, [search, activeCat, activeCity])

  // Load categories + cities on mount
  useEffect(() => {
    profileApi.getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => {})

    discoverApi.cities()
      .then((r) => setCities(r.data.cities))
      .catch(() => {})
  }, [])

  // Fetch profiles when page / filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    discoverApi.search({
      search:       search || undefined,
      categorySlug: activeCat || undefined,
      city:         activeCity || undefined,
      page,
      limit: 12,
    })
      .then((r) => {
        if (cancelled) return
        const { profiles: incoming, pagination } = r.data
        setProfiles((prev) => page === 1 ? incoming : [...prev, ...incoming])
        setHasMore(pagination.hasMore)
      })
      .catch(() => {
        if (!cancelled) setProfiles([])
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setInitialLoad(false)
        }
      })

    return () => { cancelled = true }
  }, [search, activeCat, activeCity, page])

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setPage((p) => p + 1) },
      { rootMargin: '200px' },
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setActiveCat('')
    setActiveCity('')
  }, [])

  const hasActiveFilters = searchInput || activeCat || activeCity

  return (
    <div className="max-w-lg mx-auto">
      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100">
        {/* Title row */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">Discover</h1>
            <p className="text-xs text-slate-400">Find photography pros across India</p>
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
              showFilters || activeCity
                ? 'bg-teal-600 text-white border-teal-600'
                : 'text-slate-600 border-slate-200 hover:border-teal-300',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeCity && (
              <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] flex items-center justify-center">1</span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, studio, specialty..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* City filter dropdown (expandable) */}
        {showFilters && (
          <div className="px-4 pb-3 border-t border-slate-100 pt-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by City</p>
            <button
              onClick={() => setShowCityPicker((s) => !s)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                activeCity
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300',
              )}
            >
              <span>{activeCity || 'All Cities'}</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', showCityPicker && 'rotate-180')} />
            </button>

            {showCityPicker && cities.length > 0 && (
              <div className="mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                <button
                  onClick={() => { setActiveCity(''); setShowCityPicker(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors',
                    !activeCity && 'font-semibold text-teal-600',
                  )}
                >
                  All Cities
                </button>
                {cities.map(({ city, count }) => (
                  <button
                    key={city}
                    onClick={() => { setActiveCity(city); setShowCityPicker(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between',
                      activeCity === city && 'font-semibold text-teal-600 bg-teal-50',
                    )}
                  >
                    <span>{city}</span>
                    <span className="text-xs text-slate-400">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category chips — horizontal scroll */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCat('')}
            className={cn(
              'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
              !activeCat
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCat(activeCat === cat.slug ? '' : cat.slug)}
              className={cn(
                'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap',
                activeCat === cat.slug
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300',
              )}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        {/* Active filter pills + count */}
        <div className="flex items-center justify-between mb-3 min-h-[24px]">
          <div className="flex flex-wrap gap-2">
            {activeCity && (
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-100">
                📍 {activeCity}
                <button onClick={() => setActiveCity('')} className="ml-0.5 hover:text-teal-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeCat && categories.find((c) => c.slug === activeCat) && (
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-100">
                {categories.find((c) => c.slug === activeCat)?.emoji}{' '}
                {categories.find((c) => c.slug === activeCat)?.name}
                <button onClick={() => setActiveCat('')} className="ml-0.5 hover:text-teal-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {!initialLoad && (
            <span className="text-xs text-slate-400 shrink-0">
              {profiles.length} result{profiles.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Initial load skeletons */}
        {initialLoad && loading && (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProfileCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Profile grid */}
        {!initialLoad && profiles.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!initialLoad && !loading && profiles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="font-semibold text-slate-700 mb-1">No results found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No profiles yet — be the first to complete yours!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-teal-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Load-more sentinel + spinner */}
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loading && !initialLoad && (
            <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
          )}
          {!loading && !hasMore && profiles.length > 0 && (
            <p className="text-xs text-slate-400">You've seen them all 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}

