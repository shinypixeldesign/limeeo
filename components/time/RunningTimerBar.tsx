'use client'

import { useState, useEffect, useTransition } from 'react'
import { stopTimerAction } from '@/app/actions/time'
import Link from 'next/link'

interface RunningTimerBarProps {
  entryId: string
  startedAt: string
  description: string | null
  projectName: string | null
  clientName: string | null
}

function fmtElapsed(startedAt: string): string {
  const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function RunningTimerBar({ entryId, startedAt, description, projectName, clientName }: RunningTimerBarProps) {
  const [elapsed, setElapsed] = useState(fmtElapsed(startedAt))
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const iv = setInterval(() => setElapsed(fmtElapsed(startedAt)), 1000)
    return () => clearInterval(iv)
  }, [startedAt])

  function handleStop() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', entryId)
      fd.set('started_at', startedAt)
      await stopTimerAction(fd)
    })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#acff55] text-black text-sm font-medium z-50 shrink-0">
      {/* Pulsing dot */}
      <span className="flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-black opacity-30" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black/60" />
      </span>

      {/* Info */}
      <Link href="/time" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition">
        <span className="font-mono font-bold text-base tabular-nums">{elapsed}</span>
        {description && <span className="font-semibold truncate hidden sm:block">— {description}</span>}
        {(clientName || projectName) && (
          <span className="text-black/60 text-xs truncate hidden md:block">
            {[clientName, projectName].filter(Boolean).join(' › ')}
          </span>
        )}
      </Link>

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-full bg-black/10 hover:bg-black/20 px-4 py-1.5 text-xs font-bold text-black transition shrink-0 disabled:opacity-60"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        Stop
      </button>
    </div>
  )
}
