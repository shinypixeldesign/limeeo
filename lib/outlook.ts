import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

interface ProfileRow {
  outlook_access_token: string | null
  outlook_refresh_token: string | null
  outlook_token_expiry: number | null
  outlook_email: string | null
  full_name: string | null
  company_name: string | null
}

async function refreshOutlookToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refreshToken: string,
): Promise<string | null> {
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID ?? 'common'
  if (!clientId || !clientSecret) return null

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: [
          'https://graph.microsoft.com/Mail.Send',
          'https://graph.microsoft.com/User.Read',
          'offline_access',
        ].join(' '),
      }),
    }
  )

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    console.error('[outlook] refresh token failed:', data)
    return null
  }

  const newExpiry = data.expires_in ? Date.now() + data.expires_in * 1000 : null

  await supabase
    .from('profiles')
    .update({
      outlook_access_token: data.access_token,
      outlook_token_expiry: newExpiry,
    })
    .eq('id', userId)

  return data.access_token as string
}

export async function sendViaOutlook(
  userId: string,
  { to, subject, html }: SendEmailOptions,
): Promise<void> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('outlook_access_token, outlook_refresh_token, outlook_token_expiry, outlook_email, full_name, company_name')
    .eq('id', userId)
    .single()

  const p = profile as ProfileRow | null

  if (!p?.outlook_access_token || !p?.outlook_email) {
    await sendViaResend({ to, subject, html })
    return
  }

  let accessToken = p.outlook_access_token

  // Verifică expirare
  if (p.outlook_token_expiry && Date.now() > p.outlook_token_expiry - 60000) {
    if (p.outlook_refresh_token) {
      const refreshed = await refreshOutlookToken(supabase, userId, p.outlook_refresh_token)
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

  // Trimite via Microsoft Graph API
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[outlook] send failed:', err)
    await sendViaResend({ to, subject, html })
  }
}

async function sendViaResend({ to, subject, html }: SendEmailOptions): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  if (!resendKey) return

  const resend = new Resend(resendKey)
  await resend.emails.send({
    from: `Limeeo <${fromEmail}>`,
    to: [to],
    subject,
    html,
  })
}
