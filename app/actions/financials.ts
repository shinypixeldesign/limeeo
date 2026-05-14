'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { InvoiceItem } from '@/types/database'

export type FinancialState =
  | { error?: string; message?: string }
  | undefined

function parseItems(formData: FormData): InvoiceItem[] {
  const descriptions = formData.getAll('item_description') as string[]
  const quantities   = formData.getAll('item_quantity') as string[]
  const ums          = formData.getAll('item_um') as string[]
  const prices       = formData.getAll('item_price') as string[]

  return descriptions
    .map((desc, i) => {
      const qty   = parseFloat(quantities[i] ?? '1') || 1
      const price = parseFloat(prices[i] ?? '0') || 0
      return {
        description: desc.trim(),
        quantity: qty,
        um: (ums[i] ?? 'buc').trim() || 'buc',
        unit_price: price,
        total: Math.round(qty * price * 100) / 100,
      }
    })
    .filter((item) => item.description && item.unit_price > 0)
}

function calcTotals(
  items: InvoiceItem[],
  discountType: string,
  discountValue: number,
  taxRate: number,
) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100
  let discountAmount = 0
  if (discountType === 'percent') discountAmount = Math.round(subtotal * (discountValue / 100) * 100) / 100
  else if (discountType === 'fixed') discountAmount = Math.min(discountValue, subtotal)
  const taxable   = subtotal - discountAmount
  const taxAmount = Math.round(taxable * (taxRate / 100) * 100) / 100
  const total     = Math.round((taxable + taxAmount) * 100) / 100
  return { subtotal, discountAmount, taxAmount, total }
}

async function generateNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: string,
) {
  const prefix = type === 'invoice' ? 'F' : 'O'
  const year   = new Date().getFullYear()
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}${year}-${seq}`
}

export async function createInvoiceAction(state: FinancialState, formData: FormData): Promise<FinancialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const items = parseItems(formData)
  if (items.length === 0) return { error: 'Adaugă cel puțin un rând cu descriere și preț.' }

  const type          = (formData.get('type') as string) || 'invoice'
  const discountType  = (formData.get('discount_type') as string) || 'none'
  const discountValue = parseFloat(formData.get('discount_value') as string) || 0
  const taxRate       = parseFloat(formData.get('tax_rate') as string) || 0
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(items, discountType, discountValue, taxRate)

  const number    = await generateNumber(supabase, user.id, type)
  const clientId  = formData.get('client_id') as string
  const projectId = formData.get('project_id') as string
  const issueDate = formData.get('issue_date') as string
  const dueDate   = formData.get('due_date') as string

  const { data, error } = await supabase.from('invoices').insert({
    user_id:         user.id,
    client_id:       clientId || null,
    project_id:      projectId || null,
    type,
    number,
    status:          (formData.get('status') as string) || 'draft',
    issue_date:      issueDate || new Date().toISOString().split('T')[0],
    due_date:        dueDate || null,
    items,
    subtotal,
    discount_type:   discountType,
    discount_value:  discountValue,
    discount_amount: discountAmount,
    tax_rate:        taxRate,
    tax_amount:      taxAmount,
    total,
    currency:        (formData.get('currency') as string) || 'RON',
    notes:           (formData.get('notes') as string) || null,
  }).select('id').single()

  if (error) return { error: 'Eroare la salvare. Încearcă din nou.' }

  revalidatePath('/financials')
  redirect(`/financials/${data.id}`)
}

export async function updateInvoiceAction(state: FinancialState, formData: FormData): Promise<FinancialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const items = parseItems(formData)
  if (items.length === 0) return { error: 'Adaugă cel puțin un rând cu descriere și preț.' }

  const discountType  = (formData.get('discount_type') as string) || 'none'
  const discountValue = parseFloat(formData.get('discount_value') as string) || 0
  const taxRate       = parseFloat(formData.get('tax_rate') as string) || 0
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(items, discountType, discountValue, taxRate)

  const clientId  = formData.get('client_id') as string
  const projectId = formData.get('project_id') as string
  const dueDate   = formData.get('due_date') as string

  const { error } = await supabase.from('invoices').update({
    client_id:       clientId || null,
    project_id:      projectId || null,
    status:          formData.get('status') as string,
    issue_date:      formData.get('issue_date') as string,
    due_date:        dueDate || null,
    items,
    subtotal,
    discount_type:   discountType,
    discount_value:  discountValue,
    discount_amount: discountAmount,
    tax_rate:        taxRate,
    tax_amount:      taxAmount,
    total,
    currency:        (formData.get('currency') as string) || 'RON',
    notes:           (formData.get('notes') as string) || null,
  }).eq('id', id).eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/financials')
  revalidatePath(`/financials/${id}`)
  redirect(`/financials/${id}`)
}

export async function deleteInvoiceAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  await supabase.from('invoices').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/financials')
  redirect('/financials')
}

export async function markInvoicePaidAction(formData: FormData): Promise<FinancialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id      = formData.get('id') as string
  const paidAt  = (formData.get('paid_at') as string) || new Date().toISOString()

  const { error } = await supabase.from('invoices')
    .update({ status: 'paid', paid_at: paidAt })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/financials')
  revalidatePath(`/financials/${id}`)
  return { message: 'Factura a fost marcată ca plătită.' }
}

export async function markInvoiceSentAction(formData: FormData): Promise<FinancialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string

  const { error } = await supabase.from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .in('status', ['draft'])

  if (error) return { error: 'Eroare la actualizare.' }

  revalidatePath('/financials')
  revalidatePath(`/financials/${id}`)
  return { message: 'Factura a fost marcată ca trimisă.' }
}

export async function markInvoiceOverdueAction(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('invoices')
    .update({ status: 'overdue' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sent')

  revalidatePath('/financials')
  revalidatePath(`/financials/${id}`)
}

export async function duplicateInvoiceAction(formData: FormData): Promise<FinancialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  const { data: original } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!original) return { error: 'Factura originală nu a fost găsită.' }

  const number = await generateNumber(supabase, user.id, original.type)

  const today = new Date().toISOString().split('T')[0]
  const { data: newInv, error } = await supabase.from('invoices').insert({
    user_id:         user.id,
    client_id:       original.client_id,
    project_id:      original.project_id,
    type:            original.type,
    number,
    status:          'draft',
    issue_date:      today,
    due_date:        null,
    items:           original.items,
    subtotal:        original.subtotal,
    discount_type:   original.discount_type ?? 'none',
    discount_value:  original.discount_value ?? 0,
    discount_amount: original.discount_amount ?? 0,
    tax_rate:        original.tax_rate,
    tax_amount:      original.tax_amount,
    total:           original.total,
    currency:        original.currency,
    notes:           original.notes,
  }).select('id').single()

  if (error || !newInv) return { error: `Eroare la duplicare: ${error?.message}` }

  revalidatePath('/financials')
  redirect(`/financials/${newInv.id}/edit`)
}
