import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OfferForm from '@/components/offers/OfferForm'
import { updateOfferAction } from '@/app/actions/offers'
import type { Offer, OfferItem, Client, Project, OfferPackage } from '@/types/database'

type FullOffer = Offer & { offer_items: OfferItem[] }

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [offerRes, clientsRes, projectsRes, packagesRes] = await Promise.all([
    supabase.from('offers').select('*, offer_items(*)').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('projects').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('offer_packages').select('*').eq('user_id', user!.id).order('updated_at', { ascending: false }),
  ])

  if (!offerRes.data) notFound()

  const offer = offerRes.data as FullOffer

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-8 h-14 max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm min-w-0">
            <Link href="/offers" className="text-slate-400 hover:text-slate-600 transition shrink-0">Oferte</Link>
            <span className="text-slate-200">/</span>
            <span className="font-mono text-xs text-slate-400 shrink-0">{offer.number}</span>
            {offer.title && (
              <>
                <span className="text-slate-200">/</span>
                <span className="text-slate-600 font-medium truncate">{offer.title}</span>
              </>
            )}
            <span className="text-xs text-slate-300 ml-2 hidden md:block shrink-0">
              · Modificat {new Date(offer.updated_at).toLocaleDateString('ro-RO')}
            </span>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/o/${offer.token}`} target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </Link>
            <Link href={`/offers/${id}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
              Anulează
            </Link>
            <button type="submit" form="offer-form"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Salvează
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        <OfferForm
          action={updateOfferAction}
          offer={offer}
          clients={(clientsRes.data ?? []) as Client[]}
          projects={(projectsRes.data ?? []) as Project[]}
          cancelHref={`/offers/${id}`}
          formId="offer-form"
          packages={(packagesRes.data ?? []) as OfferPackage[]}
        />
      </div>
    </div>
  )
}
