'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Info } from 'lucide-react'
import { adminApi } from '@/lib/adminApi'
import { Button } from '@/components/ui/button'

// ── Setting field ─────────────────────────────────────────────────────────────

function SettingField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-slate-100 last:border-none">
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-slate-300" />{description}
        </p>
      </div>
      <div className="w-28 shrink-0">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm font-semibold text-slate-800 text-right border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 tabular-nums"
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FIELDS: {
  key: string
  label: string
  description: string
  section: 'Free Tier' | 'Premium Tier'
}[] = [
  {
    key:         'free_post_limit',
    label:       'Free Post Limit',
    description: 'Maximum concurrent OPEN work posts a free-tier user can have.',
    section:     'Free Tier',
  },
  {
    key:         'free_bid_limit',
    label:       'Free Bid Limit',
    description: 'Maximum bids a free-tier user can submit per calendar month.',
    section:     'Free Tier',
  },
  {
    key:         'premium_post_limit',
    label:       'Premium Post Limit',
    description: 'Maximum concurrent OPEN work posts a premium user can have.',
    section:     'Premium Tier',
  },
  {
    key:         'premium_bid_limit',
    label:       'Premium Bid Limit',
    description: 'Maximum bids a premium user can submit per calendar month.',
    section:     'Premium Tier',
  },
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    adminApi.getSettings()
      .then((res) => setSettings(res.data.settings))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload: Record<string, number> = {}
      for (const [key, val] of Object.entries(settings)) {
        payload[key] = parseInt(val, 10) || 0
      }
      const res = await adminApi.putSettings(payload)
      setSettings(res.data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const sections = ['Free Tier', 'Premium Tier'] as const

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Platform limits and caps per user tier</p>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          className="shrink-0"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saved ? '✓ Saved!' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 py-12">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading settings…
        </div>
      ) : (
        <>
          {sections.map((section) => (
            <div key={section} className="mb-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-bold text-slate-700 text-sm">
                    {section === 'Free Tier' ? '🆓' : '⭐'} {section}
                  </h2>
                </div>

                {/* Fields */}
                <div className="px-6">
                  {FIELDS.filter((f) => f.section === section).map((field) => (
                    <SettingField
                      key={field.key}
                      label={field.label}
                      description={field.description}
                      value={settings[field.key] ?? ''}
                      onChange={(v) => setSettings((prev) => ({ ...prev, [field.key]: v }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Info note */}
          <div className="rounded-2xl bg-teal-50 border border-teal-100 px-5 py-4 mt-4">
            <p className="text-sm text-teal-700 font-semibold mb-1">📌 Note</p>
            <p className="text-xs text-teal-600 leading-relaxed">
              Changes here update the database. The API enforces these limits when users
              create posts or submit bids. Setting a limit to 0 effectively disables
              that action for the tier.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
