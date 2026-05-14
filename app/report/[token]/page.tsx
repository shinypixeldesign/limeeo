import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60), m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtMoney(n: number, currency = 'RON') {
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency
}

interface ReportData {
  stats: {
    totalMins: number; billMins: number; billValue: number
    activeDays: number; avgMins: number; billRatio: number
  }
  byClient: { name: string; mins: number; billMins: number; value: number }[]
  byProject: { name: string; mins: number; value: number; clientName: string }[]
  entries: {
    id: string; description: string | null; started_at: string; ended_at: string | null
    duration_minutes: number | null; hourly_rate: number; currency: string
    is_billable: boolean
    client: { name: string } | null
    project: { name: string } | null
  }[]
  defaultCurrency: string
}

const CLIENT_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4']

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: share } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single()

  if (!share) notFound()

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link expirat</h1>
          <p className="text-slate-500 text-sm">Acest raport nu mai este disponibil.</p>
        </div>
      </div>
    )
  }

  const d = share.data as ReportData
  const { stats, byClient, byProject, entries, defaultCurrency } = d
  const maxClientMins = Math.max(...byClient.map(c => c.mins), 1)

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-semibold tracking-wide uppercase mb-1">Freelio</p>
              <h1 className="text-3xl font-extrabold mb-1">Raport Pontaj</h1>
              <p className="text-indigo-200 text-sm">
                Perioadă: <strong className="text-white">{share.period_label}</strong>
                {share.client_name && <> · Client: <strong className="text-white">{share.client_name}</strong></>}
              </p>
              <p className="text-indigo-300 text-xs mt-1">
                Generat: {new Date(share.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-4xl font-black tabular-nums">{fmtDuration(stats.totalMins)}</p>
              <p className="text-indigo-200 text-sm">total ore</p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total ore', value: fmtDuration(stats.totalMins), sub: `${stats.activeDays} zile active`, color: 'text-slate-900' },
            { label: 'Ore facturabile', value: fmtDuration(stats.billMins), sub: `${stats.billRatio.toFixed(0)}% din total`, color: 'text-indigo-600' },
            { label: 'Venit estimat', value: fmtMoney(stats.billValue, defaultCurrency), sub: '', color: 'text-emerald-600' },
            { label: 'Medie / zi activă', value: fmtDuration(Math.round(stats.avgMins)), sub: 'pe zilele cu pontaj', color: 'text-slate-900' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Billable ratio */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Rată de facturare</h2>
            <span className="text-sm font-bold text-indigo-600">{stats.billRatio.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${stats.billRatio}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span className="text-indigo-600 font-medium">{fmtDuration(stats.billMins)} facturabile</span>
            <span>{fmtDuration(stats.totalMins - stats.billMins)} non-facturabile</span>
          </div>
        </div>

        {/* Per client */}
        {byClient.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-5">Per client</h2>
            <div className="space-y-5">
              {byClient.map((c, i) => {
                const pct = stats.totalMins > 0 ? (c.mins / stats.totalMins) * 100 : 0
                const color = CLIENT_COLORS[i % CLIENT_COLORS.length]
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-slate-800">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-semibold tabular-nums">{fmtDuration(c.mins)}</span>
                        {c.value > 0 && <span className="text-indigo-600 font-bold">{fmtMoney(c.value, defaultCurrency)}</span>}
                        <span className="w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.mins / maxClientMins) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per project */}
        {byProject.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-5">Per proiect</h2>
            <div className="space-y-4">
              {byProject.map((p, i) => {
                const pct = stats.totalMins > 0 ? (p.mins / stats.totalMins) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm text-slate-800 font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{p.clientName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-semibold tabular-nums">{fmtDuration(p.mins)}</span>
                        {p.value > 0 && <span className="text-violet-600 font-bold">{fmtMoney(p.value, defaultCurrency)}</span>}
                        <span className="w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Entries table */}
        {entries.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Înregistrări ({entries.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {entries.map(e => {
                const value = (e.duration_minutes ?? 0) / 60 * e.hourly_rate
                return (
                  <div key={e.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className={`w-1 h-10 rounded-full shrink-0 ${e.is_billable ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {e.description ?? <span className="text-slate-400 italic">fără descriere</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {e.client?.name && <>{e.client.name}{e.project?.name && ' › '}</>}
                        {e.project?.name}
                        {' · '}
                        {new Date(e.started_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(e.started_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        {e.ended_at && <> → {new Date(e.ended_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-700 tabular-nums">{fmtDuration(e.duration_minutes)}</p>
                      {value > 0 && <p className="text-xs text-indigo-600">{fmtMoney(value, e.currency)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Raport generat cu <strong className="text-indigo-600">Freelio</strong> · Valid până la {new Date(share.expires_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
