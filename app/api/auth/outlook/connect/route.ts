import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const tenantId = process.env.OUTLOOK_TENANT_ID ?? 'common'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/settings?error=outlook_not_configured`)
  }

  const redirectUri = `${appUrl}/api/auth/outlook/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ].join(' '),
    state: user.id,
    response_mode: 'query',
  })

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
