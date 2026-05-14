'use client'

import { useState, useTransition } from 'react'
import { acceptOfferAction, rejectOfferAction } from '@/app/actions/offers'

interface Props {
  token: string
  accentColor: string
}

export default function PublicOfferActions({ token, accentColor }: Props) {
  const [done, setDone]           = useState<'accepted' | 'rejected' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason]       = useState('')
  const [error, setError]         = useState('')
  const [pending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('token', token)
      const res = await acceptOfferAction(fd)
      if (res.ok) setDone('accepted')
      else setError(res.error ?? 'Eroare necunoscută.')
    })
  }

  function handleReject() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('token', token)
      fd.set('reason', reason)
      const res = await rejectOfferAction(fd)
      if (res.ok) { setDone('rejected'); setShowModal(false) }
      else setError(res.error ?? 'Eroare necunoscută.')
    })
  }

  if (done === 'accepted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">Ofertă acceptată!</h2>
        <p className="text-emerald-600 text-sm max-w-sm mx-auto leading-relaxed">
          Vă mulțumim pentru confirmare. Vă vom contacta în cel mai scurt timp pentru a demara colaborarea.
        </p>
      </div>
    )
  }

  if (done === 'rejected') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Răspuns înregistrat</h2>
        <p className="text-slate-500 text-sm">Vă mulțumim pentru feedback. Sperăm să colaborăm cu altă ocazie.</p>
      </div>
    )
  }

  return (
    <>
      {/* CTA card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">Răspunde la această ofertă</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Acceptați propunerea de mai sus? Confirmați prin unul din butoanele de mai jos.
          </p>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" disabled={pending} onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90 disabled:opacity-60 shadow-sm"
              style={{ backgroundColor: accentColor }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {pending ? 'Se procesează...' : 'Accept oferta'}
            </button>
            <button type="button" disabled={pending} onClick={() => setShowModal(true)}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-60">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Refuz oferta
            </button>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Confirmare refuz</h3>
                  <p className="text-xs text-slate-400">Ajutați-ne să ne îmbunătățim</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Ne pare rău că această ofertă nu corespunde așteptărilor dvs. Dacă doriți, ne puteți spune motivul pentru a putea veni cu o propunere mai bună.
              </p>

              <div className="space-y-3">
                {[
                  'Bugetul propus este prea ridicat',
                  'Am ales un alt furnizor',
                  'Serviciile nu corespund nevoilor noastre',
                  'Proiectul a fost amânat',
                  'Altul',
                ].map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    reason === opt ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="reason_opt" value={opt}
                      checked={reason === opt}
                      onChange={() => setReason(opt)}
                      className="accent-red-500" />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}

                <div className="mt-2">
                  <textarea rows={2} value={reason !== 'Altul' && ['Bugetul propus este prea ridicat','Am ales un alt furnizor','Serviciile nu corespund nevoilor noastre','Proiectul a fost amânat','Altul'].includes(reason) ? '' : reason}
                    onChange={e => setReason(e.target.value)}
                    onClick={() => setReason('')}
                    placeholder="Sau scrieți direct motivul dvs. (opțional)..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition resize-none" />
                </div>
              </div>

              {error && (
                <div className="mt-3 text-sm text-red-600">{error}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Mă răzgândesc
              </button>
              <button type="button" disabled={pending} onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                {pending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Se trimite...
                  </>
                ) : 'Confirmă refuzul'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
