'use client'

import { useTransition } from 'react'
import { duplicateOfferAction } from '@/app/actions/offers'

export default function DuplicateOfferButton({ offerId }: { offerId: string }) {
  const [pending, startTransition] = useTransition()

  function handleDuplicate() {
    if (!confirm('Duplici oferta ca draft nou?')) return
    const fd = new FormData()
    fd.set('id', offerId)
    startTransition(async () => {
      await duplicateOfferAction(fd)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
    >
      {pending ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
      {pending ? 'Se duplică...' : 'Duplică'}
    </button>
  )
}
