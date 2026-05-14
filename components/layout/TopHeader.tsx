'use client'

import NotificationBell from './NotificationBell'

interface TopHeaderProps {
  initialUnreadCount: number
}

export default function TopHeader({ initialUnreadCount }: TopHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0">
      {/* Stânga: rezervat pentru breadcrumb */}
      <div />

      {/* Dreapta: clopoțel notificări */}
      <div className="flex items-center gap-2">
        <NotificationBell initialUnreadCount={initialUnreadCount} />
      </div>
    </header>
  )
}
