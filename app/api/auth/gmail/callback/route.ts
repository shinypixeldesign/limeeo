import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // user_id
  const error = url.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/auth/gmail/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_not_configured`)
  }

  try {
    // Schimbă code pentru tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[gmail callback] token error:', tokenData)
      return NextResponse.redirect(`${appUrl}/settings?error=gmail_token_failed`)
    }

    // Obține emailul userului Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userInfoRes.json()

    const expiresAt = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : null

    // Salvează în profiles
    const supabase = await createClient()
    await supabase
      .from('profiles')
      .update({
        gmail_access_token: tokenData.access_token,
        gmail_refresh_token: tokenData.refresh_token ?? null,
        gmail_token_expiry: expiresAt,
        gmail_email: userInfo.email ?? null,
      })
      .eq('id', state)

    return NextResponse.redirect(`${appUrl}/settings?gmail=connected`)
  } catch (err: unknown) {
    console.error('[gmail callback] error:', err)
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_callback_error`)
  }
}
