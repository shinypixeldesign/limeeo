'use client'

import { deleteOfferAction } from '@/app/actions/offers'

interface Props {
  offerId: string
  offerNumber: string
}

export default function DeleteOfferButton({ offerId, offerNumber }: Props) {
  return (
    <form
      action={deleteOfferAction}
      onSubmit={e => {
        if (!confirm(`Ștergi oferta ${offerNumber}? Această acțiune este ireversibilă.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={offerId} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Șterge
      </button>
    </form>
  )
}
