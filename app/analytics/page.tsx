import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import type { Invoice, Offer, Client, Project } from '@/types/database'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [invoicesRes, offersRes, clientsRes, projectsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, total, currency, issue_date, created_at')
      .eq('user_id', user!.id)
      .eq('type', 'invoice'),
    supabase
      .from('invoices')
      .select('id, status, total, created_at, accepted_at, rejected_at, sent_at, viewed_at')
      .eq('user_id', user!.id)
      .eq('type', 'offer'),
    supabase
      .from('clients')
      .select('id, status, created_at')
      .eq('user_id', user!.id),
    supabase
      .from('projects')
      .select('id, status, budget, created_at')
      .eq('user_id', user!.id),
  ])

  const invoices = (invoicesRes.data ?? []) as Pick<Invoice, 'id' | 'status' | 'total' | 'currency' | 'issue_date' | 'created_at'>[]
  const offers = (offersRes.data ?? []) as (Pick<Offer, 'id' | 'status' | 'total' | 'created_at'> & { sent_at: string | null; viewed_at: string | null; accepted_at: string | null; rejected_at: string | null })[]
  const clients = (clientsRes.data ?? []) as Pick<Client, 'id' | 'status' | 'created_at'>[]
  const projects = (projectsRes.data ?? []) as Pick<Project, 'id' | 'status' | 'budget' | 'created_at'>[]

  // ── Monthly revenue for last 6 months ──────────────────────────────────────
  const now = new Date()
  const monthlyRevenue: { month: string; revenue: number; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })
    const revenue = invoices
      .filter(inv => inv.status === 'paid' && inv.issue_date.startsWith(monthKey))
      .reduce((s, inv) => s + (inv.total ?? 0), 0)
    monthlyRevenue.push({ month: monthKey, revenue, label })
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + (i.total ?? 0), 0)

  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const revenueThisMonth = invoices
    .filter(i => i.status === 'paid' && i.issue_date.startsWith(thisMonthKey))
    .reduce((s, i) => s + (i.total ?? 0), 0)

  const thisYear = now.getFullYear()
  const revenueThisYear = invoices
    .filter(i => i.status === 'paid' && i.issue_date.startsWith(String(thisYear)))
    .reduce((s, i) => s + (i.total ?? 0), 0)

  // ── Offer funnel ───────────────────────────────────────────────────────────
  const offerCounts = {
    draft:    offers.filter(o => o.status === 'draft').length,
    sent:     offers.filter(o => o.status === 'sent').length,
    viewed:   offers.filter(o => o.status === 'viewed').length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    rejected: offers.filter(o => o.status === 'rejected').length,
  }

  const sentTotal = offerCounts.sent + offerCounts.viewed + offerCounts.accepted + offerCounts.rejected
  const acceptanceRate = sentTotal > 0 ? Math.round((offerCounts.accepted / sentTotal) * 100) : 0

  // Average response time (accepted + rejected offers that have a response timestamp)
  const respondedOffers = offers.filter(o =>
    (o.status === 'accepted' && o.accepted_at && o.sent_at) ||
    (o.status === 'rejected' && o.rejected_at && o.sent_at)
  )
  let avgResponseDays = 0
  if (respondedOffers.length > 0) {
    const totalDays = respondedOffers.reduce((s, o) => {
      const sentDate = new Date(o.sent_at!).getTime()
      const responseDate = new Date((o.accepted_at ?? o.rejected_at)!).getTime()
      return s + Math.round((responseDate - sentDate) / 86400000)
    }, 0)
    avgResponseDays = Math.round(totalDays / respondedOffers.length)
  }

  // ── Client stats ───────────────────────────────────────────────────────────
  const clientStats = {
    active:   clients.filter(c => c.status === 'active').length,
    prospect: clients.filter(c => c.status === 'prospect').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
  }

  return (
    <AnalyticsDashboard
      monthlyRevenue={monthlyRevenue}
      totalRevenue={totalRevenue}
      revenueThisMonth={revenueThisMonth}
      revenueThisYear={revenueThisYear}
      offerCounts={offerCounts}
      acceptanceRate={acceptanceRate}
      avgResponseDays={avgResponseDays}
      clientStats={clientStats}
    />
  )
}
