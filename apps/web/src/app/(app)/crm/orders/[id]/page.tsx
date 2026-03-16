'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { ArrowLeft, Edit2, Trash2, Plus, ChevronRight } from 'lucide-react'
import OrderForm from '@/components/crm/OrderForm'
import PaymentForm from '@/components/crm/PaymentForm'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-500', CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-orange-50 text-orange-700', COMPLETED: 'bg-green-50 text-green-700', CANCELLED: 'bg-red-50 text-red-500',
}
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other',
}

interface Order {
  id: string; title: string; description?: string | null; amount: number
  status: string; orderDate: string; deliveryDate?: string | null; notes?: string | null
  contact?: { id: string; name: string; company?: string | null } | null
  lead?: { id: string; title: string } | null
  payments: { id: string; amount: number; method: string; status: string; direction: string; paidAt?: string | null; dueDate?: string | null }[]
  todos: { id: string; title: string; status: string; priority: string }[]
  totalPaid: number; totalPending: number
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [addingPayment, setAddingPayment] = useState(false)

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.getOrder(id)
      setOrder(res.data.order)
    } catch { router.replace('/crm/orders') }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async () => {
    if (!confirm('Delete this order?')) return
    try { await crmApi.deleteOrder(id); router.replace('/crm/orders') } catch {}
  }

  if (loading) return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="h-14 bg-white border-b border-slate-100 animate-pulse" />
      <div className="px-4 py-4 space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )
  if (!order) return null

  const paidPct = order.amount > 0 ? Math.min(100, (order.totalPaid / order.amount) * 100) : 0

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="flex-1 font-bold text-slate-800 truncate">{order.title}</h1>
        <button onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-slate-100">
          <Edit2 className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLOR[order.status] ?? ''}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <p className="text-2xl font-bold text-slate-800">₹{order.amount.toLocaleString('en-IN')}</p>
          </div>
          {/* Payment progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>₹{order.totalPaid.toLocaleString('en-IN')} paid</span>
              <span>₹{order.totalPending.toLocaleString('en-IN')} pending</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
          {order.deliveryDate && (
            <p className="text-xs text-slate-400 mt-2">
              Deliver by: <span className="font-medium text-slate-600">{new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </p>
          )}
          {order.description && <p className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-50">{order.description}</p>}
          {order.notes && <p className="text-xs text-slate-400 mt-1 italic">{order.notes}</p>}
        </div>

        {/* Linked contact */}
        {order.contact && (
          <button onClick={() => router.push(`/crm/contacts/${order.contact!.id}`)}
            className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.99] transition-all">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {order.contact.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Client</p>
              <p className="font-semibold text-slate-800">{order.contact.name}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        )}

        {/* Payments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payments ({order.payments.length})</p>
            <button onClick={() => setAddingPayment(true)} className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {order.payments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="space-y-2">
              {order.payments.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${p.direction === 'RECEIVED' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {p.direction === 'RECEIVED' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400">{METHOD_LABEL[p.method]} · {p.status}</p>
                  </div>
                  {p.paidAt && <p className="text-xs text-slate-300">{new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Todos */}
        {order.todos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks</p>
            <div className="space-y-2">
              {order.todos.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${t.priority === 'HIGH' ? 'bg-red-400' : t.priority === 'MEDIUM' ? 'bg-orange-400' : 'bg-slate-300'}`} />
                  <p className={`text-sm ${t.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && <OrderForm initial={order} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); fetch() }} />}
      {addingPayment && <PaymentForm defaultOrderId={id} onClose={() => setAddingPayment(false)} onSaved={() => { setAddingPayment(false); fetch() }} />}
    </div>
  )
}
