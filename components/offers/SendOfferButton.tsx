'use client'

import { sendOfferAction } from '@/app/actions/offers'
import { useTransition } from 'react'

interface Props {
  offerId: string
  currentStatus: string
}

export default function SendOfferButton({ offerId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()

  if (!['draft', 'sent'].includes(currentStatus)) return null

  return (
    <form
      action={async (formData) => {
        startTransition(async () => {
          await sendOfferAction(formData)
        })
      }}
    >
      <input type="hidden" name="id" value={offerId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        {pending ? 'Se marchează...' : currentStatus === 'sent' ? 'Re-trimite' : 'Marchează trimisă'}
      </button>
    </form>
  )
}
