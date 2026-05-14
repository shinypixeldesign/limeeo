'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ProjectState =
  | { error?: string; message?: string }
  | undefined

const FREE_PROJECT_LIMIT = 2

export async function createProjectAction(state: ProjectState, formData: FormData): Promise<ProjectState> {
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
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= FREE_PROJECT_LIMIT) {
      return { error: `Planul Free permite maxim ${FREE_PROJECT_LIMIT} proiecte. Fă upgrade la Solo pentru proiecte nelimitate.` }
    }
  }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele proiectului este obligatoriu.' }

  const clientId = formData.get('client_id') as string
  const budget = formData.get('budget') as string
  const startDate = formData.get('start_date') as string
  const deadline = formData.get('deadline') as string

  const tagsRaw = formData.get('tags') as string
  let tags: string[] = []
  try { tags = tagsRaw ? JSON.parse(tagsRaw) : [] } catch { tags = [] }

  const { data, error } = await supabase.from('projects').insert({
    user_id: user.id,
    client_id: clientId || null,
    name,
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as string) || 'active',
    budget: budget ? parseFloat(budget) : null,
    currency: (formData.get('currency') as string) || 'RON',
    start_date: startDate || null,
    deadline: deadline || null,
    tags,
  }).select('id').single()

  if (error) return { error: 'Eroare la salvare. Încearcă din nou.' }

  revalidatePath('/projects')
  redirect(`/projects/${data.id}`)
}

export async function updateProjectAction(state: ProjectState, formData: FormData): Promise<ProjectState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Numele proiectului este obligatoriu.' }

  const clientId = formData.get('client_id') as string
  const budget = formData.get('budget') as string
  const startDate = formData.get('start_date') as string
  const deadline = formData.get('deadline') as string

  const tagsRaw = formData.get('tags') as string
  let tags: string[] = []
  try { tags = tagsRaw ? JSON.parse(tagsRaw) : [] } catch { tags = [] }

  const { error } = await supabase
    .from('projects')
    .update({
      client_id: clientId || null,
      name,
      description: (formData.get('description') as string) || null,
      status: formData.get('status') as string,
      budget: budget ? parseFloat(budget) : null,
      currency: (formData.get('currency') as string) || 'RON',
      start_date: startDate || null,
      deadline: deadline || null,
      tags,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  redirect(`/projects/${id}`)
}

export async function deleteProjectAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/projects')
  redirect('/projects')
}
