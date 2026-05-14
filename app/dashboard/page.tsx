import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AI_LIMITS } from '@/lib/claude'
import { ArrowUpRight, Users, Briefcase, DollarSign, Sparkles, TrendingUp } from 'lucide-react'

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, iconBg, iconColor, href }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  href?: string
}) {
  const inner = (
    <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/8 transition-all h-full group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-[14px] ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {href && (
          <ArrowUpRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
        )}
      </div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href} className="block h-full">{inner}</Link>
  return inner
}

// ─── AI Card ─────────────────────────────────────────────────────────────────

function AICard({ plan, aiLimit, aiUsed }: { plan: string; aiLimit: number; aiUsed: number }) {
  const isUnlimited = aiLimit === Infinity
  const isFree = plan === 'free' || aiLimit === 0
  const remaining = isUnlimited ? Infinity : Math.max(0, aiLimit - aiUsed)
  const pct = isUnlimited || aiLimit === 0 ? 0 : Math.min(100, (aiUsed / aiLimit) * 100)
  const isLow = !isUnlimited && !isFree && pct > 75

  return (
    <Link href={isFree ? '/upgrade' : '/ai'} className="block h-full">
      <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/8 transition-all h-full group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-[14px] bg-purple-50 flex items-center justify-center">
            <Sparkles size={22} className="text-purple-500" strokeWidth={1.8} />
          </div>
          <ArrowUpRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-gray-500 mb-1">AI Assistant</p>
        {isFree ? (
          <>
            <p className="text-2xl font-bold text-gray-400">Inactiv</p>
            <p className="text-sm text-gray-400 mt-1">Disponibil din Solo →</p>
          </>
        ) : isUnlimited ? (
          <>
            <p className="text-3xl font-bold text-gray-900">∞</p>
            <p className="text-sm text-gray-400 mt-1">{aiUsed} mesaje luna aceasta</p>
          </>
        ) : (
          <>
            <p className={`text-3xl font-bold tracking-tight ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
              {remaining}
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-3">din {aiLimit} mesaje</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-amber-400' : 'bg-[#acff55]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()

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
      .eq('user_id', user!.id).eq('type', 'invoice')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('offers')
      .select('id, number, title, status, total, currency, created_at, client:clients(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('projects')
      .select('id, name, deadline, status, client:clients(name)')
      .eq('user_id', user!.id).eq('status', 'active').not('deadline', 'is', null)
      .order('deadline', { ascending: true }).limit(5),
  ])

  const allInvoices = allInvoicesRes.data ?? []
  const unpaidInvoices  = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue')
  const unpaidTotal  = unpaidInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
  const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
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

  const upcomingDeadlines = (deadlinesRes.data ?? []).filter(p => {
    if (!p.deadline) return false
    const diff = Math.ceil((new Date(p.deadline).getTime() - now.getTime()) / 86400000)
    return diff >= 0 && diff <= 30
  })

  const recentOffers = recentOffersRes.data ?? []
  const recentInvoices = recentInvoicesRes.data ?? []

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Trimisă',   cls: 'bg-blue-50 text-blue-700' },
    viewed:    { label: 'Văzută',    cls: 'bg-amber-50 text-amber-700' },
    accepted:  { label: 'Acceptată', cls: 'bg-[#acff55]/20 text-green-700' },
    rejected:  { label: 'Refuzată',  cls: 'bg-red-50 text-red-700' },
    paid:      { label: 'Plătită',   cls: 'bg-[#acff55]/20 text-green-700' },
    overdue:   { label: 'Restantă',  cls: 'bg-red-50 text-red-700' },
    cancelled: { label: 'Anulată',   cls: 'bg-gray-100 text-gray-400' },
  }

  return (
    <div className="p-8 max-w-7xl">

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}, {firstName}! 👋</h1>
        <p className="text-gray-500 mt-1 font-medium">
          {now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alert facturi restante */}
      {overdueInvoices.length > 0 && (
        <Link href="/financials" className="block mb-6">
          <div className="rounded-[20px] bg-red-50 border border-red-100 px-5 py-4 flex items-center gap-3 hover:bg-red-100 transition-all shadow-sm">
            <div className="w-9 h-9 rounded-[12px] bg-red-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                {overdueInvoices.length} {overdueInvoices.length === 1 ? 'factură restantă' : 'facturi restante'} — {fmt(overdueTotal)} RON neîncasați
              </p>
              <p className="text-xs text-red-500 mt-0.5">Trimite un reminder clienților →</p>
            </div>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Clienți"
          value={clientCount}
          sub={clientCount === 0 ? 'Adaugă primul' : `${clientCount} înregistrați`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          href="/clients"
          icon={<Users size={22} strokeWidth={1.8} />}
        />
        <StatCard
          label="Proiecte active"
          value={activeProjects.length}
          sub={activeProjects.length === 0 ? 'Niciun proiect' : 'în derulare'}
          iconBg="bg-[#acff55]/20"
          iconColor="text-green-700"
          href="/projects"
          icon={<Briefcase size={22} strokeWidth={1.8} />}
        />
        <StatCard
          label="De încasat"
          value={unpaidTotal === 0 ? '0 RON' : `${fmt(unpaidTotal)} RON`}
          sub={unpaidTotal === 0 ? 'Totul e plătit ✓' : `${unpaidInvoices.length} facturi trimise`}
          iconBg={overdueInvoices.length > 0 ? 'bg-red-50' : 'bg-amber-50'}
          iconColor={overdueInvoices.length > 0 ? 'text-red-600' : 'text-amber-600'}
          href="/financials"
          icon={<DollarSign size={22} strokeWidth={1.8} />}
        />
        <AICard plan={plan} aiLimit={aiLimit} aiUsed={aiUsed} />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Coloana stânga (3/5) */}
        <div className="lg:col-span-3 space-y-5">

          {/* Oferte recente */}
          <div className="bg-white rounded-[24px] overflow-hidden shadow-lg shadow-black/5">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Oferte recente</h2>
              <Link href="/offers" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition-opacity">
                Vezi toate →
              </Link>
            </div>
            {recentOffers.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-400">Nicio ofertă încă.</p>
                <Link href="/offers/new" className="mt-2 inline-flex text-sm font-semibold text-gray-900 hover:opacity-70">
                  Creează prima ofertă →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOffers.map((offer) => {
                  const sc = statusConfig[offer.status] ?? statusConfig.draft
                  const client = offer.client as unknown as { name: string } | null
                  return (
                    <Link key={offer.id} href={`/offers/${offer.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 font-mono">{offer.number}</span>
                          {offer.title && <span className="text-sm text-gray-500 truncate max-w-40">{offer.title}</span>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {client?.name ?? 'Fără client'} · {new Date(offer.created_at).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 shrink-0">
                        {fmt(offer.total ?? 0)} {offer.currency}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="px-6 py-3.5 bg-gray-50/50">
              <Link href="/offers/new" className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                + Ofertă nouă
              </Link>
            </div>
          </div>

          {/* Facturi recente */}
          <div className="bg-white rounded-[24px] overflow-hidden shadow-lg shadow-black/5">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Facturi recente</h2>
              <Link href="/financials" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition-opacity">
                Vezi toate →
              </Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-400">Nicio factură încă.</p>
                <Link href="/financials/new" className="mt-2 inline-flex text-sm font-semibold text-gray-900 hover:opacity-70">
                  Creează prima factură →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentInvoices.map((inv) => {
                  const sc = statusConfig[inv.status] ?? statusConfig.draft
                  const client = inv.client as unknown as { name: string } | null
                  return (
                    <Link key={inv.id} href={`/financials/${inv.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 font-mono">{inv.number}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {client?.name ?? 'Fără client'} · {new Date(inv.issue_date).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 shrink-0">
                        {fmt(inv.total ?? 0)} {inv.currency}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="px-6 py-3.5 bg-gray-50/50">
              <Link href="/financials/new" className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                + Factură nouă
              </Link>
            </div>
          </div>
        </div>

        {/* Coloana dreapta (2/5) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Deadline-uri */}
          <div className="bg-white rounded-[24px] overflow-hidden shadow-lg shadow-black/5">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Deadline-uri</h2>
              <Link href="/projects" className="text-xs font-semibold text-[#acff55] hover:opacity-80 transition-opacity">
                Toate →
              </Link>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-400">Niciun deadline în 30 de zile.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingDeadlines.map(p => {
                  const diff = Math.ceil((new Date(p.deadline!).getTime() - now.getTime()) / 86400000)
                  const urgent = diff <= 3
                  const soon   = diff <= 7
                  const client = p.client as unknown as { name: string } | null
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className={`w-1.5 h-8 rounded-full shrink-0 ${urgent ? 'bg-red-400' : soon ? 'bg-amber-400' : 'bg-[#acff55]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{client?.name ?? ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${urgent ? 'text-red-600' : soon ? 'text-amber-600' : 'text-gray-500'}`}>
                          {diff === 0 ? 'Azi!' : diff === 1 ? 'Mâine' : `${diff} zile`}
                        </p>
                        <p className="text-xs text-gray-400">
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
          <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5">
            <h2 className="font-bold text-gray-900 mb-4">Acțiuni rapide</h2>
            <div className="space-y-2">
              {[
                { href: '/projects/new',    label: 'Proiect nou',    primary: true  },
                { href: '/offers/new',      label: 'Ofertă nouă',   primary: false },
                { href: '/financials/new',  label: 'Factură nouă',  primary: false },
                { href: '/clients/new',     label: 'Client nou',    primary: false },
                { href: '/ai',              label: 'AI Assistant',  primary: false },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-[16px] transition-all group font-bold ${
                    a.primary
                      ? 'bg-[#acff55] hover:bg-[#9fee44] text-black'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <span>{a.label}</span>
                  <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state prima dată */}
      {clientCount === 0 && recentInvoices.length === 0 && (
        <div className="mt-8 bg-white rounded-[28px] p-10 text-center shadow-lg shadow-black/5">
          <div className="w-16 h-16 rounded-[20px] bg-[#acff55] flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bun venit în Limeeo!</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto font-medium">
            Totul e pregătit. Adaugă primul client și începe să gestionezi proiectele, facturile și conversațiile AI din același loc.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#acff55] px-6 py-3 text-sm font-bold text-black hover:bg-[#9fee44] transition-all shadow-lg shadow-[#acff55]/30"
            >
              + Adaugă primul client
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Completează profilul
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
