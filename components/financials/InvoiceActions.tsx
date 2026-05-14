'use client'

import { useState, useTransition } from 'react'
import type { Invoice } from '@/types/database'
import {
  markInvoicePaidAction,
  markInvoiceSentAction,
  duplicateInvoiceAction,
} from '@/app/actions/financials'

interface Props {
  invoice: Pick<Invoice, 'id' | 'status' | 'due_date'>
}

export default function InvoiceActions({ invoice }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0])
  const [msg, setMsg] = useState<string | null>(null)

  function handleMarkSent() {
    const fd = new FormData()
    fd.set('id', invoice.id)
    startTransition(async () => {
      const res = await markInvoiceSentAction(fd)
      if (res?.message) setMsg(res.message)
    })
  }

  function handleMarkPaid() {
    const fd = new FormData()
    fd.set('id', invoice.id)
    fd.set('paid_at', new Date(paidDate).toISOString())
    startTransition(async () => {
      const res = await markInvoicePaidAction(fd)
      if (res?.message) { setMsg(res.message); setShowPaidModal(false) }
    })
  }

  function handleDuplicate() {
    const fd = new FormData()
    fd.set('id', invoice.id)
    startTransition(() => { duplicateInvoiceAction(fd) })
  }

  return (
    <>
      {msg && (
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {msg}
        </span>
      )}

      {/* Duplicate — mereu disponibil */}
      <button
        onClick={handleDuplicate}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        title="Duplică factura"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Duplică
      </button>

      {/* Mark Sent — doar dacă e draft */}
      {invoice.status === 'draft' && (
        <button
          onClick={handleMarkSent}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Marchează trimisă
        </button>
      )}

      {/* Mark Paid — dacă e sent sau overdue */}
      {['sent', 'overdue'].includes(invoice.status) && (
        <button
          onClick={() => setShowPaidModal(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Marchează plătită
        </button>
      )}

      {/* Modal Mark Paid */}
      {showPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Marchează ca plătită</h3>
            <p className="text-sm text-slate-500 mb-5">Introdu data la care a fost primită plata.</p>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Data plății</label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaidModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Anulează
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={isPending}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {isPending ? 'Se salvează...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
