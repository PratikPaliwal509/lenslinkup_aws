'use client'

import { useState, useEffect } from 'react'
import { crmApi } from '@/lib/api'
import { X } from 'lucide-react'

interface Props {
  initial?: { id: string; title: string; amount: number; description?: string | null; status?: string; deliveryDate?: string | null; notes?: string | null; contactId?: string | null; leadId?: string | null }
  onClose: () => void
  onSaved: () => void
}

const STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }

export default function OrderForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title:        initial?.title ?? '',
    amount:       initial?.amount ? String(initial.amount) : '',
    description:  initial?.description ?? '',
    status:       initial?.status ?? 'DRAFT',
    deliveryDate: initial?.deliveryDate ? initial.deliveryDate.split('T')[0] : '',
    notes:        initial?.notes ?? '',
    contactId:    initial?.contactId ?? '',
    leadId:       initial?.leadId ?? '',
  })
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [leads, setLeads] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      crmApi.listContacts({}).then(r => setContacts(r.data.contacts)).catch(() => {}),
      crmApi.listLeads({}).then(r => setLeads(r.data.leads)).catch(() => {}),
    ])
  }, [])

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.amount || parseInt(form.amount, 10) <= 0) { setError('Amount must be greater than 0'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        title:       form.title.trim(),
        amount:      parseInt(form.amount, 10),
        description: form.description.trim() || undefined,
        status:      form.status,
        notes:       form.notes.trim() || undefined,
        contactId:   form.contactId || undefined,
        leadId:      form.leadId || undefined,
      }
      if (form.deliveryDate) payload.deliveryDate = new Date(form.deliveryDate).toISOString()

      if (initial?.id) {
        await crmApi.updateOrder(initial.id, payload)
      } else {
        await crmApi.createOrder(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save order')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88svh]">

        {/* Sticky header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{initial?.id ? 'Edit Order' : 'New Order'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Wedding Photography — 15 Feb"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Amount (₹) *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 35000"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.status === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Client Contact</label>
              <select value={form.contactId} onChange={e => set('contactId', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400">
                <option value="">— Select contact —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {leads.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Linked Lead</label>
              <select value={form.leadId} onChange={e => set('leadId', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400">
                <option value="">— No lead —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Delivery Date</label>
            <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Scope of work…" rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.99] transition-all mb-2">
            {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Order'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
