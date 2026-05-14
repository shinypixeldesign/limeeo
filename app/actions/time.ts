'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TimeState = { error?: string; message?: string } | undefined

// ─── Time Entries ──────────────────────────────────────────────────────────

export async function createTimeEntryAction(state: TimeState, formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const startedAt = formData.get('started_at') as string
  const endedAt   = formData.get('ended_at') as string
  if (!startedAt) return { error: 'Data de start este obligatorie.' }

  let durationMinutes: number | null = null
  if (endedAt) {
    const diff = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000
    durationMinutes = Math.round(diff)
    if (durationMinutes <= 0) return { error: 'Durata trebuie să fie pozitivă.' }
  }

  const tagIds = (formData.getAll('tag_ids') as string[]).filter(Boolean)

  const { error } = await supabase.from('time_entries').insert({
    user_id:          user.id,
    project_id:       (formData.get('project_id') as string) || null,
    client_id:        (formData.get('client_id') as string) || null,
    description:      (formData.get('description') as string) || null,
    started_at:       startedAt,
    ended_at:         endedAt || null,
    duration_minutes: durationMinutes,
    hourly_rate:      parseFloat(formData.get('hourly_rate') as string) || 0,
    currency:         (formData.get('currency') as string) || 'RON',
    is_billable:      formData.get('is_billable') !== 'false',
    is_invoiced:      false,
    tag_ids:          tagIds,
  })

  if (error) return { error: 'Eroare la salvare.' }
  revalidatePath('/time')
  return { message: 'Înregistrat!' }
}

export async function startTimerAction(formData: FormData): Promise<TimeState & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  // Oprește orice timer activ înainte de a porni unul nou
  const { data: running } = await supabase
    .from('time_entries')
    .select('id, started_at')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single()

  if (running) {
    const now = new Date().toISOString()
    const mins = Math.round((new Date(now).getTime() - new Date(running.started_at).getTime()) / 60000)
    await supabase.from('time_entries')
      .update({ ended_at: now, duration_minutes: mins })
      .eq('id', running.id)
  }

  const tagIds = (formData.getAll('tag_ids') as string[]).filter(Boolean)

  const { data, error } = await supabase.from('time_entries').insert({
    user_id:     user.id,
    project_id:  (formData.get('project_id') as string) || null,
    client_id:   (formData.get('client_id') as string) || null,
    description: (formData.get('description') as string) || null,
    started_at:  new Date().toISOString(),
    ended_at:    null,
    hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
    currency:    (formData.get('currency') as string) || 'RON',
    is_billable: true,
    is_invoiced: false,
    tag_ids:     tagIds,
  }).select('id').single()

  if (error || !data) return { error: 'Eroare la pornire timer.' }
  revalidatePath('/time')
  return { id: data.id } // ← returnăm ID-ul real
}

export async function stopTimerAction(formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id        = formData.get('id') as string
  const startedAt = formData.get('started_at') as string
  const now       = new Date().toISOString()
  const durationMinutes = Math.round((new Date(now).getTime() - new Date(startedAt).getTime()) / 60000)

  const { error } = await supabase.from('time_entries')
    .update({ ended_at: now, duration_minutes: durationMinutes })
    .eq('id', id).eq('user_id', user.id)

  if (error) return { error: 'Eroare la oprire timer.' }
  revalidatePath('/time')
  return {}
}

export async function deleteTimeEntryAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('time_entries').delete()
    .eq('id', formData.get('id') as string)
    .eq('user_id', user.id)
  revalidatePath('/time')
}

export async function markInvoicedAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const ids = formData.getAll('ids') as string[]
  await supabase.from('time_entries')
    .update({ is_invoiced: true })
    .in('id', ids).eq('user_id', user.id)
  revalidatePath('/time')
}

export async function updateTimeEntryAction(formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id        = formData.get('id') as string
  const startedAt = formData.get('started_at') as string
  const endedAt   = (formData.get('ended_at') as string) || null

  let durationMinutes: number | null = null
  if (startedAt && endedAt) {
    const diff = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000
    durationMinutes = Math.round(diff)
    if (durationMinutes <= 0) return { error: 'Durata trebuie să fie pozitivă.' }
  }

  const tagIds = (formData.getAll('tag_ids') as string[]).filter(Boolean)

  const { error } = await supabase.from('time_entries')
    .update({
      description:      (formData.get('description') as string) || null,
      started_at:       startedAt,
      ended_at:         endedAt,
      duration_minutes: durationMinutes,
      client_id:        (formData.get('client_id') as string) || null,
      project_id:       (formData.get('project_id') as string) || null,
      hourly_rate:      parseFloat(formData.get('hourly_rate') as string) || 0,
      currency:         (formData.get('currency') as string) || 'RON',
      is_billable:      formData.get('is_billable') === 'true',
      tag_ids:          tagIds,
    })
    .eq('id', id).eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }
  revalidatePath('/time')
  return { message: 'Actualizat!' }
}

// ─── Tags ──────────────────────────────────────────────────────────────────

export async function createTagAction(formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const name  = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#6366f1'
  if (!name) return { error: 'Numele este obligatoriu.' }

  const { error } = await supabase.from('time_tags').insert({ user_id: user.id, name, color })
  if (error) return { error: 'Eroare la salvare.' }
  revalidatePath('/time')
  return { message: 'Tag adăugat!' }
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('time_tags').delete()
    .eq('id', formData.get('id') as string)
    .eq('user_id', user.id)
  revalidatePath('/time')
}

// ─── Client Rates ──────────────────────────────────────────────────────────

export async function saveClientRateAction(formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const clientId   = formData.get('client_id') as string
  const hourlyRate = parseFloat(formData.get('hourly_rate') as string) || 0
  const currency   = (formData.get('currency') as string) || 'RON'

  if (!clientId) return { error: 'Client lipsă.' }

  const { error } = await supabase.from('client_rates').upsert(
    { user_id: user.id, client_id: clientId, hourly_rate: hourlyRate, currency },
    { onConflict: 'user_id,client_id' }
  )

  if (error) return { error: 'Eroare la salvare.' }
  revalidatePath('/time')
  return { message: 'Tarif salvat!' }
}

// ─── Time Settings ─────────────────────────────────────────────────────────

export async function saveTimeSettingsAction(formData: FormData): Promise<TimeState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const defaultRate     = parseFloat(formData.get('default_rate') as string) || 0
  const defaultCurrency = (formData.get('default_currency') as string) || 'RON'

  const { error } = await supabase.from('time_settings').upsert(
    { user_id: user.id, default_rate: defaultRate, default_currency: defaultCurrency, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  if (error) return { error: 'Eroare la salvare.' }
  revalidatePath('/time')
  return { message: 'Setări salvate!' }
}
