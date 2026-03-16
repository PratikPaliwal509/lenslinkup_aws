'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, Check, CheckCheck, Loader2 } from 'lucide-react'
import { notificationsApi, type AppNotification } from '@/lib/notificationsApi'
import { cn } from '@/lib/utils'

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  AppNotification['type'],
  { emoji: string; href: (relatedId: string | null) => string }
> = {
  CONNECTION_REQUEST:  { emoji: '🤝', href: () => '/connections?tab=requests' },
  CONNECTION_ACCEPTED: { emoji: '✅', href: () => '/connections' },
  BID_RECEIVED:        { emoji: '📬', href: (id) => id ? `/posts/${id}` : '/posts' },
  BID_ACCEPTED:        { emoji: '🎉', href: (id) => id ? `/posts/${id}` : '/posts' },
  BID_REJECTED:        { emoji: '📋', href: (id) => id ? `/posts/${id}` : '/posts' },
}

// ── Notification item ─────────────────────────────────────────────────────────

function NotifItem({
  notif,
  onRead,
}: {
  notif: AppNotification
  onRead: (id: string) => void
}) {
  const router = useRouter()
  const cfg    = TYPE_CONFIG[notif.type]

  function handleClick() {
    if (!notif.isRead) onRead(notif.id)
    router.push(cfg.href(notif.relatedId))
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50',
        !notif.isRead && 'bg-teal-50/50',
      )}
    >
      {/* Type emoji */}
      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-lg shrink-0 mt-0.5">
        {cfg.emoji}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', notif.isRead ? 'text-slate-600' : 'font-semibold text-slate-900')}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-300 mt-1">
          {new Date(notif.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
      )}
    </button>
  )
}

// ── Bell button + drawer ──────────────────────────────────────────────────────

export function NotificationBell() {
  const [open,          setOpen]          = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [hasMore,       setHasMore]       = useState(false)
  const [page,          setPage]          = useState(1)
  const drawerRef = useRef<HTMLDivElement>(null)

  // ── Fetch unread count on mount + every 60s ────────────────────────────────
  useEffect(() => {
    function fetchCount() {
      notificationsApi.unreadCount()
        .then((res) => setUnread(res.data.count))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // ── Load notifications when drawer opens ──────────────────────────────────
  const loadNotifications = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await notificationsApi.list(p, 15)
      if (p === 1) {
        setNotifications(res.data.notifications)
      } else {
        setNotifications((prev) => [...prev, ...res.data.notifications])
      }
      setHasMore(res.data.pagination.hasMore)
      setPage(p)
    } catch {}
    finally { setLoading(false) }
  }, [])

  function handleToggle() {
    if (!open) loadNotifications(1)
    setOpen((v) => !v)
  }

  // ── Mark single read ──────────────────────────────────────────────────────
  async function handleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n),
    )
    setUnread((c) => Math.max(0, c - 1))
    await notificationsApi.markRead(id).catch(() => {})
  }

  // ── Mark all read ─────────────────────────────────────────────────────────
  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    await notificationsApi.markAllRead().catch(() => {})
  }

  return (
    <div className="relative" ref={drawerRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline px-2 py-1 rounded-lg hover:bg-teal-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((n) => (
                  <NotifItem key={n.id} notif={n} onRead={handleRead} />
                ))}
                {hasMore && (
                  <button
                    onClick={() => loadNotifications(page + 1)}
                    disabled={loading}
                    className="w-full py-3 text-xs text-teal-600 font-semibold hover:bg-teal-50 transition-colors disabled:opacity-40"
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
