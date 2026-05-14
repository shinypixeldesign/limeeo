import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markOfferViewedAction } from '@/app/actions/offers'
import type { Offer, OfferItem, Client } from '@/types/database'
import PublicOfferActions from '@/components/offers/PublicOfferActions'

type PublicOffer = Offer & { client: Client | null; offer_items: OfferItem[] }

const TYPE_LABELS: Record<string, string> = {
  fix: 'Preț fix', hourly: 'Per oră', rate_card: 'Rate Card',
}

export default async function PublicOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Fără filtru pe status — RLS gestionează accesul:
  // • Anonim: vede doar sent/viewed/accepted/rejected
  // • Owner autentificat: vede și propriile draft-uri
  const { data } = await supabase
    .from('offers')
    .select('*, client:clients(id,name,company,email,logo_url,phone,address,city,cui), offer_items(*)')
    .eq('token', token)
    .single()

  if (!data) notFound()

  const offer = data as PublicOffer

  // Fetch provider profile for branding
  const { data: providerProfile } = await supabase
    .from('profiles')
    .select('company_name, full_name, logo_url, company_email, company_phone, company_website, company_address, company_city, offer_brand_color')
    .eq('id', offer.user_id)
    .single()

  const sortedItems = [...(offer.offer_items ?? [])].sort((a, b) => a.position - b.position)
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (offer.status === 'sent') await markOfferViewedAction(token)

  const accent = offer.brand_color ?? providerProfile?.offer_brand_color ?? '#6366f1'
  const isDraft = offer.status === 'draft'
  const isExpired = offer.valid_until && new Date(offer.valid_until) < new Date()
  const canAct = ['sent', 'viewed'].includes(offer.status) && !isExpired

  // Group items by category
  const grouped = sortedItems.reduce<Record<string, typeof sortedItems>>((acc, item) => {
    const cat = (item as OfferItem & { category?: string }).category || ''
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
  const hasCategories = Object.keys(grouped).some(k => k !== '')

  const providerName = providerProfile?.company_name ?? providerProfile?.full_name ?? 'Freelancer'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── Draft banner ── */}
        {isDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-amber-800 font-medium">Preview draft — această ofertă nu a fost trimisă clientului încă.</span>
          </div>
        )}

        {/* ── Hero / Branded header card ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">

          {/* Colored header with logo + number */}
          <div className="px-8 py-6 flex items-center justify-between gap-4" style={{ backgroundColor: accent }}>
            {/* Provider logo + name */}
            <div className="flex items-center gap-4 min-w-0">
              {providerProfile?.logo_url ? (
                <img
                  src={providerProfile.logo_url}
                  alt={providerName}
                  className="h-12 w-auto max-w-36 object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              ) : (
                <div>
                  <p className="text-xl font-black text-white tracking-tight leading-none">{providerName}</p>
                </div>
              )}
            </div>

            {/* Offer number + date */}
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-white tracking-tight leading-none">{offer.number}</p>
              <p className="text-xs text-white/70 mt-1">
                {new Date(offer.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* DE LA / CĂTRE section */}
          <div className="grid grid-cols-2 gap-0 border-b border-slate-100">
            <div className="px-8 py-5 border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">De la</p>
              <p className="font-bold text-slate-900 text-sm">{providerName}</p>
              {providerProfile?.company_email && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {providerProfile.company_email}
                </p>
              )}
              {providerProfile?.company_phone && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  {providerProfile.company_phone}
                </p>
              )}
            </div>
            <div className="px-8 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Către</p>
              {offer.client ? (
                <>
                  <div className="flex items-center gap-2.5">
                    {offer.client.logo_url ? (
                      <img src={offer.client.logo_url} alt={offer.client.name}
                        className="h-7 w-auto max-w-20 object-contain" />
                    ) : null}
                    <p className="font-bold text-slate-900 text-sm">{offer.client.name}</p>
                  </div>
                  {offer.client.company && (
                    <p className="text-xs text-slate-500 mt-1">{offer.client.company}</p>
                  )}
                  {offer.client.email && (
                    <p className="text-xs text-slate-400 mt-0.5">{offer.client.email}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Fără client asociat</p>
              )}
            </div>
          </div>

          {/* Offer meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Titlu ofertă</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{offer.title ?? offer.number}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                offer.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                offer.status === 'rejected' ? 'bg-red-50 text-red-600' :
                offer.status === 'draft'    ? 'bg-amber-50 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {offer.status === 'accepted' ? 'Acceptată' :
                 offer.status === 'rejected' ? 'Refuzată' :
                 offer.status === 'draft' ? 'Draft' :
                 offer.status === 'sent' ? 'Trimisă' : 'Văzută'}
              </span>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Valabilă până la</p>
              {offer.valid_until ? (
                <p className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                  {new Date(offer.valid_until).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Monedă</p>
              <p className="text-sm font-semibold text-slate-800">{offer.currency}</p>
            </div>
          </div>

          {/* Intro text */}
          {offer.intro_text && (
            <div className="px-8 py-6 border-b border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{offer.intro_text}</p>
            </div>
          )}
        </div>

        {/* ── Items card ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Servicii incluse</h2>
            <span className="text-sm font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${accent}18`, color: accent }}>
              {sortedItems.length} {sortedItems.length === 1 ? 'serviciu' : 'servicii'}
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            {(hasCategories
              ? Object.entries(grouped)
              : [['', sortedItems]] as [string, typeof sortedItems][]
            ).map(([cat, catItems]) => (
              <div key={cat}>
                {hasCategories && cat && (
                  <div className="px-8 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{cat}</span>
                  </div>
                )}
                {(catItems as typeof sortedItems).map((item, i) => {
                  const itemAny = item as OfferItem & { category?: string; deliverables?: string; timeline?: string }
                  return (
                    <div key={item.id} className="px-8 py-6">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: accent }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-bold text-slate-900 text-base leading-snug">{item.title}</h3>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-slate-900 text-base">{fmt(item.total)} {offer.currency}</div>
                              {item.type === 'hourly' && (
                                <div className="text-xs text-slate-400">{item.quantity}h × {fmt(item.unit_price)}/h</div>
                              )}
                              {item.type === 'fix' && item.quantity > 1 && (
                                <div className="text-xs text-slate-400">{item.quantity} × {fmt(item.unit_price)}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${accent}15`, color: accent }}>
                              {item.type === 'fix' && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                </svg>
                              )}
                              {item.type === 'hourly' && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              {TYPE_LABELS[item.type] ?? item.type}
                            </span>
                            {itemAny.timeline && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {itemAny.timeline}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-sm text-slate-500 leading-relaxed mb-3">{item.description}</p>
                          )}

                          {itemAny.deliverables && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
                                Livrabile incluse
                              </p>
                              <ul className="space-y-1.5">
                                {itemAny.deliverables.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100">
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-medium text-slate-700">{fmt(offer.subtotal)} {offer.currency}</span>
              </div>
              {offer.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">−{fmt(offer.discount_amount)} {offer.currency}</span>
                </div>
              )}
              {offer.tax_rate > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>TVA ({offer.tax_rate}%)</span>
                  <span className="font-medium text-slate-700">{fmt(offer.tax_amount)} {offer.currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold pt-3 border-t border-slate-200"
                style={{ color: accent }}>
                <span>TOTAL</span>
                <span>{fmt(offer.total)} {offer.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Financial & project details ── */}
        {(offer.payment_conditions || offer.project_start_date || offer.revisions_included != null) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-6">
            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide" style={{ color: accent }}>
              Sumar Financiar & Detalii Proiect
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {offer.payment_conditions && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Condiții de plată</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{offer.payment_conditions}</p>
                </div>
              )}
              {offer.project_start_date && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Data de start</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(offer.project_start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              {offer.revisions_included != null && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Revizii incluse</p>
                  <p className="text-2xl font-bold" style={{ color: accent }}>{offer.revisions_included}</p>
                  <p className="text-xs text-slate-400 mt-0.5">runde de revizii</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Terms ── */}
        {offer.terms_text && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Termeni & condiții
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{offer.terms_text}</p>
          </div>
        )}

        {/* ── Status banners ── */}
        {offer.status === 'accepted' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-800 mb-1">Ofertă acceptată</h2>
            <p className="text-emerald-600 text-sm">
              {offer.accepted_at && `Acceptată pe ${new Date(offer.accepted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
              {' '}Vă vom contacta în curând pentru a demara colaborarea.
            </p>
          </div>
        )}

        {offer.status === 'rejected' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold text-slate-600 mb-1">Ofertă refuzată</h2>
            <p className="text-slate-400 text-sm">Mulțumim pentru feedback.</p>
          </div>
        )}

        {isExpired && !canAct && !['accepted', 'rejected'].includes(offer.status) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold text-amber-800 mb-1">Ofertă expirată</h2>
            <p className="text-amber-600 text-sm">Perioada de valabilitate a acestei oferte a expirat. Contactați-ne pentru o propunere actualizată.</p>
          </div>
        )}

        {canAct && <PublicOfferActions token={token} accentColor={accent} />}

        {/* Footer */}
        <div className="text-center pt-2 pb-6 text-xs text-slate-300">
          Ofertă generată cu <span className="font-semibold text-slate-400">Freelio</span>
        </div>
      </div>
    </div>
  )
}
