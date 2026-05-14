import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

interface AutomationRule {
  id: string
  user_id: string
  name: string
  trigger_type: string
  trigger_days: number
  email_subject: string | null
  email_body: string | null
  is_active: boolean
}

interface ClientRow {
  id: string
  name: string
  email: string | null
}

interface ResourceRow {
  id: string
  number?: string
  name?: string
  status: string
  sent_at?: string | null
  viewed_at?: string | null
  due_date?: string | null
  deadline?: string | null
  client?: ClientRow | ClientRow[] | null
}

function replacePlaceholders(
  template: string,
  vars: { client_name?: string; document_number?: string; days?: number },
): string {
  return template
    .replace(/\{\{client_name\}\}/g, vars.client_name ?? '')
    .replace(/\{\{document_number\}\}/g, vars.document_number ?? '')
    .replace(/\{\{days\}\}/g, String(vars.days ?? ''))
}

export async function GET(request: Request) {
  // Verifică autorizare cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })
  }

  const supabase = await createClient()
  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  let emailsSent = 0
  const errors: string[] = []

  // Fetch toate regulile active
  const { data: rules, error: rulesError } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('is_active', true)

  if (rulesError || !rules) {
    return NextResponse.json({ error: 'Eroare la fetch reguli.' }, { status: 500 })
  }

  for (const rule of rules as AutomationRule[]) {
    try {
      const userId = rule.user_id
      const triggerDays = rule.trigger_days

      // Fetch profil user pentru email from
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name, company_email')
        .eq('id', userId)
        .single()

      const fromName = profile?.company_name ?? profile?.full_name ?? 'Limeeo'

      let resources: ResourceRow[] = []

      if (rule.trigger_type === 'offer_not_viewed') {
        const cutoff = new Date(Date.now() - triggerDays * 86400000).toISOString()
        const { data } = await supabase
          .from('offers')
          .select('id, number, status, sent_at, client:clients(id, name, email)')
          .eq('user_id', userId)
          .eq('status', 'sent')
          .lt('sent_at', cutoff)
        resources = (data ?? []) as unknown as ResourceRow[]
      } else if (rule.trigger_type === 'offer_viewed_no_reply') {
        const cutoff = new Date(Date.now() - triggerDays * 86400000).toISOString()
        const { data } = await supabase
          .from('offers')
          .select('id, number, status, viewed_at, client:clients(id, name, email)')
          .eq('user_id', userId)
          .eq('status', 'viewed')
          .lt('viewed_at', cutoff)
        resources = (data ?? []) as unknown as ResourceRow[]
      } else if (rule.trigger_type === 'invoice_overdue') {
        const { data } = await supabase
          .from('invoices')
          .select('id, number, status, due_date, client:clients(id, name, email)')
          .eq('user_id', userId)
          .eq('type', 'invoice')
          .eq('status', 'overdue')
        resources = (data ?? []) as unknown as ResourceRow[]
      } else if (rule.trigger_type === 'invoice_due_soon') {
        const futureDate = new Date(Date.now() + triggerDays * 86400000).toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('invoices')
          .select('id, number, status, due_date, client:clients(id, name, email)')
          .eq('user_id', userId)
          .eq('type', 'invoice')
          .eq('status', 'sent')
          .gte('due_date', today)
          .lte('due_date', futureDate)
        resources = (data ?? []) as unknown as ResourceRow[]
      } else if (rule.trigger_type === 'project_deadline') {
        const futureDate = new Date(Date.now() + triggerDays * 86400000).toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('projects')
          .select('id, name, deadline, status, client:clients(id, name, email)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('deadline', today)
          .lte('deadline', futureDate)
        resources = (data ?? []) as unknown as ResourceRow[]
      }

      for (const resource of resources) {
        const rawClient = resource.client
        const client = Array.isArray(rawClient)
          ? (rawClient[0] as ClientRow | undefined) ?? null
          : (rawClient as ClientRow | null)
        if (!client?.email) continue

        // Verifică dacă a mai fost trimis un log pentru această resursă și regulă
        const { count } = await supabase
          .from('automation_logs')
          .select('id', { count: 'exact', head: true })
          .eq('rule_id', rule.id)
          .eq('resource_id', resource.id)

        if ((count ?? 0) > 0) continue

        const docNumber = resource.number ?? resource.name ?? ''
        const vars = {
          client_name: client.name,
          document_number: docNumber,
          days: triggerDays,
        }

        const subject = rule.email_subject
          ? replacePlaceholders(rule.email_subject, vars)
          : defaultSubject(rule.trigger_type, docNumber, triggerDays)

        const body = rule.email_body
          ? replacePlaceholders(rule.email_body, vars)
          : defaultBody(rule.trigger_type, client.name, docNumber, triggerDays)

        if (resend) {
          const { error: sendError } = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [client.email],
            subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">${body.replace(/\n/g, '<br>')}</div>`,
          })

          if (sendError) {
            errors.push(`Rule ${rule.id}: ${sendError.message}`)
            continue
          }
        }

        // Inserează log
        await supabase.from('automation_logs').insert({
          rule_id: rule.id,
          user_id: userId,
          resource_id: resource.id,
          resource_type: rule.trigger_type.startsWith('offer') ? 'offer' : rule.trigger_type.startsWith('invoice') ? 'invoice' : 'project',
          recipient_email: client.email,
          status: resend ? 'sent' : 'skipped_no_resend',
        })

        emailsSent++
      }
    } catch (err: unknown) {
      errors.push(`Rule ${rule.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    emails_sent: emailsSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}

function defaultSubject(triggerType: string, docNumber: string, days: number): string {
  switch (triggerType) {
    case 'offer_not_viewed':
      return `Oferta ${docNumber} — Urmărire după ${days} zile`
    case 'offer_viewed_no_reply':
      return `Oferta ${docNumber} — Așteptăm răspunsul tău`
    case 'invoice_overdue':
      return `Factură restantă ${docNumber} — Solicitare plată`
    case 'invoice_due_soon':
      return `Factură ${docNumber} — Scadentă în ${days} zile`
    case 'project_deadline':
      return `Deadline proiect în ${days} zile`
    default:
      return 'Notificare automată'
  }
}

function defaultBody(triggerType: string, clientName: string, docNumber: string, days: number): string {
  switch (triggerType) {
    case 'offer_not_viewed':
      return `Dragă ${clientName},\n\nDorim să ne asigurăm că ai primit oferta noastră ${docNumber}, trimisă acum ${days} zile.\n\nTe rugăm să o vizualizezi și să ne transmiți orice întrebări.\n\nCu stimă`
    case 'offer_viewed_no_reply':
      return `Dragă ${clientName},\n\nObservăm că ai vizualizat oferta noastră ${docNumber}, dar nu am primit încă un răspuns.\n\nSuntem disponibili pentru orice clarificări.\n\nCu stimă`
    case 'invoice_overdue':
      return `Dragă ${clientName},\n\nDorim să îți atragem atenția că factura ${docNumber} a depășit termenul de plată.\n\nTe rugăm să efectuezi plata cât mai curând posibil.\n\nCu stimă`
    case 'invoice_due_soon':
      return `Dragă ${clientName},\n\nÎți amintim că factura ${docNumber} este scadentă în ${days} zile.\n\nTe rugăm să te asiguri că plata va fi efectuată la timp.\n\nCu stimă`
    case 'project_deadline':
      return `Dragă ${clientName},\n\nÎți amintim că proiectul ${docNumber} are deadline în ${days} zile.\n\nTe rugăm să ne contactezi dacă ai nevoie de orice informații suplimentare.\n\nCu stimă`
    default:
      return `Dragă ${clientName},\n\nAcesta este un reminder automat.\n\nCu stimă`
  }
}
