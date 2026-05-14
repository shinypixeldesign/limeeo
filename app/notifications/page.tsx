import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { markAllReadAction } from '@/app/actions/notifications'
import type { Notification, NotificationType } from '@/types/database'

export const metadata = { title: 'Notificări — Limeeo' }

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'acum câteva secunde'
  if (diffMin < 60) return `acum ${diffMin} ${diffMin === 1 ? 'minut' : 'minute'}`
  if (diffHour < 24) return `acum ${diffHour} ${diffHour === 1 ? 'oră' : 'ore'}`
  if (diffDay === 1) return 'ieri'
  if (diffDay < 7) return `acum ${diffDay} zile`
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'offer_accepted': return 'Ofertă acceptată'
    case 'offer_rejected': return 'Ofertă respinsă'
    case 'offer_viewed': return 'Ofertă vizualizată'
    case 'invoice_paid': return 'Factură plătită'
    case 'reminder': return 'Reminder'
    case 'automation': return 'Automatizare'
    case 'system': return 'Sistem'
  }
}

function getTypeStyles(type: NotificationType): { bg: string; icon: React.ReactNode } {
  switch (type) {
    case 'offer_accepted':
      return {
        bg: 'bg-emerald-100 text-emerald-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ),
      }
    case 'offer_rejected':
      return {
        bg: 'bg-red-100 text-red-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      }
    case 'offer_viewed':
      return {
        bg: 'bg-blue-100 text-blue-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
      }
    case 'invoice_paid':
      return {
        bg: 'bg-emerald-100 text-emerald-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      }
    case 'reminder':
      return {
        bg: 'bg-amber-100 text-amber-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      }
    case 'automation':
      return {
        bg: 'bg-violet-100 text-violet-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      }
    case 'system':
    default:
      return {
        bg: 'bg-violet-100 text-violet-600',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      }
  }
}

function groupNotifications(notifications: Notification[]): Record<string, Notification[]> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000)
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86_400_000)

  const groups: Record<string, Notification[]> = {
    'Azi': [],
    'Ieri': [],
    'Această săptămână': [],
    'Mai vechi': [],
  }

  for (const n of notifications) {
    const d = new Date(n.created_at)
    if (d >= startOfToday) groups['Azi'].push(n)
    else if (d >= startOfYesterday) groups['Ieri'].push(n)
    else if (d >= startOfWeek) groups['Această săptămână'].push(n)
    else groups['Mai vechi'].push(n)
  }

  return groups
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications: Notification[] = data ?? []
  const hasUnread = notifications.some(n => !n.is_read)

  // Marchează automat toate ca citite la vizualizarea paginii
  if (hasUnread) {
    await markAllReadAction()
  }

  const groups = groupNotifications(notifications)
  const groupOrder = ['Azi', 'Ieri', 'Această săptămână', 'Mai vechi'] as const

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header pagina */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificări</h1>
          <p className="text-sm text-slate-500 mt-1">
            {notifications.length === 0
              ? 'Nicio notificare'
              : `${notifications.length} notificări`}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-600 mb-2">Nicio notificare momentan</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            Vei primi notificări când clienții îți acceptă sau resping ofertele, când facturile sunt plătite sau când ai remindere active.
          </p>
        </div>
      )}

      {/* Grupuri de notificări */}
      {groupOrder.map(group => {
        const items = groups[group]
        if (!items || items.length === 0) return null

        return (
          <div key={group} className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
              {group}
            </h2>
            <div className="space-y-2">
              {items.map(notification => {
                const { bg, icon } = getTypeStyles(notification.type)
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                      notification.is_read
                        ? 'bg-white border-slate-200'
                        : 'bg-indigo-50/50 border-indigo-100'
                    }`}
                  >
                    {/* Punct albastru pentru necitite */}
                    <div className="flex items-center justify-center w-5 shrink-0 mt-1">
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>

                    {/* Icon tip */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${bg}`}>
                      {icon}
                    </div>

                    {/* Conținut */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {getTypeLabel(notification.type)}
                          </span>
                          <p className={`text-sm mt-0.5 ${notification.is_read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-slate-500 mt-1">{notification.body}</p>
                          )}
                        </div>
                        <time
                          className="text-xs text-slate-400 shrink-0 mt-1"
                          title={formatFullDate(notification.created_at)}
                        >
                          {formatRelativeTime(notification.created_at)}
                        </time>
                      </div>

                      {notification.resource_href && (
                        <a
                          href={notification.resource_href}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Vizualizează
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
