'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PipelineState =
  | { error?: string; message?: string }
  | undefined

export async function createPipelineItemAction(state: PipelineState, formData: FormData): Promise<PipelineState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Titlul este obligatoriu.' }

  const stage = (formData.get('stage') as string) || 'lead'
  const clientId = formData.get('client_id') as string
  const value = formData.get('value') as string
  const currency = (formData.get('currency') as string) || 'RON'
  const probability = formData.get('probability') as string
  const expectedClose = formData.get('expected_close') as string
  const notes = formData.get('notes') as string

  // Get max position in stage
  const { data: existing } = await supabase
    .from('pipeline_items')
    .select('position')
    .eq('user_id', user.id)
    .eq('stage', stage)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0

  const { error } = await supabase.from('pipeline_items').insert({
    user_id: user.id,
    client_id: clientId || null,
    title,
    stage,
    value: value ? parseFloat(value) : null,
    currency,
    probability: probability ? parseInt(probability, 10) : null,
    expected_close: expectedClose || null,
    notes: notes || null,
    position: nextPosition,
  })

  if (error) return { error: 'Eroare la salvare. Încearcă din nou.' }

  revalidatePath('/pipeline')
  return { message: 'Oportunitate adăugată.' }
}

export async function updatePipelineItemStageAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  const stage = formData.get('stage') as string
  if (!id || !stage) return

  await supabase
    .from('pipeline_items')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/pipeline')
}

export async function deletePipelineItemAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  await supabase.from('pipeline_items').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/pipeline')
}

export async function updatePipelineItemAction(state: PipelineState, formData: FormData): Promise<PipelineState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Titlul este obligatoriu.' }

  const clientId = formData.get('client_id') as string
  const value = formData.get('value') as string
  const currency = (formData.get('currency') as string) || 'RON'
  const probability = formData.get('probability') as string
  const expectedClose = formData.get('expected_close') as string
  const notes = formData.get('notes') as string
  const stage = formData.get('stage') as string

  const { error } = await supabase
    .from('pipeline_items')
    .update({
      client_id: clientId || null,
      title,
      stage,
      value: value ? parseFloat(value) : null,
      currency,
      probability: probability ? parseInt(probability, 10) : null,
      expected_close: expectedClose || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/pipeline')
  return { message: 'Oportunitate actualizată.' }
}
