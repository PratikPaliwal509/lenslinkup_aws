'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Loader2, UserX, Clock, Check, X, MapPin, CheckCircle2, Star } from 'lucide-react'
import { connectionsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MiniProfile {
  displayName: string
  title?:      string | null
  avatarUrl?:  string | null
  city?:       string | null
  area?:       string | null
  isVerified:  boolean
  isPremium:   boolean
  categories:  { name: string; emoji: string; slug: string }[]
}

interface ConnectionItem {
  connectionId: string
  connectedAt?: string
  requestedAt?: string
  user: { id: string; profile: MiniProfile | null }
}

type Tab = 'connections' | 'pending' | 'sent'

// ── Avatar component ──────────────────────────────────────────────────────────

function Avatar({ profile, size = 'md' }: { profile: MiniProfile | null; size?: 'sm' | 'md' }) {
  const dim   = size === 'sm' ? 'w-10 h-10 rounded-xl text-base' : 'w-12 h-12 rounded-xl text-lg'
  const badge = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className="relative shrink-0">
      <div className={`${dim} bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center font-bold text-slate-400`}>
        {profile?.avatarUrl
          ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          : profile?.displayName[0]?.toUpperCase()
        }
      </div>
      {profile?.isVerified && (
        <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-0.5 border border-white">
          <CheckCircle2 className={`${badge} text-white`} />
        </div>
      )}
    </div>
  )
}

// ── Connection card ────────────────────────────────────────────────────────────

function ConnectionCard({
  item,
  onRemove,
}: {
  item: ConnectionItem
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const p = item.user.profile
  const location = [p?.area, p?.city].filter(Boolean).join(', ')

  async function handleRemove() {
    setRemoving(true)
    try {
      await connectionsApi.remove(item.connectionId)
      onRemove(item.connectionId)
    } catch {} finally { setRemoving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${item.user.id}`}>
          <Avatar profile={p} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${item.user.id}`} className="hover:underline">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{p?.displayName}</span>
              {p?.isPremium && (
                <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-orange-200">
                  <Star className="w-2.5 h-2.5" />PRO
                </span>
              )}
            </div>
          </Link>
          {p?.title && <p className="text-xs text-slate-500 mt-0.5 truncate">{p.title}</p>}
          {location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
              <span className="text-xs text-slate-400 truncate">{location}</span>
            </div>
          )}
          {(p?.categories ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {p!.categories.slice(0, 2).map((c) => (
                <span key={c.slug} className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">
                  {c.emoji} {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Remove connection"
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Pending request card ───────────────────────────────────────────────────────

function PendingCard({
  item,
  onAccept,
  onReject,
}: {
  item: ConnectionItem
  onAccept: (id: string) => void
  onReject: (id: string) => void
}) {
  const [working, setWorking] = useState(false)
  const p = item.user.profile

  async function accept() {
    setWorking(true)
    try { await connectionsApi.accept(item.connectionId); onAccept(item.connectionId) }
    catch {} finally { setWorking(false) }
  }

  async function reject() {
    setWorking(true)
    try { await connectionsApi.reject(item.connectionId); onReject(item.connectionId) }
    catch {} finally { setWorking(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${item.user.id}`}>
          <Avatar profile={p} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${item.user.id}`} className="hover:underline">
            <span className="font-semibold text-slate-900 text-sm">{p?.displayName}</span>
          </Link>
          {p?.title && <p className="text-xs text-slate-500 mt-0.5 truncate">{p.title}</p>}
          {p?.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-teal-500" />
              <span className="text-xs text-slate-400">{p.city}</span>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button className="h-8 px-3 text-xs flex-1" loading={working} onClick={accept}>
              <Check className="w-3.5 h-3.5 mr-1" /> Accept
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 text-xs text-red-500 border-red-200 hover:bg-red-50"
              loading={working}
              onClick={reject}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sent request card ─────────────────────────────────────────────────────────

function SentCard({ item, onWithdraw }: { item: ConnectionItem; onWithdraw: (id: string) => void }) {
  const [working, setWorking] = useState(false)
  const p = item.user.profile

  async function withdraw() {
    setWorking(true)
    try { await connectionsApi.remove(item.connectionId); onWithdraw(item.connectionId) }
    catch {} finally { setWorking(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <Link href={`/profile/${item.user.id}`}>
        <Avatar profile={p} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${item.user.id}`} className="hover:underline">
          <span className="font-semibold text-slate-900 text-sm">{p?.displayName}</span>
        </Link>
        {p?.city && <p className="text-xs text-slate-400 mt-0.5">{p.city}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pending
        </span>
        <button
          onClick={withdraw}
          disabled={working}
          className="text-xs text-red-400 hover:underline"
        >
          {working ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Withdraw'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [activeTab,   setActiveTab]   = useState<Tab>('connections')
  const [connections, setConnections] = useState<ConnectionItem[]>([])
  const [pending,     setPending]     = useState<ConnectionItem[]>([])
  const [sent,        setSent]        = useState<ConnectionItem[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [connRes, pendRes, sentRes] = await Promise.all([
        connectionsApi.list(),
        connectionsApi.pending(),
        connectionsApi.sent(),
      ])
      setConnections(connRes.data.connections)
      setPending(pendRes.data.requests)
      setSent(sentRes.data.sent)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'connections', label: 'Connected',  count: connections.length },
    { key: 'pending',     label: 'Requests',   count: pending.length     },
    { key: 'sent',        label: 'Sent',        count: sent.length        },
  ]

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100">
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-bold text-slate-900 text-lg">My Network</h1>
          <p className="text-xs text-slate-400">Connect with photography professionals</p>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 pb-0">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 text-xs font-semibold py-2.5 border-b-2 transition-colors',
                activeTab === key
                  ? 'text-teal-600 border-teal-600'
                  : 'text-slate-400 border-transparent hover:text-slate-600',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  activeTab === key
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-500',
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Connected tab */}
            {activeTab === 'connections' && (
              connections.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-8 h-8 text-teal-400" />}
                  title="No connections yet"
                  desc="Browse professionals on Discover and send connection requests."
                  cta={{ href: '/discover', label: 'Browse Discover' }}
                />
              ) : (
                <div className="space-y-3">
                  {connections.map((item) => (
                    <ConnectionCard
                      key={item.connectionId}
                      item={item}
                      onRemove={(id) => setConnections((prev) => prev.filter((c) => c.connectionId !== id))}
                    />
                  ))}
                </div>
              )
            )}

            {/* Pending tab */}
            {activeTab === 'pending' && (
              pending.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-8 h-8 text-slate-400" />}
                  title="No pending requests"
                  desc="When someone sends you a connection request, it will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {pending.map((item) => (
                    <PendingCard
                      key={item.connectionId}
                      item={item}
                      onAccept={(id) => {
                        const accepted = pending.find((p) => p.connectionId === id)!
                        setPending((prev) => prev.filter((p) => p.connectionId !== id))
                        setConnections((prev) => [{ ...accepted, connectedAt: new Date().toISOString() }, ...prev])
                      }}
                      onReject={(id) => setPending((prev) => prev.filter((p) => p.connectionId !== id))}
                    />
                  ))}
                </div>
              )
            )}

            {/* Sent tab */}
            {activeTab === 'sent' && (
              sent.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-8 h-8 text-slate-400" />}
                  title="No sent requests"
                  desc="Connection requests you send will appear here until accepted."
                />
              ) : (
                <div className="space-y-3">
                  {sent.map((item) => (
                    <SentCard
                      key={item.connectionId}
                      item={item}
                      onWithdraw={(id) => setSent((prev) => prev.filter((s) => s.connectionId !== id))}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Reusable empty state ──────────────────────────────────────────────────────

function EmptyState({
  icon, title, desc, cta,
}: {
  icon:  React.ReactNode
  title: string
  desc:  string
  cta?:  { href: string; label: string }
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">{desc}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
