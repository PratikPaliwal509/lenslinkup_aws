'use client'

import { useState } from 'react'
import { crmApi } from '@/lib/api'
import { X } from 'lucide-react'

interface Props {
  initial?: { id: string; name: string; phone?: string | null; email?: string | null; company?: string | null; notes?: string | null }
  onClose: () => void
  onSaved: () => void
}

export default function ContactForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name:    initial?.name    ?? '',
    phone:   initial?.phone   ?? '',
    email:   initial?.email   ?? '',
    company: initial?.company ?? '',
    notes:   initial?.notes   ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name:    form.name.trim(),
        phone:   form.phone.trim() || undefined,
        email:   form.email.trim() || undefined,
        company: form.company.trim() || undefined,
        notes:   form.notes.trim() || undefined,
      }
      if (initial?.id) {
        await crmApi.updateContact(initial.id, payload)
      } else {
        await crmApi.createContact(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save contact')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88svh]">

        {/* Sticky header — never scrolls */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{initial?.id ? 'Edit Contact' : 'New Contact'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Name *" value={form.name} onChange={v => set('name', v)} placeholder="Full name" />
            <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="+91 98765 43210" type="tel" />
            <Field label="Email" value={form.email} onChange={v => set('email', v)} placeholder="email@example.com" type="email" />
            <Field label="Company" value={form.company} onChange={v => set('company', v)} placeholder="Studio / business name" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes…"
                rows={3} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button type="submit" disabled={saving}
              className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.99] transition-all mb-2">
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Add Contact'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
    </div>
  )
}
