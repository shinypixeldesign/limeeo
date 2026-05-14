import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // user_id
  const error = url.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=outlook_auth_failed`)
  }

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID ?? 'common'
  const redirectUri = `${appUrl}/api/auth/outlook/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings?error=outlook_not_configured`)
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: [
            'https://graph.microsoft.com/Mail.Send',
            'https://graph.microsoft.com/User.Read',
            'offline_access',
          ].join(' '),
        }),
      }
    )

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[outlook callback] token error:', tokenData)
      return NextResponse.redirect(`${appUrl}/settings?error=outlook_token_failed`)
    }

    // Obține emailul userului Microsoft
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userInfoRes.json()

    const expiresAt = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : null

    const supabase = await createClient()
    await supabase
      .from('profiles')
      .update({
        outlook_access_token: tokenData.access_token,
        outlook_refresh_token: tokenData.refresh_token ?? null,
        outlook_token_expiry: expiresAt,
        outlook_email: userInfo.mail ?? userInfo.userPrincipalName ?? null,
      })
      .eq('id', state)

    return NextResponse.redirect(`${appUrl}/settings?outlook=connected`)
  } catch (err: unknown) {
    console.error('[outlook callback] error:', err)
    return NextResponse.redirect(`${appUrl}/settings?error=outlook_callback_error`)
  }
}
