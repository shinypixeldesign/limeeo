import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  // Găsește timere active de mai mult de 3 ore fără reminder trimis
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

  const { data: runningTimers } = await supabase
    .from('time_entries')
    .select('id, user_id, started_at, description, project_id, timer_reminder_sent')
    .is('ended_at', null)
    .lt('started_at', threeHoursAgo)
    .eq('timer_reminder_sent', false)

  if (!runningTimers || runningTimers.length === 0) {
    return NextResponse.json({ ok: true, reminders_sent: 0 })
  }

  let sent = 0

  for (const timer of runningTimers) {
    try {
      // Fetch profil user (email + nume)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_email, company_name')
        .eq('id', timer.user_id)
        .single()

      const { data: authUser } = await supabase.auth.admin.getUserById(timer.user_id)
      const toEmail = profile?.company_email ?? authUser?.user?.email
      if (!toEmail) continue

      const hoursRunning = Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 3600000)
      const name = profile?.full_name ?? profile?.company_name ?? 'Freelancer'

      if (resend) {
        await resend.emails.send({
          from: `Limeeo <${fromEmail}>`,
          to: [toEmail],
          subject: `⏱ Timer activ de ${hoursRunning}h — l-ai uitat pornit?`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
              <div style="background:#acff55;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;">⏱</div>
              <h2 style="margin:0 0 8px;color:#111;font-size:22px;">Timer activ de ${hoursRunning} ore</h2>
              <p style="color:#666;margin:0 0 16px;">Salut${name ? ' ' + name : ''},</p>
              <p style="color:#666;margin:0 0 20px;">Timerul tău rulează de <strong>${hoursRunning} ore</strong>${timer.description ? ` pe activitatea "<strong>${timer.description}</strong>"` : ''}. Dacă l-ai uitat pornit, oprește-l acum.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.limeeo.com'}/time"
                style="display:inline-block;background:#acff55;color:#000;font-weight:700;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;">
                Mergi la Pontaj →
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px;">Limeeo · Reminder automat</p>
            </div>
          `,
        })
      }

      // Marchează reminder ca trimis
      await supabase
        .from('time_entries')
        .update({ timer_reminder_sent: true })
        .eq('id', timer.id)

      sent++
    } catch {
      // continuăm cu următorul
    }
  }

  return NextResponse.json({ ok: true, reminders_sent: sent })
}
