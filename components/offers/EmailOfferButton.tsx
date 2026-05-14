'use client'

import { useState } from 'react'

export default function EmailOfferButton({
  offerId,
  clientEmail,
}: {
  offerId: string
  clientEmail?: string | null
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSend() {
    if (!clientEmail) {
      alert('Clientul nu are adresă de email. Editează clientul și adaugă email-ul.')
      return
    }
    if (!confirm(`Trimiți oferta pe email la ${clientEmail}?`)) return

    setState('loading')
    try {
      const res = await fetch('/api/send-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Eroare necunoscută')
        setState('error')
      } else {
        setState('done')
        setTimeout(() => setState('idle'), 4000)
      }
    } catch {
      setErrorMsg('Eroare de rețea')
      setState('error')
    }
  }

  if (state === 'error') {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="max-w-xs truncate">{errorMsg}</span>
        <button type="button" onClick={() => setState('idle')} className="ml-1 underline text-xs">OK</button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={state === 'loading'}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
        state === 'done'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {state === 'loading' ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : state === 'done' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
      {state === 'loading' ? 'Se trimite...' : state === 'done' ? 'Email trimis!' : 'Trimite email'}
    </button>
  )
}
