'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    await authApi.forgotPassword(data.email).catch(() => {})
    setSubmitted(true)
  }

  return (
    <>
      <div className="text-center mb-6">
        <Logo width={240} className="mx-auto" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {submitted
              ? 'Check your email for reset instructions'
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-5">
                If an account exists for that email, you'll receive a password reset link shortly.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@yourstudio.in"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base" loading={isSubmitting}>
                Send Reset Link
              </Button>

              <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 transition-colors mt-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  )
}
