'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OfferPackageItem } from '@/types/database'

export type PackageState = { error?: string; message?: string } | undefined

export async function createPackageAction(state: PackageState, formData: FormData): Promise<PackageState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele pachetului este obligatoriu.' }

  const itemsJson = formData.get('items_json') as string
  let items: OfferPackageItem[] = []
  try { items = JSON.parse(itemsJson || '[]') } catch { /* ignore */ }

  if (items.filter(i => i.title.trim()).length === 0)
    return { error: 'Adaugă cel puțin un serviciu cu titlu.' }

  const { error } = await supabase.from('offer_packages').insert({
    user_id:     user.id,
    name,
    description: (formData.get('description') as string) || null,
    category:    (formData.get('category') as string) || '',
    items:       items.filter(i => i.title.trim()),
  })

  if (error) return { error: 'Eroare la salvare.' }
  revalidatePath('/offers/packages')
  return { message: 'Pachet salvat!' }
}

export async function updatePackageAction(state: PackageState, formData: FormData): Promise<PackageState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele pachetului este obligatoriu.' }

  const itemsJson = formData.get('items_json') as string
  let items: OfferPackageItem[] = []
  try { items = JSON.parse(itemsJson || '[]') } catch { /* ignore */ }

  if (items.filter(i => i.title.trim()).length === 0)
    return { error: 'Adaugă cel puțin un serviciu cu titlu.' }

  const { error } = await supabase.from('offer_packages')
    .update({
      name,
      description: (formData.get('description') as string) || null,
      category:    (formData.get('category') as string) || '',
      items:       items.filter(i => i.title.trim()),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }
  revalidatePath('/offers/packages')
  return { message: 'Pachet actualizat!' }
}

export async function deletePackageAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('offer_packages')
    .delete()
    .eq('id', formData.get('id') as string)
    .eq('user_id', user.id)

  revalidatePath('/offers/packages')
}
