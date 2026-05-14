'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Invoice, Client, Project, Profile } from '@/types/database'

type FullInvoice = Invoice & { client: Client | null; project: Project | null }

interface InvoicePreviewProps {
  invoice: FullInvoice
  profile: Profile | null
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Trimisă',
  paid: 'Plătită',
  overdue: 'Restantă',
  cancelled: 'Anulată',
}

export default function InvoicePreview({ invoice: inv, profile }: InvoicePreviewProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const isOffer = inv.type === 'offer'
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const clientEmail = inv.client?.email ?? ''

  async function handleSendEmail() {
    if (!clientEmail) {
      setSendError('Clientul nu are adresă de email. Adaugă email-ul în fișa clientului.')
      return
    }
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error ?? 'Eroare la trimitere.')
      } else {
        setSent(true)
      }
    } catch {
      setSendError('Eroare de conexiune.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Bara de acțiuni (nu se printează) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/financials/${inv.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Înapoi
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-semibold text-slate-700 font-mono">{inv.number}</span>
        </div>
        <div className="flex items-center gap-2">
          {sendError && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 max-w-xs">{sendError}</span>
          )}
          {sent && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Email trimis!
            </span>
          )}
          <button
            onClick={handleSendEmail}
            disabled={sending || sent}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {sending ? 'Se trimite...' : sent ? 'Trimis' : `Trimite pe email${clientEmail ? ` (${clientEmail})` : ''}`}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Descarcă / Printează PDF
          </button>
        </div>
      </div>

      {/* Documentul */}
      <div className="py-8 px-4 print:py-0 print:px-0">
        <div
          id="invoice-document"
          className="bg-white mx-auto shadow-lg print:shadow-none"
          style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}
        >
          {/* Header document */}
          <div className="flex items-start justify-between mb-10">
            {/* Logo + date emitent */}
            <div>
              {profile?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt="Logo"
                  className="h-14 object-contain mb-3"
                />
              ) : (
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-600 mb-3">
                  <span className="text-white text-2xl font-bold">
                    {(profile?.company_name ?? profile?.full_name ?? 'F')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <p className="font-bold text-slate-900 text-base">{profile?.company_name ?? profile?.full_name ?? '—'}</p>
              {profile?.company_cui && <p className="text-xs text-slate-500 mt-0.5">CUI: {profile.company_cui}</p>}
              {profile?.company_j && <p className="text-xs text-slate-500">J: {profile.company_j}</p>}
              {profile?.company_address && <p className="text-xs text-slate-500">{profile.company_address}</p>}
              {(profile?.company_city || profile?.company_county) && (
                <p className="text-xs text-slate-500">
                  {[profile.company_city, profile.company_county].filter(Boolean).join(', ')}
                </p>
              )}
              {profile?.company_phone && <p className="text-xs text-slate-500 mt-1">{profile.company_phone}</p>}
              {profile?.company_email && <p className="text-xs text-slate-500">{profile.company_email}</p>}
            </div>

            {/* Titlu document */}
            <div className="text-right">
              <div className={`inline-block px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest mb-2 ${
                isOffer
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
                {isOffer ? 'Ofertă comercială' : 'Factură fiscală'}
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{inv.number}</p>
              <p className="text-xs text-slate-500 mt-1">
                Data emiterii: <strong>{new Date(inv.issue_date).toLocaleDateString('ro-RO')}</strong>
              </p>
              {inv.due_date && !isOffer && (
                <p className="text-xs text-slate-500">
                  Scadență: <strong>{new Date(inv.due_date).toLocaleDateString('ro-RO')}</strong>
                </p>
              )}
              <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {statusLabels[inv.status] ?? inv.status}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t-2 border-slate-900 mb-6" />

          {/* Date client */}
          {inv.client && (
            <div className="mb-8 bg-slate-50 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {isOffer ? 'Adresată către' : 'Facturat către'}
              </p>
              <p className="font-bold text-slate-900 text-base">{inv.client.company ?? inv.client.name}</p>
              {inv.client.company && inv.client.name !== inv.client.company && (
                <p className="text-sm text-slate-600">Attn: {inv.client.name}</p>
              )}
              {(inv.client as { cui?: string | null }).cui && (
                <p className="text-xs text-slate-500 mt-0.5">CUI: {(inv.client as { cui?: string | null }).cui}</p>
              )}
              {(inv.client as { address?: string | null }).address && (
                <p className="text-xs text-slate-500">{(inv.client as { address?: string | null }).address}</p>
              )}
              {((inv.client as { city?: string | null }).city || (inv.client as { county?: string | null }).county) && (
                <p className="text-xs text-slate-500">
                  {[(inv.client as { city?: string | null }).city, (inv.client as { county?: string | null }).county].filter(Boolean).join(', ')}
                </p>
              )}
              {inv.client.email && <p className="text-sm text-slate-600 mt-1">{inv.client.email}</p>}
              {inv.client.phone && <p className="text-sm text-slate-600">{inv.client.phone}</p>}
            </div>
          )}

          {/* Tabel produse/servicii */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-4 py-3 rounded-tl-lg font-semibold text-xs uppercase tracking-wide">
                  {isOffer ? 'Serviciu / Pachet' : 'Descriere'}
                </th>
                <th className="text-center px-2 py-3 font-semibold text-xs uppercase tracking-wide w-16">UM</th>
                <th className="text-center px-2 py-3 font-semibold text-xs uppercase tracking-wide w-16">Cant.</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wide w-28">Preț unitar</th>
                <th className="text-right px-4 py-3 rounded-tr-lg font-semibold text-xs uppercase tracking-wide w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items ?? []).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-3.5 text-slate-800 border-b border-slate-100">{item.description}</td>
                  <td className="px-2 py-3.5 text-center text-slate-400 text-xs border-b border-slate-100">{item.um ?? 'buc'}</td>
                  <td className="px-2 py-3.5 text-center text-slate-600 border-b border-slate-100">{item.quantity}</td>
                  <td className="px-3 py-3.5 text-right text-slate-600 border-b border-slate-100">
                    {fmt(item.unit_price)} {inv.currency}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 border-b border-slate-100">
                    {fmt(item.total)} {inv.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totaluri */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between text-sm text-slate-600 py-1.5">
                <span>Subtotal</span>
                <span>{fmt(inv.subtotal)} {inv.currency}</span>
              </div>
              {inv.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-amber-700 py-1.5">
                  <span>Discount {inv.discount_type === 'percent' ? `(${inv.discount_value}%)` : ''}</span>
                  <span>−{fmt(inv.discount_amount)} {inv.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600 py-1.5">
                <span>TVA ({inv.tax_rate}%)</span>
                <span>{fmt(inv.tax_amount)} {inv.currency}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t-2 border-slate-900 pt-2 mt-1">
                <span>TOTAL DE PLATĂ</span>
                <span>{fmt(inv.total)} {inv.currency}</span>
              </div>
            </div>
          </div>

          {/* Date bancare (doar pe factură, nu ofertă) */}
          {!isOffer && (profile?.company_iban || profile?.company_bank) && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Date pentru plată</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                {profile?.company_bank && (
                  <div>
                    <span className="text-slate-400">Bancă: </span>
                    <span className="font-medium">{profile.company_bank}</span>
                  </div>
                )}
                {profile?.company_iban && (
                  <div className="col-span-2">
                    <span className="text-slate-400">IBAN: </span>
                    <span className="font-mono font-semibold">{profile.company_iban}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          {inv.notes && (
            <div className="border-t border-slate-200 pt-4 mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mențiuni</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{inv.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-xs text-slate-400">
              {profile?.company_name ?? profile?.full_name}
              {profile?.company_website && <> · <a href={profile.company_website} className="text-indigo-500">{profile.company_website}</a></>}
              {profile?.company_email && <> · {profile.company_email}</>}
            </p>
            {isOffer && (
              <p className="text-xs text-slate-400 mt-1">
                Ofertă valabilă 30 de zile de la data emiterii. Prețurile sunt exprimate în {inv.currency} și nu includ TVA (dacă nu e specificat altfel).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  )
}
