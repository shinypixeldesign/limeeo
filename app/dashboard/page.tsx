import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AI_LIMITS } from '@/lib/claude'

// ─── Componente locale ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color = 'indigo', href }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'violet'
  href?: string
}) {
  const palette = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   badge: 'bg-amber-50 text-amber-700 ring-amber-200'     },
    red:     { bg: 'bg-red-50',     text: 'text-red-600',     badge: 'bg-red-50 text-red-700 ring-red-200'           },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  badge: 'bg-violet-50 text-violet-700 ring-violet-200'  },
  }
  const p = palette[color]
  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${p.bg} flex items-center justify-center`}>
          <span className={p.text}>{icon}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && (
        <p className={`inline-flex mt-3 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${p.badge}`}>
          {sub}
        </p>
      )}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

// ─── AI Card dedicat ─────────────────────────────────────────────────────────

function AICard({ plan, aiLimit, aiUsed }: { plan: string; aiLimit: number; aiUsed: number }) {
  const isUnlimited = aiLimit === Infinity
  const isFree = plan === 'free' || aiLimit === 0
  const remaining = isUnlimited ? Infinity : Math.max(0, aiLimit - aiUsed)
  const pct = isUnlimited || aiLimit === 0 ? 0 : Math.min(100, (aiUsed / aiLimit) * 100)
  const isLow = !isUnlimited && !isFree && pct > 75

  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        {!isFree && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {plan}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">AI Assistant</p>

      {isFree ? (
        <>
          <p className="text-2xl font-bold text-slate-400 tracking-tight">Inactiv</p>
          <p className="inline-flex mt-3 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset bg-violet-50 text-violet-700 ring-violet-200">
            Disponibil din planul Solo →
          </p>
        </>
      ) : isUnlimited ? (
        <>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">∞</p>
          <p className="inline-flex mt-3 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset bg-violet-50 text-violet-700 ring-violet-200">
            {aiUsed} mesaje folosite luna aceasta
          </p>
        </>
      ) : (
        <>
          <p className={`text-3xl font-bold tracking-tight ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
            {remaining}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            mesaje rămase din {aiLimit}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-violet-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  )

  return <Link href={isFree ? '/upgrade' : '/ai'}>{inner}</Link>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Toate fetch-urile în paralel
  const [
    clientsRes,
    projectsRes,
    allInvoicesRes,
    profileRes,
    recentInvoicesRes,
    recentOffersRes,
    deadlinesRes,
  ] = await Promise.all([
    supabase.from('clients').select('id, status', { count: 'exact' }).eq('user_id', user!.id),
    supabase.from('projects').select('id, name, deadline, status').eq('user_id', user!.id).eq('status', 'active'),
    supabase.from('invoices').select('total, status, currency').eq('user_id', user!.id).eq('type', 'invoice'),
    supabase.from('profiles').select('plan, ai_messages_used, full_name').eq('id', user!.id).single(),
    supabase.from('invoices')
      .select('id, number, type, status, total, currency, issue_date, client:clients(name)')
      .eq('user_id', user!.id)
      .eq('type', 'invoice')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('offers')
      .select('id, number, title, status, total, currency, created_at, client:clients(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('projects')
      .select('id, name, deadline, status, client:clients(name)')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .not('deadline', 'is', null)
      .order('deadline', { ascending: true })
      .limit(5),
  ])

  // Calcule stats
  const allInvoices = allInvoicesRes.data ?? []
  const unpaidInvoices  = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue')
  const paidThisMonth   = allInvoices.filter(i => i.status === 'paid')
  const unpaidTotal  = unpaidInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const paidTotal    = paidThisMonth.reduce((s, i) => s + (i.total ?? 0), 0)

  const activeProjects = projectsRes.data ?? []
  const clientCount = clientsRes.count ?? 0

  const plan = profileRes.data?.plan ?? 'free'
  const aiLimit = AI_LIMITS[plan] ?? 0
  const aiUsed  = profileRes.data?.ai_messages_used ?? 0

  const firstName = (profileRes.data?.full_name as string | undefined)?.split(' ')[0]
    ?? (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? 'Freelancer'

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bună dimineața' : hour < 18 ? 'Bună ziua' : 'Bună seara'

  const fmt = (n: number) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  // Deadline-uri în ≤ 14 zile
  const upcomingDeadlines = (deadlinesRes.data ?? []).filter(p => {
    if (!p.deadline) return false
    const diff = Math.ceil((new Date(p.deadline).getTime() - now.getTime()) / 86400000)
    return diff >= 0 && diff <= 30
  })

  // Oferte recente merged cu facturi
  const recentOffers = (recentOffersRes.data ?? [])
  const recentInvoices = (recentInvoicesRes.data ?? [])

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-500' },
    sent:      { label: 'Trimisă',   cls: 'bg-blue-50 text-blue-700'   },
    viewed:    { label: 'Văzută',    cls: 'bg-amber-50 text-amber-700' },
    accepted:  { label: 'Acceptată', cls: 'bg-emerald-50 text-emerald-700' },
    rejected:  { label: 'Refuzată',  cls: 'bg-red-50 text-red-700'     },
    paid:      { label: 'Plătită',   cls: 'bg-emerald-50 text-emerald-700' },
    overdue:   { label: 'Restantă',  cls: 'bg-red-50 text-red-700'     },
    cancelled: { label: 'Anulată',   cls: 'bg-slate-100 text-slate-400' },
  }

  return (
    <div className="p-8 max-w-7xl">

      {/* ── Greeting ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {firstName}! 👋</h1>
        <p className="text-slate-500 mt-1">
          {now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Alerte ── */}
      {overdueInvoices.length > 0 && (
        <Link href="/financials" className="block mb-6">
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-center gap-3 hover:bg-red-100 transition">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                {overdueInvoices.length} {overdueInvoices.length === 1 ? 'factură restantă' : 'facturi restante'}
                {' '}— {fmt(overdueTotal)} RON neîncasați
              </p>
              <p className="text-xs text-red-600 mt-0.5">Trimite un reminder clienților →</p>
            </div>
          </div>
        </Link>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Clienți"
          value={clientCount}
          sub={clientCount === 0 ? 'Adaugă primul' : `${clientCount} înregistrați`}
          color="indigo"
          href="/clients"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Proiecte active"
          value={activeProjects.length}
          sub={activeProjects.length === 0 ? 'Niciun proiect' : 'în derulare'}
          color="emerald"
          href="/projects"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="De încasat"
          value={unpaidTotal === 0 ? '0 RON' : `${fmt(unpaidTotal)} RON`}
          sub={unpaidTotal === 0 ? 'Totul e plătit ✓' : `${unpaidInvoices.length} facturi trimise`}
          color={overdueInvoices.length > 0 ? 'red' : 'amber'}
          href="/financials"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <AICard plan={plan} aiLimit={aiLimit} aiUsed={aiUsed} />
      </div>

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Activitate recentă (3/5) */}
        <div className="lg:col-span-3 space-y-5">

          {/* Oferte recente */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Oferte recente</h2>
              <Link href="/offers" className="text-xs font-medium text-violet-600 hover:text-violet-700">
                Vezi toate →
              </Link>
            </div>
            {recentOffers.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">Nicio ofertă încă.</p>
                <Link href="/offers/new" className="mt-2 inline-flex text-xs font-medium text-violet-600 hover:text-violet-700">
                  Creează prima ofertă →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOffers.map((offer) => {
                  const sc = statusConfig[offer.status] ?? statusConfig.draft
                  const client = offer.client as unknown as { name: string } | null
                  return (
                    <Link key={offer.id} href={`/offers/${offer.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 font-mono">{offer.number}</span>
                          {offer.title && <span className="text-sm text-slate-500 truncate max-w-40">{offer.title}</span>}
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {client?.name ?? 'Fără client'} · {new Date(offer.created_at).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">
                        {fmt(offer.total ?? 0)} {offer.currency}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Link href="/offers/new" className="text-xs font-medium text-violet-600 hover:text-violet-700">
                + Ofertă nouă
              </Link>
            </div>
          </div>

          {/* Facturi recente */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Facturi recente</h2>
              <Link href="/financials" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Vezi toate →
              </Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">Nicio factură încă.</p>
                <Link href="/financials/new" className="mt-2 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Creează prima factură →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => {
                  const sc = statusConfig[inv.status] ?? statusConfig.draft
                  const client = inv.client as unknown as { name: string } | null
                  return (
                    <Link key={inv.id} href={`/financials/${inv.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 font-mono">{inv.number}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {client?.name ?? 'Fără client'} · {new Date(inv.issue_date).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">
                        {fmt(inv.total ?? 0)} {inv.currency}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Link href="/financials/new" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                + Factură nouă
              </Link>
            </div>
          </div>

        </div>

        {/* Coloana dreapta (2/5) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Deadline-uri */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Deadline-uri apropiate</h2>
              <Link href="/projects" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Toate →
              </Link>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-400">Niciun deadline în 30 de zile.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingDeadlines.map(p => {
                  const diff = Math.ceil((new Date(p.deadline!).getTime() - now.getTime()) / 86400000)
                  const urgent = diff <= 3
                  const soon   = diff <= 7
                  const client = p.client as unknown as { name: string } | null
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition"
                    >
                      <div className={`w-1.5 h-8 rounded-full shrink-0 ${urgent ? 'bg-red-400' : soon ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{client?.name ?? ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-semibold ${urgent ? 'text-red-600' : soon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {diff === 0 ? 'Azi!' : diff === 1 ? 'Mâine' : `${diff} zile`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(p.deadline!).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Acțiuni rapide */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Acțiuni rapide</h2>
            <div className="space-y-2">
              {[
                { href: '/clients/new',           label: 'Client nou',      icon: '👤', color: 'hover:bg-indigo-50 hover:text-indigo-700' },
                { href: '/projects/new',           label: 'Proiect nou',     icon: '📁', color: 'hover:bg-emerald-50 hover:text-emerald-700' },
                { href: '/financials/new',               label: 'Factură nouă',  icon: '🧾', color: 'hover:bg-amber-50 hover:text-amber-700' },
                { href: '/offers/new',                  label: 'Ofertă nouă',   icon: '📋', color: 'hover:bg-violet-50 hover:text-violet-700' },
                { href: '/ai',                     label: 'AI Assistant',    icon: '✨', color: 'hover:bg-violet-50 hover:text-violet-700' },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 transition ${a.color}`}
                >
                  <span className="text-base">{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Empty state prima dată ── */}
      {clientCount === 0 && (recentInvoicesRes.data ?? []).length === 0 && (
        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Bun venit în Freelio!</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Totul e pregătit. Adaugă primul client și începe să gestionezi proiectele, facturile și conversațiile AI din același loc.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              + Adaugă primul client
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Completează profilul
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}
