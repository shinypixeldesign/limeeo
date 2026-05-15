'use client'

import { useState, useTransition } from 'react'
import { emitToSmartBillAction } from '@/app/actions/smartbill'

interface Props {
  invoiceId: string
  smartbillNumber: string | null
  invoiceStatus: string
}

export default function SmartBillButton({ invoiceId, smartbillNumber, invoiceStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; message?: string } | null>(null)

  // Dacă deja emisă, arată badge verde
  if (smartbillNumber) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-sm font-medium text-emerald-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        SmartBill: {smartbillNumber}
      </div>
    )
  }

  // Nu emite draft-uri
  if (invoiceStatus === 'draft') return null

  function handleEmit() {
    setResult(null)
    startTransition(async () => {
      const res = await emitToSmartBillAction(invoiceId)
      setResult(res ?? null)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleEmit}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {/* SmartBill logo-like icon */}
        <svg className="w-4 h-4 text-[#0066CC]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a4 4 0 110 8 4 4 0 010-8zm0 10c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/>
        </svg>
        {isPending ? 'Se emite...' : 'Emite în SmartBill'}
      </button>
      {result?.error && (
        <p className="text-xs text-red-600 font-medium">{result.error}</p>
      )}
      {result?.message && (
        <p className="text-xs text-emerald-600 font-medium">{result.message}</p>
      )}
    </div>
  )
}
