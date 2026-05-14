'use client'

import Link from 'next/link'

export type ReminderType = 'offer_unseen' | 'offer_viewed' | 'invoice_overdue' | 'invoice_due_soon' | 'project_deadline'
export type ReminderUrgency = 'urgent' | 'attention' | 'info'

export interface Reminder {
  id: string
  type: ReminderType
  urgency: ReminderUrgency
  title: string
  description: string
  clientName: string | null
  clientEmail: string | null
  resourceHref: string
  daysAgo: number | null
  dateLabel: string
}

interface Props {
  reminders: Reminder[]
}

const urgencyConfig: Record<ReminderUrgency, {
  badge: string
  label: string
  cardBorder: string
  dot: string
}> = {
  urgent: {
    badge: 'bg-red-100 text-red-700 ring-red-200',
    label: 'Urgent',
    cardBorder: 'border-red-200',
    dot: 'bg-red-500',
  },
  attention: {
    badge: 'bg-amber-100 text-amber-700 ring-amber-200',
    label: 'Atenție',
    cardBorder: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  info: {
    badge: 'bg-blue-100 text-blue-700 ring-blue-200',
    label: 'Info',
    cardBorder: 'border-blue-200',
    dot: 'bg-blue-400',
  },
}

const typeConfig: Record<ReminderType, {
  icon: React.ReactNode
  color: string
}> = {
  offer_unseen: {
    color: 'text-blue-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  offer_viewed: {
    color: 'text-amber-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  invoice_overdue: {
    color: 'text-red-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  invoice_due_soon: {
    color: 'text-amber-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  project_deadline: {
    color: 'text-blue-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const urgency = urgencyConfig[reminder.urgency]
  const type = typeConfig[reminder.type]

  const mailtoSubject = encodeURIComponent(`Reminder: ${reminder.title}`)
  const mailtoBody = encodeURIComponent(
    `Bună ziua,\n\nDoream să revin cu privire la ${reminder.title}.\n\nVă stau la dispoziție pentru orice întrebări.\n\nCu stimă`
  )
  const mailtoHref = reminder.clientEmail
    ? `mailto:${reminder.clientEmail}?subject=${mailtoSubject}&body=${mailtoBody}`
    : null

  return (
    <div className={`bg-white rounded-xl border ${urgency.cardBorder} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      {/* Icon + type */}
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 ${type.color}`}>
        {type.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${urgency.badge}`}>
            {urgency.label}
          </span>
          <span className="text-sm font-semibold text-slate-900">{reminder.title}</span>
        </div>
        <p className="text-sm text-slate-600">{reminder.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          {reminder.clientName && (
            <span className="text-xs text-slate-500">{reminder.clientName}</span>
          )}
          <span className="text-xs text-slate-400">{reminder.dateLabel}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {mailtoHref && (
          <a
            href={mailtoHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Trimite reminder
          </a>
        )}
        <Link
          href={reminder.resourceHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition"
        >
          Deschide →
        </Link>
      </div>
    </div>
  )
}

export default function RemindersView({ reminders }: Props) {
  const urgent = reminders.filter(r => r.urgency === 'urgent')
  const attention = reminders.filter(r => r.urgency === 'attention')
  const info = reminders.filter(r => r.urgency === 'info')

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remindere</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {reminders.length === 0
              ? 'Nicio acțiune pendintă'
              : `${reminders.length} ${reminders.length === 1 ? 'acțiune' : 'acțiuni'} necesită atenție`}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {reminders.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Totul e în regulă!</h2>
          <p className="text-slate-500 text-sm">Nu ai acțiuni pendinte. Revino mai târziu.</p>
        </div>
      )}

      {/* Urgent */}
      {urgent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Urgent ({urgent.length})</h2>
          </div>
          <div className="space-y-3">
            {urgent.map(r => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </section>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Atenție ({attention.length})</h2>
          </div>
          <div className="space-y-3">
            {attention.map(r => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </section>
      )}

      {/* Info */}
      {info.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Informativ ({info.length})</h2>
          </div>
          <div className="space-y-3">
            {info.map(r => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </section>
      )}
    </div>
  )
}
