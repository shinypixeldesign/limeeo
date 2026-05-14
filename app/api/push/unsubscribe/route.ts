import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UnsubscribeBody {
  endpoint: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautorizat.' }, { status: 401 })

  let body: UnsubscribeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body invalid.' }, { status: 400 })
  }

  const { endpoint } = body
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint lipsă.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
