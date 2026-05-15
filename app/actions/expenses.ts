'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ExpenseCategory = 'labor' | 'materials' | 'software' | 'travel' | 'marketing' | 'equipment' | 'other'
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'other'

export interface ExpenseState {
  error?: string
  success?: boolean
}

export async function addExpenseAction(
  _state: ExpenseState | undefined,
  formData: FormData
): Promise<ExpenseState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const projectId = formData.get('project_id') as string
  const description = (formData.get('description') as string)?.trim()
  const amountStr = formData.get('amount') as string
  const amount = parseFloat(amountStr)

  if (!description) return { error: 'Descrierea este obligatorie.' }
  if (!amount || amount <= 0) return { error: 'Suma trebuie să fie pozitivă.' }
  if (!projectId) return { error: 'ID proiect lipsă.' }

  // Check that user owns the project OR is an accepted member with editor/manager role
  const { data: project } = await supabase.from('projects').select('id, user_id, currency').eq('id', projectId).single()
  if (!project) return { error: 'Proiect negăsit.' }

  const isOwner = project.user_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('member_user_id', user.id)
      .eq('status', 'accepted')
      .single()
    if (!membership || !['editor', 'manager'].includes(membership.role)) {
      return { error: 'Nu ai permisiunea să adaugi cheltuieli.' }
    }
  }

  const { error } = await supabase.from('project_expenses').insert({
    project_id: projectId,
    user_id: user.id,
    date: formData.get('date') as string || new Date().toISOString().slice(0, 10),
    category: (formData.get('category') as string) || 'other',
    description,
    amount,
    currency: project.currency || 'RON',
    payment_method: (formData.get('payment_method') as string) || 'card',
    vendor: (formData.get('vendor') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  })

  if (error) {
    console.error('[addExpense]', error)
    return { error: 'Eroare la salvarea cheltuielii.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const expenseId = formData.get('expense_id') as string
  const projectId = formData.get('project_id') as string

  // Only owner can delete
  await supabase
    .from('project_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id)

  revalidatePath(`/projects/${projectId}`)
}
