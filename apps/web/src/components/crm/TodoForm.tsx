'use client'

import { useState, useEffect } from 'react'
import { todosApi, crmApi } from '@/lib/api'
import { X } from 'lucide-react'

interface Props {
  defaultContactId?: string
  defaultLeadId?: string
  defaultOrderId?: string
  onClose: () => void
  onSaved: () => void
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
const PRIORITY_COLOR: Record<string, string> = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-orange-100 text-orange-700', HIGH: 'bg-red-100 text-red-700' }

export default function TodoForm({ defaultContactId, defaultLeadId, defaultOrderId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title:           '',
    description:     '',
    priority:        'MEDIUM' as typeof PRIORITIES[number],
    dueDate:         '',
    linkedContactId: defaultContactId ?? '',
    linkedLeadId:    defaultLeadId ?? '',
    linkedOrderId:   defaultOrderId ?? '',
  })
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [leads, setLeads] = useState<{ id: string; title: string }[]>([])
  const [orders, setOrders] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      crmApi.listContacts({}).then(r => setContacts(r.data.contacts)).catch(() => {}),
      crmApi.listLeads({}).then(r => setLeads(r.data.leads)).catch(() => {}),
      crmApi.listOrders({}).then(r => setOrders(r.data.orders)).catch(() => {}),
    ])
  }, [])

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        title:           form.title.trim(),
        description:     form.description.trim() || undefined,
        priority:        form.priority,
        linkedContactId: form.linkedContactId || undefined,
        linkedLeadId:    form.linkedLeadId || undefined,
        linkedOrderId:   form.linkedOrderId || undefined,
      }
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString()
      await todosApi.create(payload)
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save task')
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
            <h2 className="text-lg font-bold text-slate-800">New Task</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Task *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Follow up with client about shoot dates"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p} type="button" onClick={() => set('priority', p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    form.priority === p ? PRIORITY_COLOR[p] + ' ring-2 ring-inset ring-current' : 'bg-slate-50 text-slate-400'
                  }`}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details…" rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none" />
          </div>

          {/* CRM Links */}
          <div className="pt-1 border-t border-slate-50">
            <p className="text-xs font-semibold text-slate-400 mb-2">Link to (optional)</p>
            <div className="space-y-2">
              {contacts.length > 0 && (
                <select value={form.linkedContactId} onChange={e => set('linkedContactId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-400">
                  <option value="">👤 No contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {leads.length > 0 && (
                <select value={form.linkedLeadId} onChange={e => set('linkedLeadId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-400">
                  <option value="">📈 No lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.title.slice(0, 40)}</option>)}
                </select>
              )}
              {orders.length > 0 && (
                <select value={form.linkedOrderId} onChange={e => set('linkedOrderId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-400">
                  <option value="">📦 No order</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.title.slice(0, 40)}</option>)}
                </select>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.99] transition-all mb-2">
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
