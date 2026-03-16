'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { TrendingUp, Plus, IndianRupee } from 'lucide-react'
import LeadForm from '@/components/crm/LeadForm'

type LeadStatus = 'ALL' | 'NEW' | 'CONTACTED' | 'NEGOTIATING' | 'WON' | 'LOST'

interface Lead {
  id: string; title: string; status: string; value?: number | null
  contact?: { id: string; name: string; company?: string | null } | null
  createdAt: string; updatedAt: string
}

const STATUS_TABS: LeadStatus[] = ['ALL', 'NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST']
const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700', CONTACTED: 'bg-yellow-50 text-yellow-700',
  NEGOTIATING: 'bg-orange-50 text-orange-700', WON: 'bg-green-50 text-green-700', LOST: 'bg-slate-100 text-slate-500',
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeadStatus>('ALL')
  const [showForm, setShowForm] = useState(false)

  const fetchLeads = useCallback(async (s: LeadStatus) => {
    setLoading(true)
    try {
      const res = await crmApi.listLeads({ status: s === 'ALL' ? undefined : s })
      setLeads(res.data.leads)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchLeads(status) }, [fetchLeads, status])

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 pt-3.5 pb-0">
        <h1 className="text-lg font-bold text-slate-800 mb-3">Leads</h1>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                status === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-24" />)}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No leads yet</h3>
            <p className="text-sm text-slate-400 mb-4">Leads are auto-created when someone bids on your work posts, or add them manually</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium">+ Add Lead</button>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map(l => (
              <button key={l.id} onClick={() => router.push(`/crm/leads/${l.id}`)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-sm active:scale-[0.99] transition-all">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-slate-800 flex-1 truncate">{l.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLOR[l.status] ?? ''}`}>
                    {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {l.contact && <p className="text-xs text-slate-500 truncate">{l.contact.name}{l.contact.company ? ` · ${l.contact.company}` : ''}</p>}
                  {l.value && (
                    <p className="text-xs font-semibold text-teal-700 flex items-center gap-0.5 ml-auto flex-shrink-0">
                      <IndianRupee className="w-3 h-3" />{l.value.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1">{new Date(l.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-all hover:bg-teal-700">
        <Plus className="w-6 h-6" />
      </button>

      {showForm && (
        <LeadForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchLeads(status) }} />
      )}
    </div>
  )
}
