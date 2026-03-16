'use client'

import { useEffect, useState } from 'react'
import {
  Save, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle,
  Zap, Webhook, CreditCard, TestTube2, ShieldCheck,
} from 'lucide-react'
import { adminApi, type PaymentGatewayConfig } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Masked input ──────────────────────────────────────────────────────────────

function SecretField({
  label,
  description,
  value,
  onChange,
  placeholder,
  mono = true,
}: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  const [show, setShow] = useState(false)

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <p className="text-xs text-slate-400 mb-2">{description}</p>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pr-10 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500',
            mono && 'font-mono',
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = 'teal',
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  children: React.ReactNode
  accent?: 'teal' | 'orange' | 'purple'
}) {
  const colors = {
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-600',   border: 'border-teal-100'   },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-500', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', border: 'border-purple-100' },
  }
  const c = colors[accent]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={cn('px-6 py-4 border-b flex items-center gap-3', c.bg, c.border)}>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.icon)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULTS: PaymentGatewayConfig = {
  mode:            'test',
  razorpayKeyId:   '',
  razorpaySecret:  '',
  webhookSecret:   '',
  webhookUrl:      '',
  autoActivatePremium: true,
}

export default function PaymentGatewayPage() {
  const [config,  setConfig]  = useState<PaymentGatewayConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    adminApi.getPaymentGatewayConfig()
      .then((res) => setConfig(res.data.config))
      .catch(() => setConfig(DEFAULTS))
      .finally(() => setLoading(false))
  }, [])

  function update(patch: Partial<PaymentGatewayConfig>) {
    setConfig((c) => ({ ...c, ...patch }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await adminApi.putPaymentGatewayConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. API endpoint not yet connected.')
      setTimeout(() => setError(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      await adminApi.testPaymentGateway()
      setTestResult('ok')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
      setTimeout(() => setTestResult(null), 5000)
    }
  }

  const webhookDisplayUrl = config.webhookUrl || 'https://your-api.railway.app/api/webhooks/razorpay'

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Gateway</h1>
          <p className="text-slate-500 text-sm mt-1">
            Razorpay configuration for subscription payments
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saved ? '✓ Saved!' : 'Save Config'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 py-12">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading configuration…
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Mode toggle ── */}
          <Section icon={TestTube2} title="Environment Mode" subtitle="Switch between Razorpay test and live environment">
            <div className="flex rounded-xl overflow-hidden border border-slate-200 w-fit">
              {(['test', 'live'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => update({ mode })}
                  className={cn(
                    'px-6 py-2.5 text-sm font-semibold transition-colors',
                    config.mode === mode
                      ? mode === 'test'
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-600 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {mode === 'test' ? '🧪 Test Mode' : '🟢 Live Mode'}
                </button>
              ))}
            </div>
            {config.mode === 'live' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Live mode active.</strong> Real money will be charged. Ensure your Razorpay account is activated and the keys below are production keys.
                </span>
              </div>
            )}
          </Section>

          {/* ── API Keys ── */}
          <Section icon={CreditCard} title="Razorpay API Keys" subtitle="From Razorpay Dashboard → Settings → API Keys">
            <SecretField
              label="Key ID"
              description="Starts with rzp_test_ (test) or rzp_live_ (live). Safe to expose to frontend."
              value={config.razorpayKeyId}
              onChange={(v) => update({ razorpayKeyId: v })}
              placeholder={config.mode === 'test' ? 'rzp_test_XXXXXXXXXXXXXXXX' : 'rzp_live_XXXXXXXXXXXXXXXX'}
            />
            <SecretField
              label="Key Secret"
              description="Never expose this to the frontend. Stored securely in environment variables."
              value={config.razorpaySecret}
              onChange={(v) => update({ razorpaySecret: v })}
              placeholder="••••••••••••••••••••••••"
            />

            {/* Test connection */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTest}
                disabled={testing || !config.razorpayKeyId || !config.razorpaySecret}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Zap className="w-4 h-4 text-orange-500" />
                }
                Test Connection
              </button>
              {testResult === 'ok' && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connection successful
                </span>
              )}
              {testResult === 'fail' && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                  <XCircle className="w-4 h-4" /> Connection failed — check keys
                </span>
              )}
            </div>
          </Section>

          {/* ── Webhook ── */}
          <Section icon={Webhook} title="Webhook Configuration" subtitle="Razorpay sends payment events to this endpoint" accent="purple">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Webhook Endpoint URL</label>
              <p className="text-xs text-slate-400 mb-2">
                Copy this URL and paste it in Razorpay Dashboard → Settings → Webhooks
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={webhookDisplayUrl}
                  className="flex-1 px-3 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(webhookDisplayUrl)}
                  className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <SecretField
              label="Webhook Secret"
              description="Set when creating the webhook in Razorpay. Used to verify webhook signatures."
              value={config.webhookSecret}
              onChange={(v) => update({ webhookSecret: v })}
              placeholder="whsec_••••••••••••••••"
            />

            {/* Events info */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-purple-700 mb-2">Required Webhook Events</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  'subscription.activated',
                  'subscription.charged',
                  'subscription.cancelled',
                  'subscription.expired',
                  'payment.captured',
                  'payment.failed',
                ].map((e) => (
                  <span key={e} className="text-xs text-purple-600 font-mono bg-purple-100 px-2 py-0.5 rounded">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Auto-activate ── */}
          <Section icon={ShieldCheck} title="Premium Activation" subtitle="How users get premium access after payment" accent="orange">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={config.autoActivatePremium}
                  onChange={(e) => update({ autoActivatePremium: e.target.checked })}
                />
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  config.autoActivatePremium ? 'bg-teal-600 border-teal-600' : 'border-slate-300',
                )}>
                  {config.autoActivatePremium && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Auto-activate on payment success</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically mark user as premium when Razorpay confirms payment via webhook.
                  Disable to manually review payments before granting access.
                </p>
              </div>
            </label>
          </Section>

        </div>
      )}
    </div>
  )
}
