'use client'

import { useState, useEffect } from 'react'
import { crmApi } from '@/lib/api'
import { X } from 'lucide-react'

interface Props {
  initial?: { id: string; title: string; description?: string | null; status?: string; value?: number | null; expectedCloseDate?: string | null; notes?: string | null; contactId?: string | null }
  onClose: () => void
  onSaved: () => void
}

const STATUSES = ['NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST'] as const

export default function LeadForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title:             initial?.title ?? '',
    description:       initial?.description ?? '',
    status:            initial?.status ?? 'NEW',
    value:             initial?.value ? String(initial.value) : '',
    expectedCloseDate: initial?.expectedCloseDate ? initial.expectedCloseDate.split('T')[0] : '',
    notes:             initial?.notes ?? '',
    contactId:         initial?.contactId ?? '',
  })
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    crmApi.listContacts({}).then(r => setContacts(r.data.contacts)).catch(() => {})
  }, [])

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        status:      form.status,
        notes:       form.notes.trim() || undefined,
        contactId:   form.contactId || undefined,
      }
      if (form.value) payload.value = parseInt(form.value, 10)
      if (form.expectedCloseDate) payload.expectedCloseDate = new Date(form.expectedCloseDate).toISOString()

      if (initial?.id) {
        await crmApi.updateLead(initial.id, payload)
      } else {
        await crmApi.createLead(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save lead')
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
            <h2 className="text-lg font-bold text-slate-800">{initial?.id ? 'Edit Lead' : 'New Lead'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Wedding shoot — Sharma family"
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
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact</label>
              <select value={form.contactId} onChange={e => set('contactId', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400">
                <option value="">— No contact —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Estimated Value (₹)</label>
            <input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="e.g. 25000"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Expected Close Date</label>
            <input type="date" value={form.expectedCloseDate} onChange={e => set('expectedCloseDate', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details about this lead…" rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.99] transition-all mb-2">
            {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Lead'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
