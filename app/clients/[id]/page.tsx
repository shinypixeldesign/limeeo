import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Client, Project } from '@/types/database'
import DeleteClientButton from '@/components/clients/DeleteClientButton'

function statusLabel(status: Client['status']) {
  const map = {
    active: { label: 'Activ', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    prospect: { label: 'Prospect', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
    inactive: { label: 'Inactiv', class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  }
  return map[status] ?? map.active
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">Health Score</span>
        <span className="text-sm font-bold text-slate-900">{score}/100</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function projectStatusLabel(status: Project['status']) {
  const map = {
    draft: { label: 'Draft', class: 'bg-slate-100 text-slate-600' },
    active: { label: 'Activ', class: 'bg-emerald-50 text-emerald-700' },
    paused: { label: 'Pauză', class: 'bg-amber-50 text-amber-700' },
    completed: { label: 'Finalizat', class: 'bg-blue-50 text-blue-700' },
    cancelled: { label: 'Anulat', class: 'bg-red-50 text-red-700' },
  }
  return map[status] ?? map.draft
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientRes, projectsRes, offersRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('projects').select('*').eq('client_id', id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('offers').select('id,number,title,status,total,currency,created_at').eq('client_id', id).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id,number,status,total,currency,issue_date').eq('client_id', id).eq('user_id', user!.id).eq('type', 'invoice').order('created_at', { ascending: false }).limit(5),
  ])

  if (!clientRes.data) notFound()

  const client = clientRes.data as Client
  const projects = (projectsRes.data ?? []) as Project[]
  const offers = offersRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const status = statusLabel(client.status)

  const offerStatusConfig: Record<string, { label: string; cls: string }> = {
    draft:    { label: 'Draft',     cls: 'bg-slate-100 text-slate-500' },
    sent:     { label: 'Trimisă',   cls: 'bg-blue-50 text-blue-700' },
    viewed:   { label: 'Văzută',    cls: 'bg-amber-50 text-amber-700' },
    accepted: { label: 'Acceptată', cls: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Refuzată',  cls: 'bg-red-50 text-red-700' },
  }
  const invoiceStatusConfig: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'Draft',    cls: 'bg-slate-100 text-slate-500' },
    sent:      { label: 'Trimisă',  cls: 'bg-blue-50 text-blue-700' },
    paid:      { label: 'Plătită',  cls: 'bg-emerald-50 text-emerald-700' },
    overdue:   { label: 'Restantă', cls: 'bg-red-50 text-red-700' },
    cancelled: { label: 'Anulată',  cls: 'bg-slate-100 text-slate-400' },
  }
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-8">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Clienți</p>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{client.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editează
          </Link>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coloana stânga: info client */}
        <div className="space-y-5">
          {/* Card info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            {/* Avatar + status */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={`Logo ${client.name}`} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">
                    {client.name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{client.name}</p>
                {client.company && <p className="text-sm text-slate-500">{client.company}</p>}
                <span className={`inline-flex mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 ring-inset ${status.class}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Health score */}
            <HealthBar score={client.health_score} />

            {/* Detalii contact */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              {client.email && (
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${client.email}`} className="text-sm text-indigo-600 hover:underline truncate">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${client.phone}`} className="text-sm text-slate-700 hover:text-indigo-600">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Data adăugare */}
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
              Adăugat pe {new Date(client.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Note */}
          {client.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Note</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Coloana dreapta: proiecte + oferte + facturi */}
        <div className="lg:col-span-2 space-y-5">

          {/* Proiecte */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Proiecte</h2>
              <Link href={`/projects/new?client=${client.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                + Proiect nou
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">Niciun proiect pentru acest client.</p>
                <Link href={`/projects/new?client=${client.id}`} className="inline-flex mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Adaugă primul proiect →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projects.map((project) => {
                  const ps = projectStatusLabel(project.status)
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition group">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition truncate">{project.name}</p>
                        {project.deadline && (
                          <p className="text-xs text-slate-400 mt-0.5">Deadline: {new Date(project.deadline).toLocaleDateString('ro-RO')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {project.budget && (
                          <span className="text-sm font-medium text-slate-600">{project.budget.toLocaleString('ro-RO')} {project.currency}</span>
                        )}
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ps.class}`}>{ps.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Oferte */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Oferte</h2>
              <Link href={`/offers/new`} className="text-xs font-medium text-violet-600 hover:text-violet-700">
                + Ofertă nouă
              </Link>
            </div>
            {offers.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">Nicio ofertă pentru acest client.</p>
                <Link href="/offers/new" className="inline-flex mt-2 text-xs font-medium text-violet-600 hover:text-violet-700">
                  Creează ofertă →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {offers.map((offer) => {
                  const os = offerStatusConfig[offer.status] ?? offerStatusConfig.draft
                  return (
                    <Link key={offer.id} href={`/offers/${offer.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 font-mono">{offer.number}</span>
                          {offer.title && <span className="text-sm text-slate-500 truncate max-w-36">{offer.title}</span>}
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${os.cls}`}>{os.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(offer.created_at).toLocaleDateString('ro-RO')}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">{fmt(offer.total)} {offer.currency}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Facturi */}
          {invoices.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Facturi</h2>
                <Link href="/financials" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Vezi toate →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const is = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft
                  return (
                    <Link key={inv.id} href={`/financials/${inv.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 font-mono">{inv.number}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${is.cls}`}>{is.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(inv.issue_date).toLocaleDateString('ro-RO')}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">{fmt(inv.total)} {inv.currency}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
