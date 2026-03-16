'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Pencil, Trash2, IndianRupee, Crown,
  Briefcase, ShoppingBag, Loader2, CheckCircle2, X,
} from 'lucide-react'
import Link from 'next/link'
import { servicesApi, type ServiceType } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceItem {
  id:          string
  type:        ServiceType
  name:        string
  description: string | null
  price:       number | null
  unit:        string | null
  imageUrl:    string | null
  order:       number
  createdAt:   string
}

// ── Form defaults ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  type:        'SERVICE' as ServiceType,
  name:        '',
  description: '',
  price:       '',
  unit:        '',
}

const FREE_LIMIT    = 5
const PREMIUM_LIMIT = 25

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const router    = useRouter()
  const user      = useAuthStore((s) => s.user)
  const isPremium = user?.profile?.isPremium ?? false
  const limit     = isPremium ? PREMIUM_LIMIT : FREE_LIMIT

  const [items,   setItems]   = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  // Form / modal state
  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [capError,   setCapError]   = useState('')

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    servicesApi.list(userId)
      .then(({ data }) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function openAdd() {
    if (items.length >= limit) {
      setCapError(`You've reached your limit of ${limit} ${isPremium ? '(Premium)' : '(Free)'}. ${!isPremium ? 'Upgrade to Premium for up to 25.' : ''}`)
      return
    }
    setCapError('')
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(item: ServiceItem) {
    setCapError('')
    setEditingId(item.id)
    setForm({
      type:        item.type,
      name:        item.name,
      description: item.description ?? '',
      price:       item.price !== null ? String(item.price) : '',
      unit:        item.unit ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        type:        form.type,
        name:        form.name.trim(),
        description: form.description.trim() || null,
        price:       form.price ? parseInt(form.price, 10) : null,
        unit:        form.unit.trim() || null,
      }

      if (editingId) {
        const { data } = await servicesApi.update(editingId, payload)
        setItems((prev) => prev.map((i) => i.id === editingId ? data.item : i))
      } else {
        const { data } = await servicesApi.create(payload)
        setItems((prev) => [...prev, data.item])
      }
      setShowForm(false)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShowForm(false)
        setCapError(err.response.data.message ?? 'Limit reached')
      } else {
        setFormError(err.response?.data?.error?.formErrors?.[0] ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteId(id)
    try {
      await servicesApi.remove(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      setCapError('')
    } catch {
      // silently fail
    } finally {
      setDeleteId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-slate-800">Services & Products</h1>
          <p className="text-[11px] text-slate-400">{items.length} / {limit} used</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-teal-700 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </header>

      <div className="px-4 py-5 space-y-4 pb-24">

        {/* Tier banner */}
        <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 ${isPremium ? 'bg-orange-50 border border-orange-200' : 'bg-slate-100 border border-slate-200'}`}>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {isPremium ? '👑 Premium' : 'Free Plan'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {items.length} of {limit} services/products added
            </p>
          </div>
          {!isPremium && (
            <Link
              href="/premium"
              className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-600 active:scale-95 transition-all shrink-0"
            >
              <Crown className="w-3.5 h-3.5" /> Upgrade
            </Link>
          )}
          {isPremium && (
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-orange-500" />
            </div>
          )}
        </div>

        {/* Cap error */}
        {capError && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700 flex items-start gap-2">
            <Crown className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
            <span>{capError}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-7 h-7 text-teal-400" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No services yet</h3>
            <p className="text-sm text-slate-400 mb-4">Add the services or products you offer so clients can find you faster.</p>
            <button
              onClick={openAdd}
              className="bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 active:scale-95 transition-all"
            >
              Add First Service
            </button>
          </div>
        )}

        {/* Items list */}
        {!loading && items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'PRODUCT' ? 'bg-orange-50' : 'bg-teal-50'}`}>
                  {item.type === 'PRODUCT'
                    ? <ShoppingBag className="w-4.5 h-4.5 text-orange-500" />
                    : <Briefcase   className="w-4.5 h-4.5 text-teal-600"   />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.type === 'PRODUCT' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-700'}`}>
                      {item.type === 'PRODUCT' ? 'Product' : 'Service'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.price !== null && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-sm font-bold text-teal-700">{item.price.toLocaleString('en-IN')}</span>
                      {item.unit && <span className="text-xs text-slate-400">{item.unit}</span>}
                    </div>
                  )}
                  {item.price === null && (
                    <p className="text-xs text-slate-400 mt-1">Price on request</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteId === item.id}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {deleteId === item.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2  className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit slide-up form ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Form header */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-base">
                {editingId ? 'Edit' : 'Add'} Service / Product
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(['SERVICE', 'PRODUCT'] as ServiceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.type === t
                      ? t === 'PRODUCT' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {t === 'PRODUCT' ? <ShoppingBag className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                  {t === 'PRODUCT' ? 'Product' : 'Service'}
                </button>
              ))}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={form.type === 'PRODUCT' ? 'e.g. 16×20 Canvas Print' : 'e.g. Wedding Photography Package'}
                maxLength={100}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What's included? Turnaround time? Any details that help clients decide…"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
              />
            </div>

            {/* Price + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="Leave blank = on request"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit / Per</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="per day, per photo…"
                  maxLength={40}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Error */}
            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-600 text-white py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Add Service'}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
