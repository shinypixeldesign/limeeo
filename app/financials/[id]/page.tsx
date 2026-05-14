import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, Client, Project } from '@/types/database'
import DeleteInvoiceButton from '@/components/financials/DeleteInvoiceButton'
import InvoiceActions from '@/components/financials/InvoiceActions'

const statusConfig: Record<Invoice['status'], { label: string; class: string }> = {
  draft:     { label: 'Draft',    class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  sent:      { label: 'Trimisă', class: 'bg-blue-50 text-blue-700 ring-blue-200' },
  paid:      { label: 'Plătită', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  overdue:   { label: 'Restantă',class: 'bg-red-50 text-red-700 ring-red-200' },
  cancelled: { label: 'Anulată', class: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

type FullInvoice = Invoice & { client: Client | null; project: Project | null }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('invoices')
    .select('*, client:clients(id,name,company,email,phone,cui,address,city,county), project:projects(id,name)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!data) notFound()

  const inv = data as FullInvoice
  const sc  = statusConfig[inv.status]
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('ro-RO') : '—'

  const isOverdue = inv.status === 'sent' && inv.due_date && inv.due_date < new Date().toISOString().split('T')[0]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/financials"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Facturi</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{inv.number}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${sc.class}`}>
                {sc.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Link
            href={`/financials/${inv.id}/preview`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Preview / PDF
          </Link>
          <Link
            href={`/financials/${inv.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editează
          </Link>
          <InvoiceActions invoice={inv} />
          <DeleteInvoiceButton invoiceId={inv.id} invoiceNumber={inv.number} />
        </div>
      </div>

      {/* Banner restantă */}
      {isOverdue && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">Factură restantă</p>
            <p className="text-xs text-red-600">Scadența a trecut pe {fmtDate(inv.due_date)}. Trimite un reminder sau marchează ca plătită.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stânga: meta */}
        <div className="space-y-5">
          {/* Detalii document */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Detalii document</h3>
            <div className="space-y-2.5 text-sm">
              <Row label="Data emiterii" value={fmtDate(inv.issue_date)} />
              <Row label="Scadență" value={
                inv.due_date ? (
                  <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{fmtDate(inv.due_date)}</span>
                ) : '—'
              } />
              {inv.sent_at && <Row label="Trimisă pe" value={fmtDate(inv.sent_at)} />}
              {inv.paid_at && <Row label="Plătită pe" value={<span className="text-emerald-600 font-semibold">{fmtDate(inv.paid_at)}</span>} />}
              {inv.client && (
                <Row label="Client" value={
                  <Link href={`/clients/${inv.client.id}`} className="text-indigo-600 hover:underline">
                    {inv.client.company ?? inv.client.name}
                  </Link>
                } />
              )}
              {inv.project && (
                <Row label="Proiect" value={
                  <Link href={`/projects/${inv.project.id}`} className="text-indigo-600 hover:underline truncate max-w-36 block">
                    {inv.project.name}
                  </Link>
                } />
              )}
            </div>
          </div>

          {/* Sumar financiar */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Sumar financiar</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{fmt(inv.subtotal)} {inv.currency}</span>
              </div>
              {inv.discount_amount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Discount {inv.discount_type === 'percent' ? `(${inv.discount_value}%)` : ''}</span>
                  <span>−{fmt(inv.discount_amount)} {inv.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>TVA ({inv.tax_rate}%)</span>
                <span>{fmt(inv.tax_amount)} {inv.currency}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                <span>Total de plată</span>
                <span>{fmt(inv.total)} {inv.currency}</span>
              </div>
            </div>
          </div>

          {inv.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Note / mențiuni</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{inv.notes}</p>
            </div>
          )}
        </div>

        {/* Dreapta: linii factură */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Produse / Servicii</h2>
              <span className="text-xs text-slate-400">{(inv.items ?? []).length} rânduri</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descriere</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">UM</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Cant.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Preț/u</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inv.items ?? []).map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 text-slate-800">{item.description}</td>
                    <td className="px-3 py-3.5 text-center text-slate-400 text-xs">{item.um ?? 'buc'}</td>
                    <td className="px-3 py-3.5 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{fmt(item.unit_price)} {inv.currency}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{fmt(item.total)} {inv.currency}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-6 py-3 text-sm font-bold text-slate-700 text-right">TOTAL</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">{fmt(inv.total)} {inv.currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  )
}
