'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AutomationState =
  | { error?: string; message?: string }
  | undefined

export async function createAutomationRule(
  state: AutomationState,
  formData: FormData,
): Promise<AutomationState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const triggerType = formData.get('trigger_type') as string
  const triggerDays = parseInt(formData.get('trigger_days') as string) || 3
  const name = formData.get('name') as string
  const emailSubject = (formData.get('email_subject') as string) || null
  const emailBody = (formData.get('email_body') as string) || null

  if (!triggerType) return { error: 'Selectează un tip de trigger.' }
  if (!name?.trim()) return { error: 'Numele regulii este obligatoriu.' }

  const { error } = await supabase.from('automation_rules').insert({
    user_id: user.id,
    name: name.trim(),
    trigger_type: triggerType,
    trigger_days: triggerDays,
    email_subject: emailSubject,
    email_body: emailBody,
    is_active: true,
  })

  if (error) return { error: `Eroare la salvare: ${error.message}` }

  revalidatePath('/automations')
  return { message: 'Regula a fost creată cu succes.' }
}

export async function toggleAutomationRule(id: string, isActive: boolean): Promise<AutomationState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const { error } = await supabase
    .from('automation_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `Eroare la actualizare: ${error.message}` }

  revalidatePath('/automations')
  return { message: isActive ? 'Regula a fost activată.' : 'Regula a fost dezactivată.' }
}

export async function deleteAutomationRule(
  _state: AutomationState,
  formData: FormData,
): Promise<AutomationState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `Eroare la ștergere: ${error.message}` }

  revalidatePath('/automations')
  return { message: 'Regula a fost ștearsă.' }
}

export async function updateAutomationRule(
  state: AutomationState,
  formData: FormData,
): Promise<AutomationState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const name = formData.get('name') as string
  if (!name?.trim()) return { error: 'Numele regulii este obligatoriu.' }

  const { error } = await supabase
    .from('automation_rules')
    .update({
      name: name.trim(),
      trigger_type: formData.get('trigger_type') as string,
      trigger_days: parseInt(formData.get('trigger_days') as string) || 3,
      email_subject: (formData.get('email_subject') as string) || null,
      email_body: (formData.get('email_body') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: `Eroare la actualizare: ${error.message}` }

  revalidatePath('/automations')
  return { message: 'Regula a fost actualizată.' }
}
