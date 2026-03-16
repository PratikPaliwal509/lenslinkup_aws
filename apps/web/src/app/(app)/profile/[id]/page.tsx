'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Phone, Globe, Instagram, Youtube,
  CheckCircle2, Crown, Edit2, Star, MessageSquarePlus, Trash2,
  Briefcase, ShoppingBag, IndianRupee, Settings2, Plus,
} from 'lucide-react'
import Link from 'next/link'
import { profileApi, reviewsApi, servicesApi } from '@/lib/api'
import type { ServiceType } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@/components/connections/ConnectButton'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; emoji: string; slug: string }
interface Profile {
  id: string; userId: string; displayName: string; title?: string; bio?: string
  phone?: string; website?: string; instagram?: string; youtube?: string
  address?: string; area?: string; city?: string; state?: string; pincode?: string
  avatarUrl?: string; bannerUrl?: string
  isVerified: boolean; isPremium: boolean
  avgRating: number; reviewCount: number
  categories: Category[]
}
interface ServiceItem {
  id: string; type: ServiceType; name: string
  description: string | null; price: number | null; unit: string | null
  imageUrl: string | null; order: number
}

interface ReviewItem {
  id: string; rating: number; comment?: string | null; createdAt: string
  workPost?: { id: string; title: string } | null
  reviewer: { id: string; profile?: { displayName: string; avatarUrl?: string | null; title?: string | null } | null }
}

// ── Star picker component ─────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hover || value) ? 'fill-orange-400 text-orange-400' : 'text-slate-300 fill-slate-100'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ── Avg rating display ────────────────────────────────────────────────────────

function RatingSummary({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-900">{avg.toFixed(1)}</p>
        <div className="flex justify-center mt-1">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(avg) ? 'fill-orange-400 text-orange-400' : 'fill-slate-200 text-slate-200'}`} />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{count} review{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfileViewPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const myUserId = useAuthStore((s) => s.user?.id)

  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')

  // Services state
  const [services, setServices] = useState<ServiceItem[]>([])

  // Reviews state
  const [reviews,       setReviews]       = useState<ReviewItem[]>([])
  const [avgRating,     setAvgRating]     = useState(0)
  const [reviewCount,   setReviewCount]   = useState(0)
  const [reviewsLoaded, setReviewsLoaded] = useState(false)

  // Write review form state
  const [showForm,    setShowForm]    = useState(false)
  const [myRating,    setMyRating]    = useState(0)
  const [myComment,   setMyComment]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  // If viewing "/profile/me", redirect to actual userId
  useEffect(() => {
    if (id === 'me' && myUserId) router.replace(`/profile/${myUserId}`)
  }, [id, myUserId, router])

  useEffect(() => {
    if (!id || id === 'me') return
    setLoading(true)
    profileApi.getById(id)
      .then((res) => setProfile(res.data.profile))
      .catch(() => setError('Profile not found'))
      .finally(() => setLoading(false))
  }, [id])

  // Load services (non-blocking)
  useEffect(() => {
    if (!id || id === 'me') return
    servicesApi.list(id)
      .then(({ data }) => setServices(data.items))
      .catch(() => {})
  }, [id])

  // Load reviews separately (non-blocking)
  useEffect(() => {
    if (!id || id === 'me') return
    reviewsApi.list(id)
      .then(({ data }) => {
        setReviews(data.reviews)
        setAvgRating(data.avgRating)
        setReviewCount(data.reviewCount)
      })
      .catch(() => {})
      .finally(() => setReviewsLoaded(true))
  }, [id])

  async function submitReview() {
    if (myRating === 0) { setSubmitError('Please select a rating'); return }
    setSubmitError('')
    setSubmitting(true)
    try {
      await reviewsApi.submit(id!, { rating: myRating, comment: myComment || undefined })
      // Reload reviews
      const { data } = await reviewsApi.list(id!)
      setReviews(data.reviews)
      setAvgRating(data.avgRating)
      setReviewCount(data.reviewCount)
      setShowForm(false)
      setMyRating(0)
      setMyComment('')
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error ?? 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteMyReview() {
    if (!id) return
    await reviewsApi.remove(id).catch(() => {})
    const { data } = await reviewsApi.list(id)
    setReviews(data.reviews)
    setAvgRating(data.avgRating)
    setReviewCount(data.reviewCount)
  }

  if (loading) return <ProfileSkeleton />
  if (error || !profile) return (
    <div className="flex flex-col items-center justify-center h-80 gap-3">
      <p className="text-slate-500">Profile not found</p>
      <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
    </div>
  )

  const isOwnProfile = profile.userId === myUserId
  const location     = [profile.area, profile.city, profile.state].filter(Boolean).join(', ')
  const myReview     = reviews.find((r) => r.reviewer.id === myUserId)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-semibold text-slate-800 truncate">{profile.displayName}</span>
        {isOwnProfile && (
          <Button
            variant="outline"
            className="ml-auto h-8 px-3 text-xs"
            onClick={() => router.push('/profile/edit')}
          >
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-br from-teal-600 to-teal-800 overflow-hidden">
        {profile.bannerUrl ? (
          <img src={profile.bannerUrl} alt="banner" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-32 h-32 rounded-full bg-white" />
          </div>
        )}
      </div>

      {/* Avatar + actions */}
      <div className="px-4 relative">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-200 overflow-hidden shadow-lg">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                  {profile.displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-0.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {isOwnProfile && !profile.isPremium && (
            <Link
              href="/premium"
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow shadow-orange-200 hover:opacity-90 active:scale-95 transition-all"
            >
              <Crown className="w-3.5 h-3.5" /> Go Premium
            </Link>
          )}
          {!isOwnProfile && (
            <ConnectButton targetUserId={profile.userId} />
          )}
        </div>

        {/* Name + badges */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{profile.displayName}</h1>
            {profile.isPremium && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-orange-200">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
          </div>
          {profile.title && <p className="text-sm text-slate-500 mt-0.5">{profile.title}</p>}
          {/* Avg rating under name */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(avgRating) ? 'fill-orange-400 text-orange-400' : 'fill-slate-200 text-slate-200'}`} />
              ))}
              <span className="text-xs text-slate-500 ml-0.5">{avgRating.toFixed(1)} ({reviewCount})</span>
            </div>
          )}
        </div>

        {/* Categories */}
        {profile.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.categories.map((cat) => (
              <span key={cat.id} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1 rounded-full border border-teal-100">
                {cat.emoji} {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="mb-4">
            <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
            <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
            <span>{location}</span>
          </div>
        )}

        {/* Contact + links */}
        <div className="space-y-2 mb-6">
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-600 transition-colors">
              <Phone className="w-4 h-4 text-slate-400" /><span>{profile.phone}</span>
            </a>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-600 transition-colors">
              <Globe className="w-4 h-4 text-slate-400" /><span className="truncate">{profile.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-pink-500 transition-colors">
              <Instagram className="w-4 h-4 text-slate-400" /><span>@{profile.instagram}</span>
            </a>
          )}
          {profile.youtube && (
            <a href={`https://youtube.com/@${profile.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-500 transition-colors">
              <Youtube className="w-4 h-4 text-slate-400" /><span>@{profile.youtube}</span>
            </a>
          )}
        </div>

        {/* Portfolio placeholder */}
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">Portfolio</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                <span className="text-xl">📷</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Services & Products ──────────────────────────────────────────── */}
        {(services.length > 0 || isOwnProfile) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">
                Services & Products
                {services.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({services.length})</span>
                )}
              </h2>
              {isOwnProfile && (
                <Link
                  href="/services"
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Manage
                </Link>
              )}
            </div>

            {services.length === 0 && isOwnProfile && (
              <Link
                href="/services"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl py-6 text-sm text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add your first service or product
              </Link>
            )}

            <div className="space-y-3">
              {services.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'PRODUCT' ? 'bg-orange-50' : 'bg-teal-50'}`}>
                    {item.type === 'PRODUCT'
                      ? <ShoppingBag className="w-5 h-5 text-orange-500" />
                      : <Briefcase   className="w-5 h-5 text-teal-600"   />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.type === 'PRODUCT' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-700'}`}>
                        {item.type === 'PRODUCT' ? 'Product' : 'Service'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    {item.price !== null ? (
                      <div className="flex items-center gap-0.5 mt-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-sm font-bold text-teal-700">{item.price.toLocaleString('en-IN')}</span>
                        {item.unit && <span className="text-xs text-slate-400 ml-1">{item.unit}</span>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">Price on request</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reviews section ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">
              Reviews {reviewCount > 0 && <span className="text-slate-400 font-normal text-sm">({reviewCount})</span>}
            </h2>
            {!isOwnProfile && myUserId && !myReview && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                <MessageSquarePlus className="w-4 h-4" /> Write a Review
              </button>
            )}
          </div>

          {/* Avg summary */}
          {reviewCount > 0 && <RatingSummary avg={avgRating} count={reviewCount} />}

          {/* Write review form */}
          {showForm && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Your Rating</p>
              <StarPicker value={myRating} onChange={setMyRating} />
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Share your experience (optional)…"
                rows={3}
                maxLength={500}
                className="w-full mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              {submitError && <p className="text-xs text-red-500 mt-1">{submitError}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={submitReview}
                  disabled={submitting}
                  className="flex-1 bg-teal-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setMyRating(0); setMyComment(''); setSubmitError('') }}
                  className="px-4 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reviews list */}
          {reviewsLoaded && reviews.length === 0 && !showForm && (
            <p className="text-sm text-slate-400 text-center py-6">No reviews yet.</p>
          )}
          <div className="space-y-3">
            {reviews.map((r) => {
              const isMyReview = r.reviewer.id === myUserId
              const name       = r.reviewer.profile?.displayName ?? 'User'
              const avatar     = r.reviewer.profile?.avatarUrl
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${isMyReview ? 'border-teal-200 bg-teal-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                        {avatar
                          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400">{name[0]?.toUpperCase()}</div>
                        }
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{name}{isMyReview && <span className="text-teal-600"> (You)</span>}</p>
                        <div className="flex mt-0.5">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-orange-400 text-orange-400' : 'fill-slate-200 text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {isMyReview && (
                        <button onClick={deleteMyReview} className="text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-slate-600 mt-2 leading-relaxed">{r.comment}</p>}
                  {r.workPost && (
                    <p className="text-[10px] text-slate-400 mt-1.5">Job: <Link href={`/posts/${r.workPost.id}`} className="text-teal-600 hover:underline">{r.workPost.title}</Link></p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto animate-pulse">
      <div className="h-40 bg-slate-200" />
      <div className="px-4">
        <div className="w-24 h-24 rounded-2xl bg-slate-200 -mt-12 mb-4 border-4 border-white" />
        <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-24 mb-4" />
        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-slate-100 rounded-full w-24" />
          <div className="h-6 bg-slate-100 rounded-full w-20" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-full mb-1" />
        <div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
      </div>
    </div>
  )
}
