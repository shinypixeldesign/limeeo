'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Offer, Client } from '@/types/database'

type OfferWithClient = Offer & { client: Pick<Client, 'id' | 'name' | 'logo_url'> | null }

const STATUS_CFG = {
  draft:    { label: 'Draft',     cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  sent:     { label: 'Trimisă',   cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  viewed:   { label: 'Văzută',    cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Acceptată', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Refuzată',  cls: 'bg-red-50 text-red-700 ring-red-200' },
}

const MONTHS_SHORT = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']

type StatusFilter = 'all' | Offer['status']

const STAT_ICONS = {
  emerald: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  amber: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  violet: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  slate: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
}

const STAT_BG = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  violet:  'bg-violet-50 text-violet-600',
  slate:   'bg-slate-100 text-slate-600',
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'emerald' | 'amber' | 'violet' | 'slate' }) {
  const textColors = { emerald: 'text-emerald-600', amber: 'text-amber-600', violet: 'text-violet-600', slate: 'text-slate-800' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${STAT_BG[accent]}`}>
          {STAT_ICONS[accent]}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${textColors[accent]}`}>{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export default function OffersDashboard({ offers }: { offers: OfferWithClient[] }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const years = useMemo(() => {
    const ys = new Set(offers.map(o => new Date(o.created_at).getFullYear()))
    ys.add(currentYear)
    return Array.from(ys).sort((a, b) => b - a)
  }, [offers, currentYear])

  const yearOffers = useMemo(
    () => offers.filter(o => new Date(o.created_at).getFullYear() === year),
    [offers, year]
  )

  const stats = useMemo(() => {
    const accepted = yearOffers.filter(o => o.status === 'accepted')
    const pending  = yearOffers.filter(o => ['sent','viewed'].includes(o.status))
    const decided  = yearOffers.filter(o => ['accepted','rejected'].includes(o.status))

    // Grupăm valorile pe valută
    const revenueByCurrency: Record<string, number> = {}
    accepted.forEach(o => {
      const cur = o.currency ?? 'RON'
      revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + o.total
    })
    const pendingByCurrency: Record<string, number> = {}
    pending.forEach(o => {
      const cur = o.currency ?? 'RON'
      pendingByCurrency[cur] = (pendingByCurrency[cur] ?? 0) + o.total
    })

    return {
      revenueByCurrency,
      pendingByCurrency,
      convRate:      decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0,
      acceptedCount: accepted.length,
      pendingCount:  pending.length,
      rejectedCount: yearOffers.filter(o => o.status === 'rejected').length,
      draftCount:    yearOffers.filter(o => o.status === 'draft').length,
      viewedCount:   yearOffers.filter(o => ['viewed','accepted','rejected'].includes(o.status)).length,
      totalCount:    yearOffers.length,
    }
  }, [yearOffers])

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ label: MONTHS_SHORT[i], accepted: 0, pending: 0 }))
    yearOffers.forEach(o => {
      const m = new Date(o.created_at).getMonth()
      if (o.status === 'accepted') months[m].accepted += o.total
      else if (['sent','viewed'].includes(o.status)) months[m].pending += o.total
    })
    return months
  }, [yearOffers])

  const maxMonthVal = Math.max(...monthlyData.map(m => m.accepted + m.pending), 1)

  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; byCurrency: Record<string, number>; count: number }>()
    yearOffers.filter(o => o.status === 'accepted' && o.client).forEach(o => {
      const key = o.client!.id
      const cur = map.get(key) ?? { name: o.client!.name, byCurrency: {}, count: 0 }
      const currency = o.currency ?? 'RON'
      cur.byCurrency[currency] = (cur.byCurrency[currency] ?? 0) + o.total
      map.set(key, { ...cur, count: cur.count + 1 })
    })
    // Sortăm după valoarea totală (sum across all currencies, for ranking)
    return Array.from(map.values())
      .sort((a, b) => Object.values(b.byCurrency).reduce((s, v) => s + v, 0) - Object.values(a.byCurrency).reduce((s, v) => s + v, 0))
      .slice(0, 5)
  }, [yearOffers])

  const recentActivity = useMemo(
    () => [...offers].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8),
    [offers]
  )

  const filteredOffers = useMemo(
    () => statusFilter === 'all' ? offers : offers.filter(o => o.status === statusFilter),
    [offers, statusFilter]
  )

  const fmt  = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtD = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })

  // Formatează un map { EUR: 1500, RON: 782 } → "1.500 EUR · 782 RON"
  const fmtCurrencyMap = (map: Record<string, number>) => {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return '0 RON'
    return entries.map(([cur, val]) => `${fmt(val)} ${cur}`).join(' · ')
  }

  const funnelRows = [
    { label: 'Total create',     count: stats.totalCount    },
    { label: 'Trimise clienți',  count: stats.totalCount - stats.draftCount },
    { label: 'Vizualizate',      count: stats.viewedCount   },
    { label: 'Acceptate ✓',     count: stats.acceptedCount },
  ]

  const TAB_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'Toate' },
    { key: 'draft',    label: 'Draft' },
    { key: 'sent',     label: 'Trimise' },
    { key: 'viewed',   label: 'Văzute' },
    { key: 'accepted', label: 'Acceptate' },
    { key: 'rejected', label: 'Refuzate' },
  ]

  return (
    <div className="p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Oferte</h1>
          <p className="text-slate-500 text-sm mt-0.5">{offers.length} oferte totale</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Link href="/offers/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            title="Setări oferte">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Setări
          </Link>
          <Link href="/offers/packages"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Pachete
          </Link>
          <Link href="/offers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ofertă nouă
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Venituri acceptate" value={fmtCurrencyMap(stats.revenueByCurrency)}
          sub={`${stats.acceptedCount} oferte acceptate`} accent="emerald" />
        <StatCard label="În așteptare" value={fmtCurrencyMap(stats.pendingByCurrency)}
          sub={`${stats.pendingCount} oferte active`} accent="amber" />
        <StatCard label="Rată conversie" value={`${stats.convRate}%`}
          sub={`${stats.acceptedCount} din ${stats.acceptedCount + stats.rejectedCount} decise`} accent="violet" />
        <StatCard label={`Total ${year}`} value={String(stats.totalCount)}
          sub={`${stats.draftCount} draft · ${stats.rejectedCount} refuzate`} accent="slate" />
      </div>

      {/* ── Chart + Funnel + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-700">Venituri lunare {year}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Acceptate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" />
                În așteptare
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-44">
            {monthlyData.map((m, i) => {
              const aH = maxMonthVal > 0 ? Math.max(Math.round((m.accepted / maxMonthVal) * 136), m.accepted > 0 ? 4 : 0) : 0
              const pH = maxMonthVal > 0 ? Math.max(Math.round((m.pending  / maxMonthVal) * 136), m.pending  > 0 ? 4 : 0) : 0
              const hasData = m.accepted > 0 || m.pending > 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 relative group">
                  <div className="w-full flex flex-col justify-end" style={{ height: 136 }}>
                    {m.pending > 0 && (
                      <div className="w-full rounded-t-sm bg-amber-300" style={{ height: pH }} />
                    )}
                    {m.accepted > 0 && (
                      <div className={`w-full bg-emerald-500 ${m.pending === 0 ? 'rounded-t-sm' : ''}`}
                        style={{ height: aH }} />
                    )}
                    {!hasData && <div className="w-full bg-slate-100 rounded-sm" style={{ height: 4 }} />}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
                  {hasData && (
                    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-lg">
                      {m.accepted > 0 && <div className="text-emerald-300">✓ {fmt(m.accepted)}</div>}
                      {m.pending  > 0 && <div className="text-amber-300">⏳ {fmt(m.pending)}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Funnel + Top clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Pâlnie oferte {year}</h2>
            <div className="space-y-3">
              {funnelRows.map((row, i) => {
                const pct = stats.totalCount > 0 ? Math.round((row.count / stats.totalCount) * 100) : 0
                const colors = ['bg-slate-300', 'bg-blue-400', 'bg-amber-400', 'bg-emerald-500']
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{row.label}</span>
                      <span className="text-slate-500 font-bold">{row.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full transition-all`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {topClients.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top clienți {year}</h3>
              <div className="space-y-2.5">
                {topClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">{fmtCurrencyMap(c.byCurrency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent activity ── */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Activitate recentă</h2>
            <span className="text-xs text-slate-400">{recentActivity.length} oferte</span>
          </div>
          <div className="divide-y divide-slate-50">
            {recentActivity.map(offer => {
              const sc = STATUS_CFG[offer.status]
              return (
                <Link key={offer.id} href={`/offers/${offer.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset shrink-0 ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-slate-400 mr-2">{offer.number}</span>
                      {offer.title && <span className="text-sm text-slate-700 truncate">{offer.title}</span>}
                      {offer.client && <span className="text-xs text-slate-400 ml-2">— {offer.client.name}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-slate-800">{fmtD(offer.total)} {offer.currency}</div>
                    <div className="text-xs text-slate-400">{fmtDate(offer.updated_at)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Full list ── */}
      {offers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Nicio ofertă încă</h2>
          <p className="text-slate-500 text-sm mb-6">Creează prima ofertă și trimite-o direct clientului.</p>
          <Link href="/offers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition">
            Creează prima ofertă
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Status tabs */}
          <div className="flex items-center border-b border-slate-100 overflow-x-auto px-2 pt-1">
            {TAB_FILTERS.map(tab => {
              const count = tab.key === 'all' ? offers.length : offers.filter(o => o.status === tab.key).length
              return (
                <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                    statusFilter === tab.key
                      ? 'border-violet-600 text-violet-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}>
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      statusFilter === tab.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                    }`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nr. / Titlu</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Client</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Creat</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Valabil până</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-6 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOffers.map(offer => {
                const sc = STATUS_CFG[offer.status]
                const isExpired = offer.valid_until && new Date(offer.valid_until) < new Date() && offer.status !== 'accepted'
                return (
                  <tr key={offer.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-400">{offer.number}</div>
                      {offer.title && (
                        <div className="text-sm font-medium text-slate-800 truncate max-w-52">{offer.title}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {offer.client
                        ? <span className="text-sm text-slate-600">{offer.client.name}</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-500">
                      {new Date(offer.created_at).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {offer.valid_until ? (
                        <span className={`text-sm ${isExpired ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                          {new Date(offer.valid_until).toLocaleDateString('ro-RO')}
                          {isExpired && ' ⚠'}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {fmtD(offer.total)} {offer.currency}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/offers/${offer.id}`}
                        className="text-xs font-medium text-violet-600 hover:text-violet-700 opacity-0 group-hover:opacity-100 transition">
                        Deschide →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filteredOffers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    Nicio ofertă cu statusul selectat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
