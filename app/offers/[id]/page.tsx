import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Offer, Client, Project, OfferItem } from '@/types/database'
import DeleteOfferButton from '@/components/offers/DeleteOfferButton'
import SendOfferButton from '@/components/offers/SendOfferButton'
import CopyLinkButton from '@/components/offers/CopyLinkButton'
import DuplicateOfferButton from '@/components/offers/DuplicateOfferButton'
import EmailOfferButton from '@/components/offers/EmailOfferButton'
import PrintOfferButton from '@/components/offers/PrintOfferButton'

const statusConfig: Record<Offer['status'], { label: string; class: string }> = {
  draft:    { label: 'Draft',     class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  sent:     { label: 'Trimisă',   class: 'bg-blue-50 text-blue-700 ring-blue-200' },
  viewed:   { label: 'Văzută',    class: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Acceptată', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Refuzată',  class: 'bg-red-50 text-red-700 ring-red-200' },
}

type FullOffer = Offer & { client: Client | null; project: Project | null; offer_items: OfferItem[] }

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('offers')
    .select('*, client:clients(id,name,company,email), project:projects(id,name), offer_items(*)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!data) notFound()

  const offer = data as FullOffer
  const sc = statusConfig[offer.status]
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sortedItems = [...(offer.offer_items ?? [])].sort((a, b) => a.position - b.position)

  const isExpired = offer.valid_until && new Date(offer.valid_until) < new Date() && offer.status !== 'accepted'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/offers"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Oferte</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{offer.number}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${sc.class}`}>
                {sc.label}
              </span>
              {isExpired && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset bg-red-50 text-red-600 ring-red-200">
                  Expirată
                </span>
              )}
            </div>
            {offer.title && <p className="text-slate-500 text-sm mt-0.5">{offer.title}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <PrintOfferButton token={offer.token} />
          <CopyLinkButton token={offer.token} />
          <EmailOfferButton offerId={offer.id} clientEmail={offer.client?.email} />
          <DuplicateOfferButton offerId={offer.id} />
          <Link
            href={`/offers/${offer.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editează
          </Link>
          <SendOfferButton offerId={offer.id} currentStatus={offer.status} />
          <DeleteOfferButton offerId={offer.id} offerNumber={offer.number} />
        </div>
      </div>

      {/* Accepted banner */}
      {offer.status === 'accepted' && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Ofertă acceptată!</p>
            {offer.accepted_at && (
              <p className="text-xs text-emerald-600">
                Acceptată pe {new Date(offer.accepted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <Link
            href={`/financials/new?type=invoice&from_offer=${offer.id}`}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Creează factură din ofertă →
          </Link>
        </div>
      )}

      {/* Rejected banner */}
      {offer.status === 'rejected' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800">Ofertă refuzată</p>
          {offer.refusal_reason && (
            <p className="text-sm text-red-600 mt-1">Motiv: {offer.refusal_reason}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: meta */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Detalii ofertă</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Număr</span>
                <span className="font-mono font-medium text-slate-800">{offer.number}</span>
              </div>
              {offer.client && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <Link href={`/clients/${offer.client.id}`} className="font-medium text-violet-600 hover:underline">
                    {offer.client.name}
                  </Link>
                </div>
              )}
              {offer.project && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Proiect</span>
                  <Link href={`/projects/${offer.project.id}`} className="font-medium text-violet-600 hover:underline truncate max-w-32">
                    {offer.project.name}
                  </Link>
                </div>
              )}
              {offer.valid_until && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Valabilă până</span>
                  <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                    {new Date(offer.valid_until).toLocaleDateString('ro-RO')}
                  </span>
                </div>
              )}
              {offer.sent_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Trimisă la</span>
                  <span className="font-medium text-slate-800">{new Date(offer.sent_at).toLocaleDateString('ro-RO')}</span>
                </div>
              )}
              {offer.viewed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Văzută la</span>
                  <span className="font-medium text-slate-800">{new Date(offer.viewed_at).toLocaleDateString('ro-RO')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Sumar financiar</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{fmt(offer.subtotal)} {offer.currency}</span>
              </div>
              {offer.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{fmt(offer.discount_amount)} {offer.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>TVA ({offer.tax_rate}%)</span>
                <span>{fmt(offer.tax_amount)} {offer.currency}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span>{fmt(offer.total)} {offer.currency}</span>
              </div>
            </div>
          </div>

          {/* Public link */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Link public ofertă</h3>
            <p className="text-xs text-slate-500 mb-3">Trimite acest link clientului pentru a vizualiza și accepta oferta.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 truncate text-slate-600">
                /o/{offer.token}
              </code>
              <CopyLinkButton token={offer.token} />
            </div>
          </div>

          {offer.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Note interne</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{offer.notes}</p>
            </div>
          )}
        </div>

        {/* Right: items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <h2 className="font-semibold text-slate-900">Servicii / Pachete</h2>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: offer.brand_color }}
                title={`Brand color: ${offer.brand_color}`}
              />
            </div>

            {offer.intro_text && (
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                <p className="text-sm text-slate-600 italic">{offer.intro_text}</p>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serviciu</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tip</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cant.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Preț/u</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.type === 'hourly' ? 'Per oră' : 'Fix'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-4 text-right text-slate-600">{fmt(item.unit_price)} {offer.currency}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">{fmt(item.total)} {offer.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {offer.terms_text && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Termeni & condiții</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{offer.terms_text}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
