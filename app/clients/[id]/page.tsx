import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, Phone, Plus, Globe, MapPin, Building2, Hash, TrendingUp, DollarSign, FolderOpen, FileText, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Client, Project } from '@/types/database'
import DeleteClientButton from '@/components/clients/DeleteClientButton'

function getAvatarGradient(name: string) {
  const gradients = [
    'from-violet-400 to-purple-600',
    'from-blue-400 to-cyan-600',
    'from-emerald-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-pink-400 to-rose-600',
    'from-amber-400 to-yellow-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  }
  return gradients[hash % gradients.length]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

const statusConfig = {
  active:   { label: 'Activ',    dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  prospect: { label: 'Prospect', dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  inactive: { label: 'Inactiv',  dot: 'bg-slate-400',  bg: 'bg-slate-100', text: 'text-slate-600' },
}

const projectStatusConfig = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600' },
  active:    { label: 'Activ',     cls: 'bg-emerald-50 text-emerald-700' },
  paused:    { label: 'Pauză',     cls: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Finalizat', cls: 'bg-blue-50 text-blue-700' },
  cancelled: { label: 'Anulat',    cls: 'bg-red-50 text-red-700' },
}

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

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientRes, projectsRes, offersRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('projects').select('*').eq('client_id', id).eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('offers').select('id,number,title,status,total,currency,created_at').eq('client_id', id).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id,number,status,total,currency,issue_date').eq('client_id', id).eq('user_id', user!.id).eq('type', 'invoice').order('created_at', { ascending: false }),
  ])

  if (!clientRes.data) notFound()

  const client = clientRes.data as Client
  const projects = (projectsRes.data ?? []) as Project[]
  const offers = offersRes.data ?? []
  const allInvoices = invoicesRes.data ?? []
  const invoices = allInvoices.slice(0, 5)

  const st = statusConfig[client.status] ?? statusConfig.active
  const gradient = getAvatarGradient(client.name)

  // Financial calculations
  const totalBilled = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const outstanding = allInvoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)
  const pendingCount = allInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length
  const defaultCurrency = allInvoices[0]?.currency ?? 'RON'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm hover:shadow transition text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-gray-500">Clienți</p>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{client.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeleteClientButton clientId={client.id} clientName={client.name} />
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-900 font-semibold rounded-full transition-all shadow-sm hover:shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editează
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coloana stânga */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-[24px] flex items-center justify-center mb-6 overflow-hidden`}
                style={client.logo_url ? {} : undefined}>
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo_url} alt={`Logo ${client.name}`} className="w-full h-full object-contain" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">{getInitials(client.name)}</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">{client.name}</h2>
              {client.company && <p className="text-sm text-gray-500 mb-3">{client.company}</p>}

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${st.bg} rounded-full mb-6`}>
                <div className={`w-2 h-2 ${st.dot} rounded-full`} />
                <span className={`text-sm font-medium ${st.text}`}>{st.label}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mb-8">
                {client.email && (
                  <a href={`mailto:${client.email}`}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <Mail size={20} className="text-gray-600" />
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <Phone size={20} className="text-gray-600" />
                  </a>
                )}
                <Link href={`/projects/new?client=${client.id}`}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <Plus size={20} className="text-gray-600" />
                </Link>
              </div>

              {/* Health bar */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Client Health</span>
                  <span className="text-sm font-bold text-gray-900">{client.health_score}/100</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#acff55] to-green-500"
                    style={{ width: `${client.health_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-white rounded-[28px] p-6 shadow-lg shadow-black/5">
            <h3 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wide">Informații Contact</h3>
            <div className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-gray-600" />
                  </div>
                  <a href={`mailto:${client.email}`} className="text-sm text-gray-700 hover:text-[#acff55] transition truncate">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-gray-600" />
                  </div>
                  <a href={`tel:${client.phone}`} className="text-sm text-gray-700 hover:text-[#acff55] transition">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Globe size={16} className="text-gray-600" />
                  </div>
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-[#acff55] transition truncate">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {(client.city || client.county) && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">{[client.city, client.county].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {client.cui && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Hash size={16} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">{client.cui}</span>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">{client.company}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100">
              Adăugat {new Date(client.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Note */}
          {client.notes && (
            <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5">
              <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Note</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Coloana dreapta (2 coloane) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Financial Overview */}
          <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-black/5">
            <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Sumar Financiar</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <DollarSign size={20} className="text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Total Facturat</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{fmt(totalBilled)}</p>
                <p className="text-sm text-gray-500 mt-1">{defaultCurrency} · {allInvoices.length} {allInvoices.length === 1 ? 'factură' : 'facturi'}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <TrendingUp size={20} className="text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">De Încasat</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{fmt(outstanding)}</p>
                <p className="text-sm text-gray-500 mt-1">{pendingCount} {pendingCount === 1 ? 'factură' : 'facturi'} în așteptare</p>
              </div>
            </div>
          </div>

          {/* Proiecte */}
          <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Proiecte</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{projects.length}</span>
              </div>
              <Link href={`/projects/new?client=${client.id}`}
                className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition">
                + Proiect nou
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 rounded-[14px] bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen size={22} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 mb-2">Niciun proiect pentru acest client</p>
                <Link href={`/projects/new?client=${client.id}`}
                  className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition">
                  Adaugă primul proiect →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {projects.map((project) => {
                  const ps = projectStatusConfig[project.status] ?? projectStatusConfig.draft
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition group">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 group-hover:text-black transition truncate">{project.name}</p>
                        {project.deadline && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Deadline: {new Date(project.deadline).toLocaleDateString('ro-RO')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {project.budget && (
                          <span className="text-sm font-semibold text-gray-700">
                            {project.budget.toLocaleString('ro-RO')} {project.currency}
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ps.cls}`}>{ps.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Oferte */}
          <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Oferte</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{offers.length}</span>
              </div>
              <Link href="/offers/new" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition">
                + Ofertă nouă
              </Link>
            </div>
            {offers.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 rounded-[14px] bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText size={22} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 mb-2">Nicio ofertă pentru acest client</p>
                <Link href="/offers/new" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition">
                  Creează ofertă →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {offers.map((offer) => {
                  const os = offerStatusConfig[offer.status] ?? offerStatusConfig.draft
                  return (
                    <Link key={offer.id} href={`/offers/${offer.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 font-mono">{offer.number}</span>
                          {offer.title && <span className="text-sm text-gray-500 truncate max-w-40">{offer.title}</span>}
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${os.cls}`}>{os.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(offer.created_at).toLocaleDateString('ro-RO')}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-700 shrink-0">{fmt(offer.total)} {offer.currency}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Facturi */}
          {allInvoices.length > 0 && (
            <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Facturi</h2>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{allInvoices.length}</span>
                </div>
                <Link href="/financials" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition">
                  Vezi toate →
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const is = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft
                  return (
                    <Link key={inv.id} href={`/financials/${inv.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 font-mono">{inv.number}</span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${is.cls}`}>{is.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.issue_date).toLocaleDateString('ro-RO')}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-700 shrink-0">{fmt(inv.total)} {inv.currency}</span>
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
