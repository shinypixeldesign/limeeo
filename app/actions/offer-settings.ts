'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type OfferSettingsState = { error?: string; message?: string } | undefined

export async function saveOfferSettingsAction(state: OfferSettingsState, formData: FormData): Promise<OfferSettingsState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const { error } = await supabase.from('profiles').update({
    offer_series_prefix: (formData.get('offer_series_prefix') as string)?.trim().toUpperCase() || 'OFR',
    offer_default_intro: (formData.get('offer_default_intro') as string) || null,
    offer_default_terms: (formData.get('offer_default_terms') as string) || null,
    offer_default_notes: (formData.get('offer_default_notes') as string) || null,
    offer_default_validity: parseInt(formData.get('offer_default_validity') as string) || 30,
    offer_brand_color: (formData.get('offer_brand_color') as string) || '#6366f1',
  }).eq('id', user.id)

  if (error) return { error: `Eroare: ${error.message}` }

  revalidatePath('/offers/settings')
  return { message: 'Setările au fost salvate!' }
}
