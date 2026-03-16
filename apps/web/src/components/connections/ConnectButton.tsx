'use client'

import { useEffect, useState } from 'react'
import { UserPlus, UserCheck, UserX, Loader2, Clock } from 'lucide-react'
import { connectionsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'

type ConnStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'loading'

interface Props {
  targetUserId: string
  className?:   string
}

export function ConnectButton({ targetUserId, className }: Props) {
  const [status,       setStatus]       = useState<ConnStatus>('loading')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [isSender,     setIsSender]     = useState(false)
  const [working,      setWorking]      = useState(false)

  useEffect(() => {
    connectionsApi.statusWith(targetUserId)
      .then((r) => {
        setStatus(r.data.status)
        setConnectionId(r.data.connectionId)
        setIsSender(r.data.isSender ?? false)
      })
      .catch(() => setStatus('NONE'))
  }, [targetUserId])

  async function handleConnect() {
    setWorking(true)
    try {
      const res = await connectionsApi.send(targetUserId)
      setConnectionId(res.data.connection.id)
      setStatus('PENDING')
      setIsSender(true)
    } catch { /* already sent / conflict */ }
    finally { setWorking(false) }
  }

  async function handleWithdraw() {
    if (!connectionId) return
    setWorking(true)
    try {
      await connectionsApi.remove(connectionId)
      setStatus('NONE')
      setConnectionId(null)
    } catch {}
    finally { setWorking(false) }
  }

  async function handleAccept() {
    if (!connectionId) return
    setWorking(true)
    try {
      await connectionsApi.accept(connectionId)
      setStatus('ACCEPTED')
    } catch {}
    finally { setWorking(false) }
  }

  async function handleReject() {
    if (!connectionId) return
    setWorking(true)
    try {
      await connectionsApi.reject(connectionId)
      setStatus('REJECTED')
      setConnectionId(null)
    } catch {}
    finally { setWorking(false) }
  }

  if (status === 'loading') {
    return (
      <Button variant="outline" className={`h-9 px-4 text-sm ${className ?? ''}`} disabled>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </Button>
    )
  }

  if (status === 'ACCEPTED') {
    return (
      <Button
        variant="outline"
        className={`h-9 px-4 text-sm text-teal-600 border-teal-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors ${className ?? ''}`}
        loading={working}
        onClick={handleWithdraw}
      >
        <UserCheck className="w-4 h-4 mr-1.5" />
        Connected
      </Button>
    )
  }

  if (status === 'PENDING' && isSender) {
    return (
      <Button
        variant="outline"
        className={`h-9 px-4 text-sm text-slate-500 ${className ?? ''}`}
        loading={working}
        onClick={handleWithdraw}
      >
        <Clock className="w-4 h-4 mr-1.5" />
        Requested
      </Button>
    )
  }

  if (status === 'PENDING' && !isSender) {
    // Receiver sees accept/reject inline
    return (
      <div className={`flex gap-2 ${className ?? ''}`}>
        <Button className="h-9 px-3 text-sm" loading={working} onClick={handleAccept}>
          Accept
        </Button>
        <Button variant="outline" className="h-9 px-3 text-sm text-red-500 border-red-200 hover:bg-red-50" loading={working} onClick={handleReject}>
          <UserX className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  // NONE or REJECTED → show Connect
  return (
    <Button
      className={`h-9 px-4 text-sm ${className ?? ''}`}
      loading={working}
      onClick={handleConnect}
    >
      <UserPlus className="w-4 h-4 mr-1.5" />
      Connect
    </Button>
  )
}
