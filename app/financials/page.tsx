import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, Client } from '@/types/database'
import InvoiceListClient from '@/components/financials/InvoiceListClient'

export const dynamic = 'force-dynamic'

type InvoiceWithClient = Invoice & { client: Client | null }

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-mark overdue: facturile sent cu due_date în trecut → overdue
  await supabase.from('invoices')
    .update({ status: 'overdue' })
    .eq('user_id', user!.id)
    .eq('status', 'sent')
    .eq('type', 'invoice')
    .lt('due_date', new Date().toISOString().split('T')[0])

  const { data } = await supabase
    .from('invoices')
    .select('*, client:clients(id, name, company)')
    .eq('user_id', user!.id)
    .eq('type', 'invoice')
    .order('issue_date', { ascending: false })

  const all = (data ?? []) as InvoiceWithClient[]

  // Stats globale (pe tot, nu filtrate)
  const now       = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const paid      = all.filter(i => i.status === 'paid')
  const pending   = all.filter(i => ['sent'].includes(i.status))
  const overdue   = all.filter(i => i.status === 'overdue')

  const totalPaidYTD  = paid.filter(i => i.paid_at && i.paid_at >= yearStart).reduce((s, i) => s + i.total, 0)
  const totalPending  = pending.reduce((s, i) => s + i.total, 0)
  const totalOverdue  = overdue.reduce((s, i) => s + i.total, 0)
  const totalDraft    = all.filter(i => i.status === 'draft').reduce((s, i) => s + i.total, 0)

  // Monthly revenue (ultimele 6 luni)
  const months: { label: string; paid: number; pending: number }[] = []
  for (let m = 5; m >= 0; m--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1)
    const label = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })
    const mPaid    = all.filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= d.toISOString() && i.paid_at < end.toISOString()).reduce((s, i) => s + i.total, 0)
    const mPending = all.filter(i => ['sent', 'overdue'].includes(i.status) && i.issue_date >= d.toISOString().split('T')[0] && i.issue_date < end.toISOString().split('T')[0]).reduce((s, i) => s + i.total, 0)
    months.push({ label, paid: mPaid, pending: mPending })
  }

  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturi</h1>
          <p className="text-slate-500 text-sm mt-0.5">{all.length} facturi totale</p>
        </div>
        <Link
          href="/financials/new?type=invoice"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Factură nouă
        </Link>
      </div>

      {/* Carduri statistici */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Încasat {now.getFullYear()}</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalPaidYTD)}</p>
          <p className="text-xs text-slate-400 mt-0.5">RON</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">De încasat</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{fmt(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-0.5">RON · {pending.length} facturi</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Restante</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmt(totalOverdue)}</p>
          <p className="text-xs text-slate-400 mt-0.5">RON · {overdue.length} facturi</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Draft</p>
          </div>
          <p className="text-2xl font-bold text-slate-500">{fmt(totalDraft)}</p>
          <p className="text-xs text-slate-400 mt-0.5">RON · {all.filter(i => i.status === 'draft').length} facturi</p>
        </div>
      </div>

      {/* Chart venituri lunare */}
      {all.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">Venituri lunare (ultimele 6 luni)</h2>
          <div className="flex items-end gap-3 h-32">
            {months.map((m, i) => {
              const maxVal = Math.max(...months.map(x => x.paid + x.pending), 1)
              const totalH = Math.round(((m.paid + m.pending) / maxVal) * 100)
              const paidH  = Math.round((m.paid / maxVal) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                    <div className="w-full rounded-t-md overflow-hidden" style={{ height: `${totalH}%`, minHeight: totalH > 0 ? '4px' : '0' }}>
                      <div className="w-full bg-blue-200" style={{ height: `${m.pending > 0 ? Math.round((m.pending / (m.paid + m.pending || 1)) * 100) : 0}%` }} />
                      <div className="w-full bg-emerald-500" style={{ height: `${m.paid > 0 ? Math.round((m.paid / (m.paid + m.pending || 1)) * 100) : 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Încasat
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-blue-200" /> De încasat
            </div>
          </div>
        </div>
      )}

      {/* Lista cu filtre */}
      <InvoiceListClient
        invoices={all}
        initialStatus={sp.status}
        initialQ={sp.q}
        initialFrom={sp.from}
        initialTo={sp.to}
      />
    </div>
  )
}
