'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams }               from 'next/navigation'
import Link                              from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { authApi }                       from '@/lib/api'
import Logo                              from '@/components/ui/Logo'
import { Button }                        from '@/components/ui/button'
import { Card, CardContent }             from '@/components/ui/card'

type State = 'loading' | 'success' | 'error'

// Inner component that uses useSearchParams — must be inside <Suspense>
function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!token) { setState('error'); return }
    authApi.verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'))
  }, [token])

  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-teal-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 text-sm">Verifying your email…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 text-teal-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email verified!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your account is now active. Start connecting with photographers and studios.
            </p>
            <Link href="/home">
              <Button className="w-full h-11">Go to Home</Button>
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Link invalid or expired</h2>
            <p className="text-slate-500 text-sm mb-6">
              This verification link has expired or already been used.
              Please sign in to request a new one.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">Back to Sign In</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Fallback shown during Suspense
function VerifyEmailFallback() {
  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center">
        <Loader2 className="w-12 h-12 text-teal-600 mx-auto mb-4 animate-spin" />
        <p className="text-slate-600 text-sm">Loading…</p>
      </CardContent>
    </Card>
  )
}

// Page component — wraps inner in Suspense (required for useSearchParams in Next.js 15)
export default function VerifyEmailPage() {
  return (
    <>
      <div className="text-center mb-6">
        <Logo width={240} className="mx-auto" />
      </div>

      <Suspense fallback={<VerifyEmailFallback />}>
        <VerifyEmailInner />
      </Suspense>
    </>
  )
}
