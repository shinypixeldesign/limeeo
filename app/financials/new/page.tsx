import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InvoiceForm from '@/components/financials/InvoiceForm'
import { createInvoiceAction } from '@/app/actions/financials'
import type { Client, Project } from '@/types/database'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from_offer?: string }>
}) {
  const { type, from_offer } = await searchParams
  const docType = type === 'offer' ? 'offer' : 'invoice'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientsRes, projectsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('projects').select('*').eq('user_id', user!.id).order('name'),
  ])

  const clients = (clientsRes.data ?? []) as Client[]
  const projects = (projectsRes.data ?? []) as Project[]

  // Fetch offer data for prefill if from_offer is present
  let offerPrefill: {
    number?: string
    clientId?: string
    projectId?: string
    currency?: string
    taxRate?: string
    items?: Array<{ description: string; quantity: string; unit_price: string }>
  } | null = null

  if (from_offer) {
    const { data: offer } = await supabase
      .from('offers')
      .select('*, offer_items(*)')
      .eq('id', from_offer)
      .eq('user_id', user!.id)
      .single()

    if (offer) {
      const sortedItems = [...(offer.offer_items ?? [])].sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      )
      offerPrefill = {
        number: offer.number,
        clientId: offer.client_id ?? undefined,
        projectId: offer.project_id ?? undefined,
        currency: offer.currency ?? undefined,
        taxRate: offer.tax_rate != null ? String(offer.tax_rate) : undefined,
        items: sortedItems.map((item: { title: string; quantity: number; unit_price: number }) => ({
          description: item.title,
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
        })),
      }
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/financials"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {docType === 'invoice' ? 'Factură nouă' : 'Ofertă nouă'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Completează detaliile documentului</p>
        </div>
      </div>

      {offerPrefill && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          Factură creată din oferta{offerPrefill.number ? ` ${offerPrefill.number}` : ''}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <InvoiceForm
          action={createInvoiceAction}
          clients={clients}
          projects={projects}
          defaultType={docType as 'invoice' | 'offer'}
          cancelHref="/financials"
          prefillItems={offerPrefill?.items}
          prefillClientId={offerPrefill?.clientId}
          prefillProjectId={offerPrefill?.projectId}
          prefillCurrency={offerPrefill?.currency}
          prefillTaxRate={offerPrefill?.taxRate}
        />
      </div>
    </div>
  )
}
