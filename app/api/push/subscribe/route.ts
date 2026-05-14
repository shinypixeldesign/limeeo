import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SubscribeBody {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })

  let body: SubscribeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body invalid.' }, { status: 400 })
  }

  const { endpoint, keys } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Date incomplete.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
