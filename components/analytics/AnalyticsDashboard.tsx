'use client'

interface MonthlyRevenue {
  month: string
  revenue: number
  label: string
}

interface OfferCounts {
  draft: number
  sent: number
  viewed: number
  accepted: number
  rejected: number
}

interface ClientStats {
  active: number
  prospect: number
  inactive: number
}

interface Props {
  monthlyRevenue: MonthlyRevenue[]
  totalRevenue: number
  revenueThisMonth: number
  revenueThisYear: number
  offerCounts: OfferCounts
  acceptanceRate: number
  avgResponseDays: number
  clientStats: ClientStats
}

const fmt = (n: number) =>
  n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function AnalyticsDashboard({
  monthlyRevenue,
  totalRevenue,
  revenueThisMonth,
  revenueThisYear,
  offerCounts,
  acceptanceRate,
  avgResponseDays,
  clientStats,
}: Props) {
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)

  const funnelRows = [
    { label: 'Draft', count: offerCounts.draft, color: 'bg-slate-400' },
    { label: 'Trimise', count: offerCounts.sent, color: 'bg-blue-500' },
    { label: 'Vizualizate', count: offerCounts.viewed, color: 'bg-amber-500' },
    { label: 'Acceptate', count: offerCounts.accepted, color: 'bg-emerald-500' },
    { label: 'Refuzate', count: offerCounts.rejected, color: 'bg-red-400' },
  ]
  const maxFunnel = Math.max(...funnelRows.map(r => r.count), 1)

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Statistici și performanță business</p>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Venituri total</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalRevenue)} RON</p>
          <p className="text-xs text-slate-400 mt-1">din facturi plătite</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Venituri luna aceasta</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(revenueThisMonth)} RON</p>
          <p className="text-xs text-slate-400 mt-1">luna curentă</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Rată acceptare oferte</p>
          <p className="text-2xl font-bold text-indigo-600">{acceptanceRate}%</p>
          <p className="text-xs text-slate-400 mt-1">
            {avgResponseDays > 0 ? `răspuns mediu: ${avgResponseDays} zile` : 'niciun răspuns încă'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clienți activi</p>
          <p className="text-2xl font-bold text-slate-900">{clientStats.active}</p>
          <p className="text-xs text-slate-400 mt-1">{clientStats.prospect} prospecți</p>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Revenue bar chart — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Venituri — ultimele 6 luni</h2>
          {monthlyRevenue.every(m => m.revenue === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Nicio factură plătită în ultimele 6 luni
            </div>
          ) : (
            <div className="w-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 600 200"
                className="w-full"
                style={{ height: '200px' }}
                aria-label="Grafic venituri lunare"
              >
                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 170 - ratio * 140
                  return (
                    <line
                      key={ratio}
                      x1="0"
                      y1={y}
                      x2="600"
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  )
                })}
                {monthlyRevenue.map((m, i) => {
                  const barWidth = 60
                  const gap = 40
                  const x = i * (barWidth + gap) + gap / 2
                  const barHeight = maxRevenue > 0 ? (m.revenue / maxRevenue) * 140 : 0
                  const y = 170 - barHeight
                  return (
                    <g key={m.month}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        ry="4"
                        fill="#6366f1"
                        opacity={m.revenue === 0 ? 0.2 : 1}
                      >
                        <title>{m.label}: {fmt(m.revenue)} RON</title>
                      </rect>
                      <text
                        x={x + barWidth / 2}
                        y="190"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="11"
                        fontFamily="inherit"
                      >
                        {m.label}
                      </text>
                      {m.revenue > 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fill="#6366f1"
                          fontSize="10"
                          fontFamily="inherit"
                          fontWeight="600"
                        >
                          {fmt(m.revenue)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Client health */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Sănătate clienți</h2>
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Activi</p>
              <p className="text-3xl font-bold text-emerald-700">{clientStats.active}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Prospecți</p>
              <p className="text-3xl font-bold text-amber-700">{clientStats.prospect}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Inactivi</p>
              <p className="text-3xl font-bold text-slate-600">{clientStats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Offers funnel ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Funnel oferte</h2>
        <p className="text-sm text-slate-400 mb-6">
          Total oferte: {offerCounts.draft + offerCounts.sent + offerCounts.viewed + offerCounts.accepted + offerCounts.rejected}
          {' · '}Acceptate: {offerCounts.accepted}
          {' · '}Rată conversie: {acceptanceRate}%
        </p>
        <div className="space-y-3">
          {funnelRows.map((row) => (
            <div key={row.label} className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600 w-24 shrink-0">{row.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color} transition-all duration-500`}
                  style={{ width: `${maxFunnel > 0 ? (row.count / maxFunnel) * 100 : 0}%`, minWidth: row.count > 0 ? '2rem' : '0' }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-8 text-right shrink-0">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Year summary ────────────────────────────────────────────────────── */}
      <div className="mt-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Rezumat anual</h2>
        <p className="text-slate-500 text-sm mb-4">Performanță {new Date().getFullYear()}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Venituri {new Date().getFullYear()}</p>
            <p className="text-xl font-bold text-indigo-700">{fmt(revenueThisYear)} RON</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Oferte trimise</p>
            <p className="text-xl font-bold text-slate-700">
              {offerCounts.sent + offerCounts.viewed + offerCounts.accepted + offerCounts.rejected}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Timp mediu răspuns</p>
            <p className="text-xl font-bold text-slate-700">
              {avgResponseDays > 0 ? `${avgResponseDays} zile` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
