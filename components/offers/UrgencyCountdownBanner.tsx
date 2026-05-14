'use client'

import { useEffect, useState } from 'react'

interface UrgencyCountdownBannerProps {
  expiresAt: string
  discountValue: number
  discountType: string
  brandColor: string
}

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, '0')
}

export default function UrgencyCountdownBanner({
  expiresAt,
  discountValue,
  discountType,
  brandColor,
}: UrgencyCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function calc() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setTimeLeft(null)
        return
      }
      const totalSeconds = Math.floor(diff / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setTimeLeft({ days, hours, minutes, seconds })
    }

    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (expired || !timeLeft) return null

  const discountLabel = discountType === 'percent'
    ? `${discountValue}% reducere`
    : `${discountValue} reducere`

  return (
    <div
      className="sticky top-0 z-50 bg-gray-900 border-b-4"
      style={{ borderBottomColor: brandColor }}
    >
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" style={{ color: brandColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-white text-sm font-bold">
            Ofertă specială: <span style={{ color: brandColor }}>{discountLabel}</span>
            {' '}disponibilă pentru o perioadă limitată!
          </p>
        </div>
        <div className="flex items-center gap-1 font-mono text-base font-bold shrink-0" style={{ color: brandColor }}>
          {timeLeft.days > 0 && (
            <span>{timeLeft.days} {timeLeft.days === 1 ? 'zi' : 'zile'} </span>
          )}
          <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
        </div>
      </div>
    </div>
  )
}
