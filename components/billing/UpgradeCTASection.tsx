'use client'
import { useState } from 'react'

interface Props {
  currentPlan: string
  planId?: string
  highlight?: boolean
  portalMode?: boolean
}

export default function UpgradeCTASection({ currentPlan, planId, highlight, portalMode }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Eroare la inițializarea plății. Încearcă din nou.')
    } catch {
      alert('Eroare la conexiune.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Eroare la deschiderea portalului.')
    } catch {
      alert('Eroare la conexiune.')
    } finally {
      setLoading(false)
    }
  }

  // Portal mode: just the "Manage subscription" button
  if (portalMode) {
    return (
      <button
        onClick={handlePortal}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
      >
        {loading ? 'Se deschide...' : 'Gestionează abonamentul'}
      </button>
    )
  }

  if (!planId) return null

  // Current plan
  if (planId === currentPlan) {
    return (
      <div className="w-full text-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-500">
        ✓ Planul tău curent
      </div>
    )
  }

  // Free plan — can't upgrade to free (downgrade handled via portal)
  if (planId === 'free') {
    if (currentPlan !== 'free') {
      return (
        <p className="text-xs text-center text-slate-400">
          Anulează din portalul de abonament
        </p>
      )
    }
    return null
  }

  // Upgrade CTA
  const styles: Record<string, string> = {
    solo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    pro: 'bg-violet-600 hover:bg-violet-700 text-white',
    team: 'bg-amber-500 hover:bg-amber-600 text-white',
  }

  const labels: Record<string, string> = {
    solo: 'Începe Solo',
    pro: 'Începe Pro',
    team: 'Începe Team',
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${styles[planId] ?? 'bg-slate-800 text-white hover:bg-slate-700'}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Se redirecționează...
        </>
      ) : labels[planId] ?? 'Upgrade'}
    </button>
  )
}
