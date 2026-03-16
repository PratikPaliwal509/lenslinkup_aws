'use client'

import { useEffect, useState, useCallback } from 'react'
import { crmApi } from '@/lib/api'
import { IndianRupee, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import PaymentForm from '@/components/crm/PaymentForm'

type Direction = 'ALL' | 'RECEIVED' | 'SENT'
type PmtStatus = 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'

interface Payment {
  id: string; amount: number; method: string; status: string; direction: string
  description?: string | null; reference?: string | null; paidAt?: string | null; dueDate?: string | null
  order?: { id: string; title: string } | null
  contact?: { id: string; name: string } | null
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700', PAID: 'bg-green-50 text-green-700',
  OVERDUE: 'bg-red-50 text-red-600', CANCELLED: 'bg-slate-100 text-slate-500',
}
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank', CHEQUE: 'Cheque', OTHER: 'Other',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState<Direction>('ALL')
  const [pmtStatus, setPmtStatus] = useState<PmtStatus>('ALL')
  const [summary, setSummary] = useState({ totalReceived: 0, totalPending: 0 })
  const [showForm, setShowForm] = useState(false)

  const fetchPayments = useCallback(async (dir: Direction, st: PmtStatus) => {
    setLoading(true)
    try {
      const res = await crmApi.listPayments({
        direction: dir === 'ALL' ? undefined : dir,
        status: st === 'ALL' ? undefined : st,
      })
      setPayments(res.data.payments)
      setSummary(res.data.summary)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPayments(direction, pmtStatus) }, [fetchPayments, direction, pmtStatus])

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 pt-3.5 pb-0">
        <h1 className="text-lg font-bold text-slate-800 mb-3">Payments</h1>
        {/* Direction tabs */}
        <div className="flex gap-2 mb-2">
          {(['ALL', 'RECEIVED', 'SENT'] as Direction[]).map(d => (
            <button key={d} onClick={() => setDirection(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                direction === d ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
              {d === 'ALL' ? 'All' : d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {(['ALL', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] as PmtStatus[]).map(s => (
            <button key={s} onClick={() => setPmtStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                pmtStatus === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
              {s === 'ALL' ? 'Any' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Summary banner */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-3">
          <p className="text-xs text-green-600 font-medium flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Received</p>
          <p className="text-lg font-bold text-green-700 mt-0.5">₹{summary.totalReceived.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-3">
          <p className="text-xs text-orange-600 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Pending</p>
          <p className="text-lg font-bold text-orange-700 mt-0.5">₹{summary.totalPending.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-20" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <IndianRupee className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No payments yet</h3>
            <p className="text-sm text-slate-400 mb-4">Record cash, UPI, bank transfers and more</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium">+ Add Payment</button>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 font-bold ${
                  p.direction === 'RECEIVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  {p.direction === 'RECEIVED' ? '↓' : '↑'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[p.status] ?? ''}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {METHOD_LABEL[p.method]}
                    {p.contact && ` · ${p.contact.name}`}
                    {p.order && ` · ${p.order.title}`}
                  </p>
                  {p.description && <p className="text-xs text-slate-400 truncate">{p.description}</p>}
                  {p.dueDate && p.status !== 'PAID' && (
                    <p className={`text-xs mt-0.5 ${new Date(p.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      Due: {new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-all hover:bg-teal-700">
        <Plus className="w-6 h-6" />
      </button>

      {showForm && <PaymentForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchPayments(direction, pmtStatus) }} />}
    </div>
  )
}
