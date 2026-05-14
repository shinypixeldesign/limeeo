'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ClientState =
  | { error?: string; message?: string }
  | undefined

// Limita plan Free
const FREE_CLIENT_LIMIT = 3

export async function createClientAction(state: ClientState, formData: FormData): Promise<ClientState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  // Verifică limita plan Free
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan === 'free') {
    const { count } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= FREE_CLIENT_LIMIT) {
      return { error: `Planul Free permite maxim ${FREE_CLIENT_LIMIT} clienți. Fă upgrade la Solo pentru clienți nelimitați.` }
    }
  }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele clientului este obligatoriu.' }

  const { error } = await supabase.from('clients').insert({
    user_id:  user.id,
    name,
    email:    (formData.get('email') as string) || null,
    phone:    (formData.get('phone') as string) || null,
    company:  (formData.get('company') as string) || null,
    website:  (formData.get('website') as string) || null,
    status:   (formData.get('status') as string) || 'active',
    notes:    (formData.get('notes') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    cui:      (formData.get('cui') as string) || null,
    reg_com:  (formData.get('reg_com') as string) || null,
    address:  (formData.get('address') as string) || null,
    city:     (formData.get('city') as string) || null,
    county:   (formData.get('county') as string) || null,
  })

  if (error) return { error: 'Eroare la salvare. Încearcă din nou.' }

  revalidatePath('/clients')
  redirect('/clients')
}

export async function updateClientAction(state: ClientState, formData: FormData): Promise<ClientState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele clientului este obligatoriu.' }

  const { error } = await supabase
    .from('clients')
    .update({
      name,
      email:    (formData.get('email') as string) || null,
      phone:    (formData.get('phone') as string) || null,
      company:  (formData.get('company') as string) || null,
      website:  (formData.get('website') as string) || null,
      status:   formData.get('status') as string,
      notes:    (formData.get('notes') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      cui:      (formData.get('cui') as string) || null,
      reg_com:  (formData.get('reg_com') as string) || null,
      address:  (formData.get('address') as string) || null,
      city:     (formData.get('city') as string) || null,
      county:   (formData.get('county') as string) || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  redirect(`/clients/${id}`)
}

export async function deleteClientAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/clients')
  redirect('/clients')
}
