'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Invoice, Client } from '@/types/database'

type InvoiceWithClient = Invoice & { client: Client | null }

const statusConfig: Record<Invoice['status'], { label: string; class: string }> = {
  draft:     { label: 'Draft',    class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  sent:      { label: 'Trimisă', class: 'bg-blue-50 text-blue-700 ring-blue-200' },
  paid:      { label: 'Plătită', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  overdue:   { label: 'Restantă',class: 'bg-red-50 text-red-700 ring-red-200' },
  cancelled: { label: 'Anulată', class: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

const STATUSES = ['toate', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const

interface Props {
  invoices: InvoiceWithClient[]
  initialStatus?: string
  initialQ?: string
  initialFrom?: string
  initialTo?: string
}

export default function InvoiceListClient({ invoices, initialStatus, initialQ, initialFrom, initialTo }: Props) {
  const [q, setQ]         = useState(initialQ ?? '')
  const [status, setStatus] = useState(initialStatus ?? 'toate')
  const [from, setFrom]   = useState(initialFrom ?? '')
  const [to, setTo]       = useState(initialTo ?? '')

  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (status !== 'toate' && inv.status !== status) return false
      if (q) {
        const search = q.toLowerCase()
        const match  = inv.number.toLowerCase().includes(search)
          || (inv.client?.name ?? '').toLowerCase().includes(search)
          || (inv.client?.company ?? '').toLowerCase().includes(search)
        if (!match) return false
      }
      if (from && inv.issue_date < from) return false
      if (to   && inv.issue_date > to)   return false
      return true
    })
  }, [invoices, q, status, from, to])

  const hasFilters = q || status !== 'toate' || from || to

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Nicio factură încă</h2>
        <p className="text-slate-500 text-sm mb-6">Creează prima factură sau generează una dintr-o ofertă acceptată.</p>
        <Link href="/financials/new?type=invoice" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          Creează prima factură
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtre */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Caută după nr. sau client..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  status === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s === 'toate' ? 'Toate' : statusConfig[s as Invoice['status']].label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setQ(''); setStatus('toate'); setFrom(''); setTo('') }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Resetează
            </button>
          )}
        </div>

        {hasFilters && (
          <p className="text-xs text-slate-400 mt-2 pl-1">{filtered.length} din {invoices.length} facturi</p>
        )}
      </div>

      {/* Tabel */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Nicio factură nu corespunde filtrelor selectate.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nr.</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Client</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Emisă</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Scadență</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => {
                const sc = statusConfig[inv.status]
                const isOverdueWarning = inv.status === 'sent' && inv.due_date && inv.due_date < new Date().toISOString().split('T')[0]
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-700">{inv.number}</td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {inv.client
                        ? <span className="text-slate-700">{inv.client.company ?? inv.client.name}</span>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-slate-500 hidden md:table-cell">
                      {new Date(inv.issue_date).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {inv.due_date ? (
                        <span className={isOverdueWarning ? 'text-red-600 font-medium' : 'text-slate-500'}>
                          {new Date(inv.due_date).toLocaleDateString('ro-RO')}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${sc.class}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {fmt(inv.total)} <span className="text-slate-400 font-normal text-xs">{inv.currency}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/financials/${inv.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition"
                      >
                        Deschide →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
