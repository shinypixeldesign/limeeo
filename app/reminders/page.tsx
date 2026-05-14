import { createClient } from '@/lib/supabase/server'
import RemindersView from '@/components/reminders/RemindersView'
import type { Reminder } from '@/components/reminders/RemindersView'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()

  // Fetch data in parallel
  const [offersRes, invoicesRes, projectsRes] = await Promise.all([
    supabase
      .from('offers')
      .select('id, number, status, sent_at, viewed_at, valid_until, client:clients(id, name, email)')
      .eq('user_id', user!.id)
      .in('status', ['sent', 'viewed']),
    supabase
      .from('invoices')
      .select('id, number, status, due_date, client:clients(id, name, email)')
      .eq('user_id', user!.id)
      .eq('type', 'invoice')
      .in('status', ['sent', 'overdue']),
    supabase
      .from('projects')
      .select('id, name, deadline, status, client:clients(id, name, email)')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .not('deadline', 'is', null),
  ])

  const reminders: Reminder[] = []

  // ── Offers ──────────────────────────────────────────────────────────────────
  for (const offer of (offersRes.data ?? [])) {
    const client = offer.client as unknown as { id: string; name: string; email: string | null } | null

    if (offer.status === 'sent' && offer.sent_at) {
      const daysSinceSent = Math.floor((now.getTime() - new Date(offer.sent_at).getTime()) / 86400000)
      if (daysSinceSent >= 3) {
        reminders.push({
          id: `offer-sent-${offer.id}`,
          type: 'offer_unseen',
          urgency: 'info',
          title: `Ofertă #${offer.number}`,
          description: 'Ofertă trimisă, nevăzută 3+ zile',
          clientName: client?.name ?? null,
          clientEmail: client?.email ?? null,
          resourceHref: `/offers/${offer.id}`,
          daysAgo: daysSinceSent,
          dateLabel: `Trimisă acum ${daysSinceSent} zile`,
        })
      }
    }

    if (offer.status === 'viewed' && offer.viewed_at) {
      const daysSinceViewed = Math.floor((now.getTime() - new Date(offer.viewed_at).getTime()) / 86400000)
      if (daysSinceViewed >= 2) {
        reminders.push({
          id: `offer-viewed-${offer.id}`,
          type: 'offer_viewed',
          urgency: daysSinceViewed >= 5 ? 'urgent' : 'attention',
          title: `Ofertă #${offer.number}`,
          description: 'Ofertă văzută, fără răspuns',
          clientName: client?.name ?? null,
          clientEmail: client?.email ?? null,
          resourceHref: `/offers/${offer.id}`,
          daysAgo: daysSinceViewed,
          dateLabel: `Văzută acum ${daysSinceViewed} zile`,
        })
      }
    }
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────
  for (const invoice of (invoicesRes.data ?? [])) {
    const client = invoice.client as unknown as { id: string; name: string; email: string | null } | null

    if (invoice.status === 'overdue') {
      reminders.push({
        id: `invoice-overdue-${invoice.id}`,
        type: 'invoice_overdue',
        urgency: 'urgent',
        title: `Factură #${invoice.number}`,
        description: 'Factură restantă — termen depășit',
        clientName: client?.name ?? null,
        clientEmail: client?.email ?? null,
        resourceHref: `/financials/${invoice.id}`,
        daysAgo: null,
        dateLabel: invoice.due_date
          ? `Scadentă: ${new Date(invoice.due_date).toLocaleDateString('ro-RO')}`
          : 'Restantă',
      })
    }

    if (invoice.status === 'sent' && invoice.due_date) {
      const daysUntilDue = Math.ceil((new Date(invoice.due_date).getTime() - now.getTime()) / 86400000)
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        reminders.push({
          id: `invoice-due-${invoice.id}`,
          type: 'invoice_due_soon',
          urgency: 'attention',
          title: `Factură #${invoice.number}`,
          description: `Factură scadentă în ${daysUntilDue === 0 ? 'azi' : `${daysUntilDue} ${daysUntilDue === 1 ? 'zi' : 'zile'}`}`,
          clientName: client?.name ?? null,
          clientEmail: client?.email ?? null,
          resourceHref: `/financials/${invoice.id}`,
          daysAgo: null,
          dateLabel: `Scadentă: ${new Date(invoice.due_date).toLocaleDateString('ro-RO')}`,
        })
      }
    }
  }

  // ── Projects ──────────────────────────────────────────────────────────────────
  for (const project of (projectsRes.data ?? [])) {
    if (!project.deadline) continue
    const client = project.client as unknown as { id: string; name: string; email: string | null } | null
    const daysUntil = Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / 86400000)
    if (daysUntil >= 0 && daysUntil <= 7) {
      reminders.push({
        id: `project-deadline-${project.id}`,
        type: 'project_deadline',
        urgency: 'info',
        title: project.name,
        description: `Deadline proiect: ${daysUntil === 0 ? 'azi' : `în ${daysUntil} ${daysUntil === 1 ? 'zi' : 'zile'}`}`,
        clientName: client?.name ?? null,
        clientEmail: client?.email ?? null,
        resourceHref: `/projects/${project.id}`,
        daysAgo: null,
        dateLabel: `Deadline: ${new Date(project.deadline).toLocaleDateString('ro-RO')}`,
      })
    }
  }

  // Sort: urgent first, then attention, then info
  const urgencyOrder = { urgent: 0, attention: 1, info: 2 }
  reminders.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return <RemindersView reminders={reminders} />
}
