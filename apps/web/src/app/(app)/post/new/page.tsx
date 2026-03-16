'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, IndianRupee, Calendar, CheckCircle2, Crown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { postsApi } from '@/lib/api'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title:        z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description:  z.string().trim().min(20, 'Add at least 20 characters describing your requirement').max(2000),
  categorySlug: z.string().optional(),
  city:         z.string().trim().max(100).optional(),
  budget:       z.string().optional(),    // string in form → converted to int before submit
  eventDate:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Category options ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'photographer',     name: '📷 Photographer'         },
  { slug: 'videographer',     name: '🎬 Videographer'         },
  { slug: 'cinematographer',  name: '🎥 Cinematographer'      },
  { slug: 'drone-operator',   name: '🚁 Drone Operator'       },
  { slug: 'photo-studio',     name: '🏢 Photo Studio'         },
  { slug: 'photo-editor',     name: '✏️ Photo Editor'         },
  { slug: 'album-designer',   name: '📖 Album Designer'       },
  { slug: 'event-photographer', name: '🎉 Event Photographer' },
  { slug: 'product-photographer', name: '📦 Product Photographer' },
  { slug: 'print-lab',        name: '🖨️ Print Lab'            },
  { slug: 'equipment-rental', name: '🔧 Equipment Rental'     },
  { slug: 'photography-trainer', name: '🎓 Photography Trainer' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewPostPage() {
  const router    = useRouter()
  const [apiError,  setApiError]  = useState('')
  const [success,   setSuccess]   = useState(false)
  const [postId,    setPostId]    = useState('')
  const [postCapped, setPostCapped] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setApiError('')
    try {
      const res = await postsApi.create({
        title:        data.title,
        description:  data.description,
        categorySlug: data.categorySlug || undefined,
        city:         data.city         || undefined,
        budget:       data.budget ? parseInt(data.budget, 10) : undefined,
        eventDate:    data.eventDate ? new Date(data.eventDate).toISOString() : undefined,
      })
      setPostId(res.data.post.id)
      setSuccess(true)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setPostCapped(true)
      } else {
        setApiError(err.response?.data?.message ?? 'Something went wrong. Please try again.')
      }
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Requirement Posted!</h2>
        <p className="text-sm text-slate-500 mb-6">Professionals will start sending you quotes shortly.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push(`/posts/${postId}`)}>View Post & Bids</Button>
          <Button variant="outline" onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-semibold text-slate-800">Post a Requirement</span>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 space-y-5">

        {/* Title */}
        <div>
          <Label htmlFor="title">What do you need? *</Label>
          <Input
            id="title"
            placeholder="e.g. Wedding photographer needed in Mumbai"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Describe your requirement *</Label>
          <textarea
            id="description"
            rows={5}
            placeholder="Share details: date, location, style preferences, number of photos, any special requirements..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="categorySlug">Type of Professional</Label>
          <select
            id="categorySlug"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            {...register('categorySlug')}
          >
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* City + Budget row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Mumbai" {...register('city')} />
          </div>
          <div>
            <Label htmlFor="budget">Budget (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                id="budget"
                type="number"
                placeholder="25000"
                className="pl-8"
                {...register('budget')}
              />
            </div>
          </div>
        </div>

        {/* Event Date */}
        <div>
          <Label htmlFor="eventDate">Event / Required By Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              id="eventDate"
              type="date"
              className="pl-10"
              {...register('eventDate')}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="bg-teal-50 rounded-xl border border-teal-100 p-4 text-sm text-teal-800 space-y-1">
          <p className="font-semibold text-teal-700">💡 Tips for great responses</p>
          <p className="text-xs text-teal-600">• Be specific about dates, location, and style</p>
          <p className="text-xs text-teal-600">• Mention your budget range (helps filter suitable pros)</p>
          <p className="text-xs text-teal-600">• Describe the mood or examples you have in mind</p>
        </div>

        {/* Post cap banner */}
        {postCapped && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-semibold text-orange-700">Post limit reached</p>
            </div>
            <p className="text-xs text-orange-600 mb-3">
              Free accounts can have up to 3 open posts. Upgrade to Premium for up to 20 posts, featured listing, and more.
            </p>
            <Link
              href="/premium"
              className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-600 active:scale-95 transition-all"
            >
              <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
            </Link>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {apiError}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base" loading={isSubmitting}>
          Post Requirement
        </Button>

        <div className="pb-4" />
      </form>
    </div>
  )
}
