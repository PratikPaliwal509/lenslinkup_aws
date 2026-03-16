'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import Logo from '@/components/ui/Logo'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email:       z.string().trim().toLowerCase().email('Enter a valid email'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  confirm:     z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router   = useRouter()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [showPw, setShowPw]    = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setApiError('')
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      })
      setAuth(res.data.accessToken, res.data.refreshToken ?? '', res.data.user)
      router.replace('/home')
    } catch (err: any) {
      setApiError(err.response?.data?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      {/* Logo */}
      <div className="text-center mb-6">
        <Logo width={240} className="mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Photography Business Network</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Join India's photography business community</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Display Name */}
            <div>
              <Label htmlFor="displayName">Business / Full Name</Label>
              <Input
                id="displayName"
                placeholder="Radiant Studios or Arjun Mehta"
                error={errors.displayName?.message}
                {...register('displayName')}
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@yourstudio.in"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat password"
                autoComplete="new-password"
                error={errors.confirm?.message}
                {...register('confirm')}
              />
            </div>

            {/* API Error */}
            {apiError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              loading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-teal-600 hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            By registering you agree to our{' '}
            <span className="text-teal-600 cursor-pointer hover:underline">Terms</span>
            {' & '}
            <span className="text-teal-600 cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
