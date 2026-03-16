'use client'

import { useEffect, useState } from 'react'
import { Save, Users, Star, CheckCircle2, X, Plus, RefreshCw, IndianRupee } from 'lucide-react'
import { adminApi, type SubscriptionPlan } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Feature tag editor ────────────────────────────────────────────────────────

function FeatureList({
  features,
  onChange,
  disabled,
}: {
  features: string[]
  onChange: (f: string[]) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (trimmed && !features.includes(trimmed)) {
      onChange([...features, trimmed])
      setDraft('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {features.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-100"
          >
            <CheckCircle2 className="w-3 h-3" />
            {f}
            {!disabled && (
              <button
                onClick={() => onChange(features.filter((x) => x !== f))}
                className="ml-0.5 text-teal-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="Add feature… (press Enter)"
            className="flex-1 text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={add}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onChange,
  onSave,
  saving,
}: {
  plan: SubscriptionPlan
  onChange: (p: SubscriptionPlan) => void
  onSave: () => void
  saving: boolean
}) {
  const isFree = plan.key === 'free'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden',
      isFree ? 'border-slate-200' : 'border-orange-200',
    )}>
      {/* Plan header */}
      <div className={cn(
        'px-6 py-5 border-b',
        isFree ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100',
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isFree ? 'bg-slate-200' : 'bg-orange-500',
            )}>
              {isFree
                ? <Users className="w-5 h-5 text-slate-600" />
                : <Star  className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-500">
                {plan.userCount.toLocaleString('en-IN')} users on this plan
              </p>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-medium text-slate-600">Active</span>
            <button
              role="switch"
              aria-checked={plan.isActive}
              onClick={() => onChange({ ...plan, isActive: !plan.isActive })}
              className={cn(
                'relative w-10 h-5.5 rounded-full transition-colors',
                plan.isActive ? 'bg-teal-500' : 'bg-slate-300',
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform',
                plan.isActive ? 'translate-x-5' : 'translate-x-0.5',
              )} />
            </button>
          </label>
        </div>
      </div>

      {/* Fields */}
      <div className="px-6 py-5 space-y-5">
        {/* Pricing (only editable for premium) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Monthly Price (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="number"
                min={0}
                value={plan.priceMonthly}
                disabled={isFree}
                onChange={(e) => onChange({ ...plan, priceMonthly: Number(e.target.value) })}
                className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Yearly Price (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="number"
                min={0}
                value={plan.priceYearly}
                disabled={isFree}
                onChange={(e) => onChange({ ...plan, priceYearly: Number(e.target.value) })}
                className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Razorpay Plan IDs (only for premium) */}
        {!isFree && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Razorpay Monthly Plan ID
              </label>
              <input
                type="text"
                value={plan.razorpayMonthlyPlanId ?? ''}
                onChange={(e) => onChange({ ...plan, razorpayMonthlyPlanId: e.target.value })}
                placeholder="plan_XXXXXXXXXXXXXXXX"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Razorpay Yearly Plan ID
              </label>
              <input
                type="text"
                value={plan.razorpayYearlyPlanId ?? ''}
                onChange={(e) => onChange({ ...plan, razorpayYearlyPlanId: e.target.value })}
                placeholder="plan_XXXXXXXXXXXXXXXX"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}

        {/* Features */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">Features</label>
          <FeatureList
            features={plan.features}
            onChange={(f) => onChange({ ...plan, features: f })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
        <Button onClick={onSave} loading={saving} size="sm">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save Plan
        </Button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    key:      'free',
    name:     'Free',
    isActive: true,
    priceMonthly: 0,
    priceYearly:  0,
    userCount: 0,
    features: [
      '2 open work posts',
      '10 bids per month',
      'Basic profile',
      'Discover & connect',
    ],
  },
  {
    key:      'premium',
    name:     'Premium',
    isActive: true,
    priceMonthly: 499,
    priceYearly:  4799,
    userCount: 0,
    razorpayMonthlyPlanId: '',
    razorpayYearlyPlanId:  '',
    features: [
      'Unlimited open work posts',
      'Unlimited bids',
      'Verified badge',
      'Featured in Discover',
      'Priority support',
      'Advanced analytics',
    ],
  },
]

export default function AdminSubscriptionsPage() {
  const [plans,  setPlans]  = useState<SubscriptionPlan[]>(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})
  const [saved,   setSaved]   = useState<Record<string, boolean>>({})
  const [error,   setError]   = useState('')

  useEffect(() => {
    adminApi.getSubscriptionPlans()
      .then((res) => setPlans(res.data.plans))
      .catch(() => {
        // API not yet implemented — use defaults
        setPlans(DEFAULT_PLANS)
      })
      .finally(() => setLoading(false))
  }, [])

  function updatePlan(key: string, updated: SubscriptionPlan) {
    setPlans((prev) => prev.map((p) => (p.key === key ? updated : p)))
  }

  async function savePlan(key: string) {
    const plan = plans.find((p) => p.key === key)
    if (!plan) return
    setSaving((s) => ({ ...s, [key]: true }))
    setSaved((s)  => ({ ...s, [key]: false }))
    try {
      await adminApi.putSubscriptionPlan(key, plan)
      setSaved((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 3000)
    } catch {
      setError('Failed to save plan. API endpoint not yet connected.')
      setTimeout(() => setError(''), 4000)
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Subscription Plans</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage plan pricing, features, and Razorpay plan IDs
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 py-12">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading plans…
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              onChange={(updated) => updatePlan(plan.key, updated)}
              onSave={() => savePlan(plan.key)}
              saving={saving[plan.key] ?? false}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4">
        <p className="text-sm text-blue-700 font-semibold mb-1">📌 How Razorpay Plans Work</p>
        <ol className="text-xs text-blue-600 leading-relaxed space-y-1 list-decimal list-inside">
          <li>Create subscription plans in the Razorpay dashboard</li>
          <li>Copy the Plan ID (e.g. <code className="font-mono bg-blue-100 px-1 rounded">plan_XXXX</code>) and paste it above</li>
          <li>When a user upgrades, the backend uses these Plan IDs to create a Razorpay subscription</li>
          <li>Webhooks update the user's <code className="font-mono bg-blue-100 px-1 rounded">isPremium</code> flag automatically</li>
        </ol>
      </div>
    </div>
  )
}
