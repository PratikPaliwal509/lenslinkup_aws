'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Check, ArrowLeft, Loader2, Zap, Star, Shield, TrendingUp } from 'lucide-react'
import { subscriptionApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLANS = [
  {
    key:        'MONTHLY' as const,
    label:      'Monthly',
    price:      '₹299',
    period:     '/month',
    subtext:    'Billed monthly',
    savings:    null,
    highlight:  false,
  },
  {
    key:        'YEARLY' as const,
    label:      'Yearly',
    price:      '₹2,499',
    period:     '/year',
    subtext:    '₹208/month',
    savings:    'Save 30%',
    highlight:  true,
  },
]

const FEATURES = [
  { icon: Zap,        text: 'Unlimited work post bids' },
  { icon: TrendingUp, text: 'Featured in Discover search' },
  { icon: Star,       text: 'Premium badge on your profile' },
  { icon: Crown,      text: 'Post up to 20 open jobs (vs 3 free)' },
  { icon: Shield,     text: 'Priority support' },
  { icon: Check,      text: 'Early access to new features' },
]

export default function PremiumPage() {
  const router              = useRouter()
  const user                = useAuthStore((s) => s.user)
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('YEARLY')
  const [loading, setLoading]           = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [isPremium, setIsPremium]       = useState(false)
  const [expiresAt, setExpiresAt]       = useState<string | null>(null)
  const [error, setError]               = useState('')

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) return
    const script = document.createElement('script')
    script.id  = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  }, [])

  // Check current premium status
  useEffect(() => {
    subscriptionApi.status()
      .then(({ data }) => {
        setIsPremium(data.isPremium)
        if (data.subscription?.expiresAt) setExpiresAt(data.subscription.expiresAt)
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false))
  }, [])

  async function handleUpgrade() {
    setError('')
    setLoading(true)
    try {
      const { data: order } = await subscriptionApi.createOrder(selectedPlan)

      const options = {
        key:          order.keyId,
        amount:       order.amount,
        currency:     order.currency,
        name:         'LensLinkUp',
        description:  `${order.plan} Premium Plan`,
        order_id:     order.orderId,
        prefill: {
          name:  user?.profile?.displayName ?? '',
          email: user?.email ?? '',
        },
        theme: { color: '#0D9488' },
        handler: async (response: any) => {
          try {
            await subscriptionApi.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setIsPremium(true)
            setLoading(false)
          } catch {
            setError('Payment verification failed. Contact support if amount was deducted.')
            setLoading(false)
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Something went wrong'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (!statusLoading && isPremium) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="font-semibold text-slate-800">Premium</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">You're Premium! 🎉</h2>
          <p className="text-slate-500 mb-1">All premium features are unlocked.</p>
          {expiresAt && (
            <p className="text-xs text-slate-400 mb-6">
              Active until {new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <button
            onClick={() => router.push('/home')}
            className="bg-teal-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-teal-700 active:scale-95 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Upgrade page ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-semibold text-slate-800">Upgrade to Premium</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Hero */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-8 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Crown className="w-7 h-7 text-orange-300" />
          </div>
          <h2 className="text-xl font-bold mb-1">LensLinkUp Premium</h2>
          <p className="text-teal-100 text-sm">Grow your photography business faster</p>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Features */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What you get</p>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <span className="text-sm text-slate-700">{text}</span>
              </div>
            ))}
          </div>

          {/* Plan selector */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Choose a plan</p>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                    selectedPlan === plan.key
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {plan.savings && (
                    <span className="absolute -top-2.5 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {plan.savings}
                    </span>
                  )}
                  <p className={`text-xs font-semibold mb-1 ${selectedPlan === plan.key ? 'text-teal-700' : 'text-slate-500'}`}>
                    {plan.label}
                  </p>
                  <p className={`text-xl font-bold ${selectedPlan === plan.key ? 'text-teal-800' : 'text-slate-800'}`}>
                    {plan.price}
                    <span className="text-xs font-normal text-slate-400">{plan.period}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{plan.subtext}</p>
                  {selectedPlan === plan.key && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Secure payment via Razorpay · Cancel anytime · No hidden charges
          </p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <button
          onClick={handleUpgrade}
          disabled={loading || statusLoading}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-4 rounded-2xl font-bold text-base
                     flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20
                     hover:from-teal-700 hover:to-teal-800 active:scale-[0.98] transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
          ) : (
            <><Crown className="w-5 h-5 text-orange-300" /> Upgrade to Premium</>
          )}
        </button>
      </div>
    </div>
  )
}
