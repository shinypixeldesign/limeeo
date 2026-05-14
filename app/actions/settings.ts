'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SettingsState =
  | { error?: string; success?: string }
  | undefined

export async function saveProfileAction(state: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const company_name = (formData.get('company_name') as string)?.trim() || null
  const company_cui = (formData.get('company_cui') as string)?.trim() || null
  const company_j = (formData.get('company_j') as string)?.trim() || null
  const company_address = (formData.get('company_address') as string)?.trim() || null
  const company_city = (formData.get('company_city') as string)?.trim() || null
  const company_county = (formData.get('company_county') as string)?.trim() || null
  const company_iban = (formData.get('company_iban') as string)?.trim() || null
  const company_bank = (formData.get('company_bank') as string)?.trim() || null
  const company_phone = (formData.get('company_phone') as string)?.trim() || null
  const company_email = (formData.get('company_email') as string)?.trim() || null
  const company_website = (formData.get('company_website') as string)?.trim() || null
  const logo_url = (formData.get('logo_url') as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      company_name,
      company_cui,
      company_j,
      company_address,
      company_city,
      company_county,
      company_iban,
      company_bank,
      company_phone,
      company_email,
      company_website,
      logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: 'Eroare la salvare. Încearcă din nou.' }

  revalidatePath('/settings')
  return { success: 'Profilul a fost salvat cu succes!' }
}
