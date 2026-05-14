import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

interface ProfileRow {
  gmail_access_token: string | null
  gmail_refresh_token: string | null
  gmail_token_expiry: number | null
  gmail_email: string | null
  full_name: string | null
  company_name: string | null
}

async function refreshGmailToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refreshToken: string,
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    console.error('[gmail] refresh token failed:', data)
    return null
  }

  const newExpiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null

  await supabase
    .from('profiles')
    .update({
      gmail_access_token: data.access_token,
      gmail_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return data.access_token as string
}

function buildRfc2822(
  from: string,
  to: string,
  subject: string,
  html: string,
): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n')

  // base64url encoding
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendViaGmail(
  userId: string,
  { to, subject, html }: SendEmailOptions,
): Promise<void> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, full_name, company_name')
    .eq('id', userId)
    .single()

  const p = profile as ProfileRow | null

  if (!p?.gmail_access_token || !p?.gmail_email) {
    // Fallback la Resend
    await sendViaResend({ to, subject, html })
    return
  }

  let accessToken = p.gmail_access_token

  // Verifică expirare (cu 60s margin)
  if (p.gmail_token_expiry && Date.now() > p.gmail_token_expiry - 60000) {
    if (p.gmail_refresh_token) {
      const refreshed = await refreshGmailToken(supabase, userId, p.gmail_refresh_token)
      if (refreshed) {
        accessToken = refreshed
      } else {
        await sendViaResend({ to, subject, html })
        return
      }
    } else {
      await sendViaResend({ to, subject, html })
      return
    }
  }

  const fromName = p.company_name ?? p.full_name ?? p.gmail_email
  const fromHeader = `${fromName} <${p.gmail_email}>`
  const raw = buildRfc2822(fromHeader, to, subject, html)

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[gmail] send failed:', err)
    // Fallback la Resend
    await sendViaResend({ to, subject, html })
  }
}

async function sendViaResend({ to, subject, html }: SendEmailOptions): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!resendKey) return

  const resend = new Resend(resendKey)
  await resend.emails.send({
    from: `Freelio <${fromEmail}>`,
    to: [to],
    subject,
    html,
  })
}
