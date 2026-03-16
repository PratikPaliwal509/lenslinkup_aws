'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera, Loader2, CheckCircle2, Globe, Lock, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { profileApi, uploadToS3 } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  title:       z.string().trim().max(100).optional(),
  bio:         z.string().trim().max(500).optional(),
  phone:       z.string().trim().max(20).optional(),
  website:     z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  instagram:   z.string().trim().max(60).optional(),
  youtube:     z.string().trim().max(60).optional(),
  area:        z.string().trim().max(100).optional(),
  city:        z.string().trim().max(100).optional(),
  state:       z.string().trim().max(100).optional(),
  pincode:     z.string().trim().max(10).optional(),
})

type FormData = z.infer<typeof schema>

interface Category { id: string; name: string; emoji: string; slug: string }

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter()
  const user   = useAuthStore((s) => s.user)

  const [categories,     setCategories]     = useState<Category[]>([])
  const [selectedCats,   setSelectedCats]   = useState<string[]>([])
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null)
  const [bannerPreview,  setBannerPreview]  = useState<string | null>(null)
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null)
  const [bannerFile,     setBannerFile]     = useState<File | null>(null)
  const [isPublic,       setIsPublic]       = useState(true)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [apiError,       setApiError]       = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Load existing profile + all categories on mount
  useEffect(() => {
    async function load() {
      try {
        const [profileRes, catsRes] = await Promise.all([
          profileApi.getMe(),
          profileApi.getCategories(),
        ])
        const p = profileRes.data.profile
        reset({
          displayName: p.displayName ?? '',
          title:       p.title       ?? '',
          bio:         p.bio         ?? '',
          phone:       p.phone       ?? '',
          website:     p.website     ?? '',
          instagram:   p.instagram   ?? '',
          youtube:     p.youtube     ?? '',
          area:        p.area        ?? '',
          city:        p.city        ?? '',
          state:       p.state       ?? '',
          pincode:     p.pincode     ?? '',
        })
        setSelectedCats(p.categories.map((c: Category) => c.id))
        setAvatarPreview(p.avatarUrl ?? null)
        setBannerPreview(p.bannerUrl ?? null)
        setIsPublic(p.isPublic ?? true)
        setCategories(catsRes.data.categories)
      } catch {
        setApiError('Could not load profile. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reset])

  function toggleCategory(id: string) {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id)
      if (prev.length >= 3) return prev  // max 3
      return [...prev, id]
    })
  }

  function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (v: string) => void,
    setFile: (f: File) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setSaved(false)
    setApiError('')

    try {
      // 1. Upload avatar if changed
      if (avatarFile) {
        const { data: urlData } = await profileApi.getAvatarUploadUrl(avatarFile.type)
        await uploadToS3(urlData.uploadUrl, avatarFile)
        await profileApi.confirmAvatar(urlData.publicUrl)
      }

      // 2. Upload banner if changed
      if (bannerFile) {
        const { data: urlData } = await profileApi.getBannerUploadUrl(bannerFile.type)
        await uploadToS3(urlData.uploadUrl, bannerFile)
        await profileApi.confirmBanner(urlData.publicUrl)
      }

      // 3. Update profile fields (convert empty strings to null)
      const payload = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      ) as FormData

      await profileApi.updateMe({ ...payload, isPublic })

      // 4. Update categories if any selected
      if (selectedCats.length > 0) {
        await profileApi.updateCategories(selectedCats)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setApiError(err.response?.data?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
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
        <span className="font-semibold text-slate-800 flex-1">Edit Profile</span>
        {saved && (
          <div className="flex items-center gap-1 text-teal-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-4 py-5">

        {/* Banner picker */}
        <div>
          <Label>Cover Banner</Label>
          <div
            className="relative h-32 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 overflow-hidden cursor-pointer group"
            onClick={() => bannerInputRef.current?.click()}
          >
            {bannerPreview && (
              <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
              <Camera className="w-6 h-6 text-white" />
              <span className="text-white text-sm ml-2">Change Banner</span>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleImageChange(e, setBannerPreview, setBannerFile)}
            />
          </div>
        </div>

        {/* Avatar picker */}
        <div>
          <Label>Profile Photo</Label>
          <div className="flex items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-2xl bg-slate-200 overflow-hidden cursor-pointer group border-2 border-slate-100"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">
                  {user?.profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleImageChange(e, setAvatarPreview, setAvatarFile)}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Upload photo</p>
              <p className="text-xs text-slate-400">JPG, PNG or WebP · Max 5 MB</p>
            </div>
          </div>
        </div>

        {/* Business / Name */}
        <div>
          <Label htmlFor="displayName">Business / Full Name *</Label>
          <Input
            id="displayName"
            placeholder="Radiant Studios or Arjun Mehta"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">Professional Title</Label>
          <Input
            id="title"
            placeholder="e.g. Wedding Photographer · Mumbai"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            rows={4}
            placeholder="Tell clients about your work, experience, and specialities..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            {...register('bio')}
          />
          {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
        </div>

        {/* Categories (max 3) */}
        <div>
          <Label>Business Categories <span className="text-slate-400 font-normal">(max 3)</span></Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map((cat) => {
              const sel = selectedCats.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    sel
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              )
            })}
          </div>
          {selectedCats.length === 3 && (
            <p className="text-xs text-orange-500 mt-1.5">Maximum 3 categories selected</p>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Contact & Links</h3>
          <div>
            <Label htmlFor="phone">Phone / WhatsApp</Label>
            <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://yourstudio.in" error={errors.website?.message} {...register('website')} />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram Handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <Input id="instagram" placeholder="yourstudio" className="pl-7" {...register('instagram')} />
            </div>
          </div>
          <div>
            <Label htmlFor="youtube">YouTube Handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <Input id="youtube" placeholder="yourchannel" className="pl-7" {...register('youtube')} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Location</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="area">Area / Locality</Label>
              <Input id="area" placeholder="Bandra West" {...register('area')} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Mumbai" {...register('city')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="Maharashtra" {...register('state')} />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" placeholder="400050" {...register('pincode')} />
            </div>
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic
                ? <Globe className="w-5 h-5 text-teal-600" />
                : <Lock  className="w-5 h-5 text-slate-400" />
              }
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isPublic ? 'Public Profile' : 'Private Profile'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isPublic
                    ? 'Visible in search & Discover'
                    : 'Hidden from search & Discover'}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {apiError}
          </div>
        )}

        {/* Services & Products quick link */}
        <Link
          href="/services"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Briefcase className="w-4.5 h-4.5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Services & Products</p>
              <p className="text-xs text-slate-400">Manage what you offer and your pricing</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
        </Link>

        {/* Save Button */}
        <Button type="submit" className="w-full h-12 text-base" loading={saving}>
          {saved ? '✓ Profile Saved!' : 'Save Profile'}
        </Button>

        <div className="pb-4" />
      </form>
    </div>
  )
}
