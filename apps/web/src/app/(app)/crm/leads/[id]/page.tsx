'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { ArrowLeft, Edit2, Trash2, ChevronRight } from 'lucide-react'
import LeadForm from '@/components/crm/LeadForm'

const STATUSES = ['NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST'] as const
type LeadStatus = typeof STATUSES[number]

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-yellow-100 text-yellow-700',
  NEGOTIATING: 'bg-orange-100 text-orange-700', WON: 'bg-green-100 text-green-700', LOST: 'bg-slate-200 text-slate-500',
}

interface Lead {
  id: string; title: string; description?: string | null; status: string
  value?: number | null; expectedCloseDate?: string | null; notes?: string | null
  contact?: { id: string; name: string; company?: string | null } | null
  workPost?: { id: string; title: string } | null
  orders: { id: string; title: string; amount: number; status: string }[]
  todos: { id: string; title: string; status: string; priority: string }[]
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.getLead(id)
      setLead(res.data.lead)
    } catch { router.replace('/crm/leads') }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { fetch() }, [fetch])

  const moveStatus = async (s: LeadStatus) => {
    if (!lead || s === lead.status || updating) return
    setUpdating(true)
    try {
      const res = await crmApi.updateLead(id, { status: s })
      setLead(prev => prev ? { ...prev, status: res.data.lead.status } : null)
    } catch {}
    finally { setUpdating(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this lead?')) return
    try { await crmApi.deleteLead(id); router.replace('/crm/leads') } catch {}
  }

  if (loading) return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="h-14 bg-white border-b border-slate-100 animate-pulse" />
      <div className="px-4 py-4 space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )
  if (!lead) return null

  const statusIdx = STATUSES.indexOf(lead.status as LeadStatus)

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="flex-1 font-bold text-slate-800 truncate">{lead.title}</h1>
        <button onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-slate-100">
          <Edit2 className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Status pipeline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pipeline Stage</p>
          <div className="flex gap-1">
            {STATUSES.map((s, i) => (
              <button key={s} onClick={() => moveStatus(s)} disabled={updating}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  s === lead.status ? STATUS_COLOR[s] : i < statusIdx ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'
                } ${updating ? 'opacity-50' : ''}`}>
                {s === 'NEGOTIATING' ? 'Nego.' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          {lead.value && (
            <div><p className="text-xs text-slate-400">Estimated Value</p>
              <p className="font-bold text-teal-700 text-lg">₹{lead.value.toLocaleString('en-IN')}</p></div>
          )}
          {lead.expectedCloseDate && (
            <div><p className="text-xs text-slate-400">Expected Close</p>
              <p className="text-sm font-medium text-slate-700">{new Date(lead.expectedCloseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
          )}
          {lead.description && (
            <div><p className="text-xs text-slate-400">Description</p><p className="text-sm text-slate-700">{lead.description}</p></div>
          )}
          {lead.notes && (
            <div><p className="text-xs text-slate-400">Notes</p><p className="text-sm text-slate-700">{lead.notes}</p></div>
          )}
        </div>

        {/* Linked contact */}
        {lead.contact && (
          <button onClick={() => router.push(`/crm/contacts/${lead.contact!.id}`)}
            className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.99] transition-all">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {lead.contact.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Contact</p>
              <p className="font-semibold text-slate-800">{lead.contact.name}</p>
              {lead.contact.company && <p className="text-xs text-slate-500">{lead.contact.company}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        )}

        {/* Linked work post */}
        {lead.workPost && (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3">
            <p className="text-xs text-slate-400 mb-0.5">From Work Post</p>
            <p className="text-sm font-medium text-slate-700">{lead.workPost.title}</p>
          </div>
        )}

        {/* Related orders */}
        {lead.orders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Orders ({lead.orders.length})</p>
            <div className="space-y-2">
              {lead.orders.map(o => (
                <button key={o.id} onClick={() => router.push(`/crm/orders/${o.id}`)}
                  className="w-full bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2 text-left">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{o.title}</p>
                    <p className="text-xs text-teal-700 font-bold">₹{o.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{o.status.replace('_',' ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related todos */}
        {lead.todos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks ({lead.todos.length})</p>
            <div className="space-y-2">
              {lead.todos.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${t.priority === 'HIGH' ? 'bg-red-400' : t.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-slate-300'}`} />
                  <p className={`text-sm flex-1 ${t.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <LeadForm initial={lead} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); fetch() }} />
      )}
    </div>
  )
}
