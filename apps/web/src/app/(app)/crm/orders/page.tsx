'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { ShoppingBag, Plus } from 'lucide-react'
import OrderForm from '@/components/crm/OrderForm'

type OrderStatus = 'ALL' | 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface Order {
  id: string; title: string; amount: number; status: string
  deliveryDate?: string | null
  contact?: { id: string; name: string; company?: string | null } | null
  createdAt: string
}

const STATUS_TABS: OrderStatus[] = ['ALL', 'DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-500', CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-orange-50 text-orange-700', COMPLETED: 'bg-green-50 text-green-700', CANCELLED: 'bg-red-50 text-red-500',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<OrderStatus>('ALL')
  const [showForm, setShowForm] = useState(false)

  const fetchOrders = useCallback(async (s: OrderStatus) => {
    setLoading(true)
    try {
      const res = await crmApi.listOrders({ status: s === 'ALL' ? undefined : s })
      setOrders(res.data.orders)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOrders(status) }, [fetchOrders, status])

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 pt-3.5 pb-0">
        <h1 className="text-lg font-bold text-slate-800 mb-3">Orders</h1>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                status === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-24" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No orders yet</h3>
            <p className="text-sm text-slate-400 mb-4">Track your photography jobs and deliveries</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium">+ Add Order</button>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(o => (
              <button key={o.id} onClick={() => router.push(`/crm/orders/${o.id}`)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-sm active:scale-[0.99] transition-all">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-slate-800 flex-1 truncate">{o.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLOR[o.status] ?? ''}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-base font-bold text-teal-700">₹{o.amount.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between mt-1">
                  {o.contact && <p className="text-xs text-slate-500 truncate">{o.contact.name}</p>}
                  {o.deliveryDate && (
                    <p className="text-xs text-slate-400 flex-shrink-0 ml-auto">
                      Deliver: {new Date(o.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-all hover:bg-teal-700">
        <Plus className="w-6 h-6" />
      </button>

      {showForm && <OrderForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchOrders(status) }} />}
    </div>
  )
}
