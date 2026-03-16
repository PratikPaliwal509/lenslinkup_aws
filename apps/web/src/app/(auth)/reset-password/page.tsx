'use client'

import { Suspense, useState } from 'react'
import { useSearchParams }    from 'next/navigation'
import { useRouter }          from 'next/navigation'
import Link                   from 'next/link'
import { useForm }            from 'react-hook-form'
import { zodResolver }        from '@hookform/resolvers/zod'
import { z }                  from 'zod'
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi }            from '@/lib/api'
import Logo                   from '@/components/ui/Logo'
import { Button }             from '@/components/ui/button'
import { Input }              from '@/components/ui/input'
import { Label }              from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const schema = z.object({
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

// Inner component — uses useSearchParams, must be inside <Suspense>
function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [done,        setDone]        = useState(false)
  const [apiError,    setApiError]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setApiError('')
    try {
      await authApi.resetPassword(token, data.password)
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          {done
            ? 'Password updated — redirecting to sign in…'
            : 'Choose a strong password for your account.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-5">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">Sign In Now</Button>
            </Link>
          </div>
        ) : !token ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-500 mb-4">
              No reset token found. Please use the link from your email.
            </p>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">Request New Link</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {apiError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{apiError}</p>
            )}

            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base" loading={isSubmitting}>
              Reset Password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

// Page — wraps inner in Suspense (required for useSearchParams in Next.js 15)
export default function ResetPasswordPage() {
  return (
    <>
      <div className="text-center mb-6">
        <Logo width={240} className="mx-auto" />
      </div>

      <Suspense fallback={
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-10 h-10 text-teal-600 mx-auto animate-spin" />
          </CardContent>
        </Card>
      }>
        <ResetPasswordInner />
      </Suspense>
    </>
  )
}
