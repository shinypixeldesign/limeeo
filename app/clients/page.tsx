import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/database'

function statusLabel(status: Client['status']) {
  const map = {
    active: { label: 'Activ', class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    prospect: { label: 'Prospect', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
    inactive: { label: 'Inactiv', class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  }
  return map[status] ?? map.active
}

function HealthScore({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
  const bg = score >= 70 ? 'bg-emerald-50' : score >= 40 ? 'bg-amber-50' : 'bg-red-50'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}
    </span>
  )
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientsRes, profileRes] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').eq('id', user!.id).single(),
  ])

  const clients = (clientsRes.data ?? []) as Client[]
  const plan = profileRes.data?.plan ?? 'free'
  const atFreeLimit = plan === 'free' && clients.length >= 3

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clienți</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clienți'}
            {plan === 'free' && (
              <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {clients.length}/3 plan Free
              </span>
            )}
          </p>
        </div>
        {atFreeLimit ? (
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Limita planului Free atinsă</p>
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
            >
              Upgrade la Solo
            </Link>
          </div>
        ) : (
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adaugă client
          </Link>
        )}
      </div>

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Niciun client încă</h2>
          <p className="text-slate-500 text-sm mb-6">Adaugă primul tău client pentru a începe.</p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adaugă primul client
          </Link>
        </div>
      )}

      {/* Tabel clienți */}
      {clients.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Health</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => {
                const status = statusLabel(client.status)
                return (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
                          {client.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={client.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-sm font-bold text-indigo-600">{client.name[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{client.name}</p>
                          {client.company && (
                            <p className="text-xs text-slate-500 mt-0.5">{client.company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {client.email && <p className="text-slate-600">{client.email}</p>}
                        {client.phone && <p className="text-xs text-slate-400">{client.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <HealthScore score={client.health_score} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/clients/${client.id}`}
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
