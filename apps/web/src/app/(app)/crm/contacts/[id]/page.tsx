'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { ArrowLeft, Phone, Mail, Building2, Edit2, Trash2 } from 'lucide-react'
import ContactForm from '@/components/crm/ContactForm'

interface Contact {
  id: string; name: string; phone?: string | null; email?: string | null
  company?: string | null; notes?: string | null; linkedUserId?: string | null
  linkedUser?: { id: string; profile?: { displayName: string; avatarUrl?: string | null } | null } | null
  leads: { id: string; title: string; status: string; value?: number | null }[]
  orders: { id: string; title: string; amount: number; status: string }[]
  todos: { id: string; title: string; status: string; priority: string; dueDate?: string | null }[]
}

const LEAD_STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700', CONTACTED: 'bg-yellow-50 text-yellow-700',
  NEGOTIATING: 'bg-orange-50 text-orange-700', WON: 'bg-green-50 text-green-700', LOST: 'bg-slate-100 text-slate-500',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-500', CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-orange-50 text-orange-700', COMPLETED: 'bg-green-50 text-green-700', CANCELLED: 'bg-red-50 text-red-500',
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'leads' | 'orders' | 'todos'>('info')
  const [editing, setEditing] = useState(false)

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.getContact(id)
      setContact(res.data.contact)
    } catch { router.replace('/crm/contacts') }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async () => {
    if (!confirm('Delete this contact?')) return
    try { await crmApi.deleteContact(id); router.replace('/crm/contacts') } catch {}
  }

  if (loading) return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="h-14 bg-white border-b border-slate-100 animate-pulse" />
      <div className="px-4 py-4 space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!contact) return null
  const initials = contact.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="flex-1 font-bold text-slate-800 truncate">{contact.name}</h1>
        <button onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-slate-100">
          <Edit2 className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </header>

      {/* Avatar + name */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-4">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{contact.name}</h2>
          {contact.company && <p className="text-sm text-slate-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{contact.company}</p>}
          {contact.linkedUserId && <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-600 rounded-full font-medium mt-1 inline-block">LensLinkUp Member</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4">
        {(['info', 'leads', 'orders', 'todos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
            {t} {t === 'leads' ? `(${contact.leads.length})` : t === 'orders' ? `(${contact.orders.length})` : t === 'todos' ? `(${contact.todos.length})` : ''}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'info' && (
          <>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-800">{contact.phone}</p>
                </div>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-800">{contact.email}</p>
                </div>
              </a>
            )}
            {contact.notes && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{contact.notes}</p>
              </div>
            )}
            {!contact.phone && !contact.email && !contact.notes && (
              <p className="text-center text-sm text-slate-400 py-8">No additional info · tap edit to add</p>
            )}
          </>
        )}

        {tab === 'leads' && (
          contact.leads.length === 0
            ? <p className="text-center text-sm text-slate-400 py-8">No leads linked</p>
            : contact.leads.map(l => (
              <div key={l.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 flex-1">{l.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS_COLOR[l.status] ?? ''}`}>{l.status}</span>
                </div>
                {l.value && <p className="text-xs text-slate-400 mt-1">Value: ₹{l.value.toLocaleString('en-IN')}</p>}
              </div>
            ))
        )}

        {tab === 'orders' && (
          contact.orders.length === 0
            ? <p className="text-center text-sm text-slate-400 py-8">No orders linked</p>
            : contact.orders.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 flex-1">{o.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLOR[o.status] ?? ''}`}>{o.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-bold text-teal-700 mt-1">₹{o.amount.toLocaleString('en-IN')}</p>
              </div>
            ))
        )}

        {tab === 'todos' && (
          contact.todos.length === 0
            ? <p className="text-center text-sm text-slate-400 py-8">No tasks linked</p>
            : contact.todos.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.priority === 'HIGH' ? 'bg-red-400' : t.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-slate-300'}`} />
                <p className={`text-sm flex-1 ${t.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                {t.dueDate && <p className="text-xs text-slate-400 flex-shrink-0">{new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>}
              </div>
            ))
        )}
      </div>

      {editing && (
        <ContactForm
          initial={contact}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); fetch() }}
        />
      )}
    </div>
  )
}
