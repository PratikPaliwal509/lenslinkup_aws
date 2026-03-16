'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { crmApi } from '@/lib/api'
import { Search, Plus, User, Building2, Phone } from 'lucide-react'
import ContactForm from '@/components/crm/ContactForm'

interface Contact {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  company?: string | null
  linkedUserId?: string | null
  linkedUser?: { profile?: { displayName: string; avatarUrl?: string | null } | null } | null
  _count: { leads: number; orders: number; todos: number }
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchContacts = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await crmApi.listContacts({ search: q, page: 1 })
      setContacts(res.data.contacts)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchContacts('') }, [fetchContacts])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchContacts(val), 400)
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3.5">
        <h1 className="text-lg font-bold text-slate-800 mb-3">Contacts</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
          />
        </div>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">{search ? 'No results' : 'No contacts yet'}</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-4">
              {search ? 'Try a different search' : 'Add clients, collaborators, and partners here'}
            </p>
            {!search && (
              <button onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium">
                + Add Contact
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <button key={c.id} onClick={() => router.push(`/crm/contacts/${c.id}`)}
                className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.99] transition-all">
                <div className="w-11 h-11 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-sm">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    {c.linkedUserId && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full font-medium flex-shrink-0">Platform</span>
                    )}
                  </div>
                  {c.company && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</p>}
                  {c.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">{c._count.leads}L · {c._count.orders}O</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-all hover:bg-teal-700">
        <Plus className="w-6 h-6" />
      </button>

      {showForm && (
        <ContactForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchContacts(search) }}
        />
      )}
    </div>
  )
}
