import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })

  await supabase
    .from('profiles')
    .update({
      outlook_access_token: null,
      outlook_refresh_token: null,
      outlook_token_expiry: null,
      outlook_email: null,
    })
    .eq('id', user.id)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(`${appUrl}/settings?outlook=disconnected`)
}
