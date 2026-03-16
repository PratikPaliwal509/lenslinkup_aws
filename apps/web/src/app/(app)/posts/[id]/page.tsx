'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, IndianRupee, Calendar, MapPin, Tag,
  Clock, CheckCircle2, XCircle, Loader2, Send,
  Users,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { postsApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PostUser {
  id: string
  profile: {
    displayName: string
    avatarUrl?: string | null
    city?: string | null
    isVerified: boolean
    isPremium: boolean
  } | null
}

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
  user: PostUser
  _count: { bids: number }
}

interface BidUser {
  id: string
  profile: {
    displayName: string
    avatarUrl?: string | null
    title?: string | null
    city?: string | null
    isVerified: boolean
  } | null
}

interface Bid {
  id: string
  amount: number
  message: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  bidder: BidUser
}

// ── Category map ──────────────────────────────────────────────────────────────

const CATEGORY_NAMES: Record<string, string> = {
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

// ── Bid form schema ───────────────────────────────────────────────────────────

const bidSchema = z.object({
  amount:  z.string().min(1, 'Enter your quoted amount').regex(/^\d+$/, 'Must be a positive number'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(500),
})
type BidForm = z.infer<typeof bidSchema>

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkPost['status'] }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        Open
      </span>
    )
  }
  if (status === 'CLOSED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
        <CheckCircle2 className="w-3 h-3" /> Closed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
      <XCircle className="w-3 h-3" /> Cancelled
    </span>
  )
}

function BidCard({
  bid,
  postStatus,
  onAccept,
  onReject,
}: {
  bid: Bid
  postStatus: WorkPost['status']
  onAccept: (bidId: string) => void
  onReject: (bidId: string) => void
}) {
  const [working, setWorking] = useState(false)
  const p = bid.bidder.profile

  async function accept() {
    setWorking(true)
    try { await onAccept(bid.id) } finally { setWorking(false) }
  }

  async function reject() {
    setWorking(true)
    try { await onReject(bid.id) } finally { setWorking(false) }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm p-4',
        bid.status === 'ACCEPTED'
          ? 'border-teal-200 bg-teal-50/30'
          : bid.status === 'REJECTED'
          ? 'border-slate-100 opacity-60'
          : 'border-slate-100',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/profile/${bid.bidder.id}`} className="shrink-0">
          <div className="relative w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-sm">
            {p?.avatarUrl
              ? <img src={p.avatarUrl} alt={p?.displayName} className="w-full h-full object-cover" />
              : p?.displayName?.[0]?.toUpperCase()
            }
            {p?.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-teal-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Name + amount */}
          <div className="flex items-center justify-between gap-2">
            <Link href={`/profile/${bid.bidder.id}`}>
              <span className="font-semibold text-slate-900 text-sm hover:underline">
                {p?.displayName}
              </span>
            </Link>
            <span className="font-bold text-teal-700 text-sm flex items-center gap-0.5 shrink-0">
              <IndianRupee className="w-3 h-3" />
              {bid.amount.toLocaleString('en-IN')}
            </span>
          </div>

          {p?.title && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{p.title}</p>
          )}
          {p?.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
              <span className="text-xs text-slate-400">{p.city}</span>
            </div>
          )}

          {/* Proposal */}
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{bid.message}</p>

          {/* Status / Actions */}
          {bid.status === 'ACCEPTED' && (
            <div className="mt-3 flex items-center gap-1.5 text-teal-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Accepted
            </div>
          )}
          {bid.status === 'REJECTED' && (
            <p className="mt-3 text-xs text-slate-400">Declined</p>
          )}
          {bid.status === 'PENDING' && postStatus === 'OPEN' && (
            <div className="flex gap-2 mt-3">
              <Button
                className="h-8 px-3 text-xs flex-1"
                loading={working}
                onClick={accept}
              >
                Accept ₹{bid.amount.toLocaleString('en-IN')}
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3 text-xs text-red-500 border-red-200 hover:bg-red-50"
                loading={working}
                onClick={reject}
              >
                Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params   = useParams<{ id: string }>()
  const router   = useRouter()
  const myUserId = useAuthStore((s) => s.user?.id)

  const [post,     setPost]     = useState<WorkPost | null>(null)
  const [bids,     setBids]     = useState<Bid[]>([])
  const [loading,  setLoading]  = useState(true)
  const [bidError, setBidError] = useState('')
  const [bidDone,  setBidDone]  = useState(false)

  const isOwner = !!post && post.userId === myUserId

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BidForm>({ resolver: zodResolver(bidSchema) })

  // ── Load post + bids ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return

    async function load() {
      setLoading(true)
      try {
        const postRes = await postsApi.getById(params.id)
        const p: WorkPost = postRes.data.post
        setPost(p)
        // Only poster can fetch bids list
        if (p.userId === myUserId) {
          const bidsRes = await postsApi.getBids(params.id)
          setBids(bidsRes.data.bids)
        }
      } catch {
        // post not found — post state stays null
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id, myUserId])

  // ── Submit bid ─────────────────────────────────────────────────────────────
  async function onSubmitBid(data: BidForm) {
    setBidError('')
    try {
      await postsApi.submitBid(params.id, {
        amount:  parseInt(data.amount, 10),
        message: data.message,
      })
      setBidDone(true)
      reset()
    } catch (err: any) {
      setBidError(err.response?.data?.message ?? 'Failed to submit bid. Please try again.')
    }
  }

  // ── Accept / reject bid ────────────────────────────────────────────────────
  async function handleAccept(bidId: string) {
    try {
      await postsApi.acceptBid(params.id, bidId)
      setBids((prev) =>
        prev.map((b) =>
          b.id === bidId
            ? { ...b, status: 'ACCEPTED' }
            : b.status === 'PENDING'
            ? { ...b, status: 'REJECTED' }
            : b,
        ),
      )
      setPost((prev) => (prev ? { ...prev, status: 'CLOSED' } : prev))
    } catch {}
  }

  async function handleReject(bidId: string) {
    try {
      await postsApi.rejectBid(params.id, bidId)
      setBids((prev) =>
        prev.map((b) => (b.id === bidId ? { ...b, status: 'REJECTED' } : b)),
      )
    } catch {}
  }

  // ── Cancel post ────────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!confirm('Cancel this post? This cannot be undone.')) return
    try {
      await postsApi.cancel(params.id)
      setPost((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev))
    } catch {}
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
        </header>
        <div className="px-4 py-5 space-y-4">
          <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 mb-4">Post not found.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-semibold text-slate-800 flex-1 truncate text-sm">
          {post.title}
        </span>
        <StatusBadge status={post.status} />
      </header>

      <div className="px-4 py-5 space-y-5">

        {/* ── Post card ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">

          {/* Poster row */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${post.user.id}`} className="shrink-0">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-sm">
                {post.user.profile?.avatarUrl
                  ? <img
                      src={post.user.profile.avatarUrl}
                      alt={post.user.profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  : post.user.profile?.displayName?.[0]?.toUpperCase()
                }
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${post.user.id}`}>
                <span className="font-semibold text-slate-900 text-sm hover:underline">
                  {post.user.profile?.displayName}
                </span>
              </Link>
              {post.user.profile?.city && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-teal-500" />
                  <span className="text-xs text-slate-400">{post.user.profile.city}</span>
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {new Date(post.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              })}
            </span>
          </div>

          {/* Content */}
          <h1 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
            {post.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {post.description}
          </p>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {post.categorySlug && (
              <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-100">
                <Tag className="w-3 h-3" />
                {CATEGORY_NAMES[post.categorySlug] ?? post.categorySlug}
              </span>
            )}
            {post.city && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-100">
                <MapPin className="w-3 h-3" />{post.city}
              </span>
            )}
            {post.budget && (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full border border-orange-100 font-semibold">
                <IndianRupee className="w-3 h-3" />
                Budget: ₹{post.budget.toLocaleString('en-IN')}
              </span>
            )}
            {post.eventDate && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
                <Calendar className="w-3 h-3" />
                {new Date(post.eventDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {post._count.bids} bid{post._count.bids !== 1 ? 's' : ''} received
              </span>
            </div>
            {isOwner && post.status === 'OPEN' && (
              <button
                onClick={handleCancel}
                className="text-xs text-red-400 hover:text-red-600 hover:underline"
              >
                Cancel Post
              </button>
            )}
          </div>
        </div>

        {/* ── Poster: bids section ── */}
        {isOwner && (
          <section>
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" />
              Bids Received
              {bids.length > 0 && (
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                  {bids.length}
                </span>
              )}
            </h2>

            {bids.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No bids yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Professionals will start sending quotes shortly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    postStatus={post.status}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Applicant: bid form / status ── */}
        {!isOwner && (
          <section>
            {post.status !== 'OPEN' ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
                <p className="text-sm text-slate-500 font-semibold">
                  {post.status === 'CLOSED'
                    ? '✅ This post is closed — a professional was selected.'
                    : '❌ This post was cancelled by the client.'}
                </p>
              </div>
            ) : bidDone ? (
              <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <p className="font-semibold text-teal-800">Bid Submitted!</p>
                <p className="text-sm text-teal-600 mt-1">
                  The client will review your proposal and respond.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-500" />
                  Submit Your Bid
                </h2>

                <form onSubmit={handleSubmit(onSubmitBid)} className="space-y-4">
                  {/* Amount */}
                  <div>
                    <Label htmlFor="amount">Your Quoted Price (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="25000"
                        className="pl-8"
                        error={errors.amount?.message}
                        {...register('amount')}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <Label htmlFor="message">Your Proposal *</Label>
                    <textarea
                      id="message"
                      rows={4}
                      placeholder="Introduce yourself, describe your experience, and explain why you're the right fit..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      {...register('message')}
                    />
                    {errors.message && (
                      <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>
                    )}
                  </div>

                  {/* API error */}
                  {bidError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                      {bidError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    loading={isSubmitting}
                  >
                    Send Bid
                  </Button>
                </form>
              </div>
            )}
          </section>
        )}

        <div className="pb-4" />
      </div>
    </div>
  )
}
