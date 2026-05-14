'use server'

import { createClient } from '@/lib/supabase/server'

export async function createReportShareAction(payload: {
  periodLabel: string
  clientName: string | null
  data: object
}): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      user_id:      user.id,
      period_label: payload.periodLabel,
      client_name:  payload.clientName,
      data:         payload.data,
    })
    .select('token')
    .single()

  if (error || !data) return { error: 'Eroare la generare link.' }
  return { token: data.token }
}
