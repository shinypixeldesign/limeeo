'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendPushToUser } from '@/lib/push'
import { createNotification } from '@/lib/notifications'

export type OfferState =
  | { error?: string; message?: string }
  | undefined

interface ItemInput {
  type: string
  category: string
  title: string
  description: string
  deliverables: string
  timeline: string
  quantity: string
  unit_price: string
}

function parseOfferItems(formData: FormData): ItemInput[] {
  const types = formData.getAll('item_type') as string[]
  const categories = formData.getAll('item_category') as string[]
  const titles = formData.getAll('item_title') as string[]
  const descriptions = formData.getAll('item_description') as string[]
  const deliverables = formData.getAll('item_deliverables') as string[]
  const timelines = formData.getAll('item_timeline') as string[]
  const quantities = formData.getAll('item_quantity') as string[]
  const prices = formData.getAll('item_price') as string[]

  return titles.map((title, i) => ({
    type: types[i] ?? 'fix',
    category: (categories[i] ?? '').trim(),
    title: title.trim(),
    description: (descriptions[i] ?? '').trim(),
    deliverables: (deliverables[i] ?? '').trim(),
    timeline: (timelines[i] ?? '').trim(),
    quantity: quantities[i] ?? '1',
    unit_price: prices[i] ?? '0',
  })).filter(item => item.title.length > 0)
}

function calcTotals(
  items: { quantity: number; unit_price: number }[],
  discountType: string,
  discountValue: number,
  taxRate: number,
) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100) / 100
  let discountAmount = 0
  if (discountType === 'percent') discountAmount = Math.round(subtotal * (discountValue / 100) * 100) / 100
  else if (discountType === 'fixed') discountAmount = Math.min(discountValue, subtotal)
  const taxable = subtotal - discountAmount
  const taxAmount = Math.round(taxable * (taxRate / 100) * 100) / 100
  const total = Math.round((taxable + taxAmount) * 100) / 100
  return { subtotal, discountAmount, taxAmount, total }
}

async function generateOfferNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  prefix = 'OFR',
) {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('offers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}${year}-${seq}`
}

export async function createOfferAction(state: OfferState, formData: FormData): Promise<OfferState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const rawItems = parseOfferItems(formData)
  if (rawItems.length === 0) return { error: 'Adaugă cel puțin un serviciu cu titlu și preț.' }

  const discountType = (formData.get('discount_type') as string) || 'none'
  const discountValue = parseFloat(formData.get('discount_value') as string) || 0
  const taxRate = parseFloat(formData.get('tax_rate') as string) || 0

  const numericItems = rawItems.map(i => ({
    ...i,
    quantity: parseFloat(i.quantity) || 1,
    unit_price: parseFloat(i.unit_price) || 0,
  }))

  const { subtotal, discountAmount, taxAmount, total } = calcTotals(numericItems, discountType, discountValue, taxRate)

  const validityDays = parseInt(formData.get('validity_days') as string) || 30
  const validUntilRaw = formData.get('valid_until') as string
  const validUntil = validUntilRaw || (() => {
    const d = new Date()
    d.setDate(d.getDate() + validityDays)
    return d.toISOString().split('T')[0]
  })()

  const { data: profile } = await supabase.from('profiles').select('offer_series_prefix, offer_default_intro, offer_default_terms, offer_default_notes, offer_default_validity, offer_brand_color').eq('id', user.id).single()
  const prefix = (profile?.offer_series_prefix as string | null)?.trim().toUpperCase() || 'OFR'
  const number = await generateOfferNumber(supabase, user.id, prefix)
  const clientId = formData.get('client_id') as string
  const projectId = formData.get('project_id') as string

  const { data: offer, error } = await supabase.from('offers').insert({
    user_id: user.id,
    client_id: clientId || null,
    project_id: projectId || null,
    number,
    title: (formData.get('title') as string) || null,
    status: 'draft',
    brand_color: (formData.get('brand_color') as string) || '#6366f1',
    intro_text: (formData.get('intro_text') as string) || null,
    terms_text: (formData.get('terms_text') as string) || null,
    notes: (formData.get('notes') as string) || null,
    currency: (formData.get('currency') as string) || 'RON',
    validity_days: validityDays,
    valid_until: validUntil,
    discount_type: discountType,
    discount_value: discountValue,
    tax_rate: taxRate,
    subtotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total,
    payment_conditions: (formData.get('payment_conditions') as string) || null,
    project_start_date: (formData.get('project_start_date') as string) || null,
    revisions_included: formData.get('revisions_included') ? parseInt(formData.get('revisions_included') as string) : null,
  }).select('id').single()

  if (error || !offer) return { error: `Eroare la salvare: ${error?.message ?? 'necunoscută'}` }

  // Insert items
  const itemsToInsert = numericItems.map((item, i) => ({
    offer_id: offer.id,
    position: i,
    type: item.type,
    category: item.category || null,
    title: item.title,
    description: item.description || null,
    deliverables: item.deliverables || null,
    timeline: item.timeline || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: Math.round(item.quantity * item.unit_price * 100) / 100,
  }))

  await supabase.from('offer_items').insert(itemsToInsert)

  revalidatePath('/offers')
  redirect(`/offers/${offer.id}`)
}

export async function updateOfferAction(state: OfferState, formData: FormData): Promise<OfferState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const rawItems = parseOfferItems(formData)
  if (rawItems.length === 0) return { error: 'Adaugă cel puțin un serviciu cu titlu și preț.' }

  const discountType = (formData.get('discount_type') as string) || 'none'
  const discountValue = parseFloat(formData.get('discount_value') as string) || 0
  const taxRate = parseFloat(formData.get('tax_rate') as string) || 0

  const numericItems = rawItems.map(i => ({
    ...i,
    quantity: parseFloat(i.quantity) || 1,
    unit_price: parseFloat(i.unit_price) || 0,
  }))

  const { subtotal, discountAmount, taxAmount, total } = calcTotals(numericItems, discountType, discountValue, taxRate)

  const validityDays = parseInt(formData.get('validity_days') as string) || 30
  const validUntilRaw = formData.get('valid_until') as string
  const validUntil = validUntilRaw || null

  const { error } = await supabase.from('offers').update({
    client_id: (formData.get('client_id') as string) || null,
    project_id: (formData.get('project_id') as string) || null,
    title: (formData.get('title') as string) || null,
    brand_color: (formData.get('brand_color') as string) || '#6366f1',
    intro_text: (formData.get('intro_text') as string) || null,
    terms_text: (formData.get('terms_text') as string) || null,
    notes: (formData.get('notes') as string) || null,
    currency: (formData.get('currency') as string) || 'RON',
    validity_days: validityDays,
    valid_until: validUntil,
    discount_type: discountType,
    discount_value: discountValue,
    tax_rate: taxRate,
    subtotal,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total,
    payment_conditions: (formData.get('payment_conditions') as string) || null,
    project_start_date: (formData.get('project_start_date') as string) || null,
    revisions_included: formData.get('revisions_included') ? parseInt(formData.get('revisions_included') as string) : null,
  }).eq('id', id).eq('user_id', user.id)

  if (error) return { error: `Eroare la actualizare: ${error.message}` }

  // Replace all items
  await supabase.from('offer_items').delete().eq('offer_id', id)
  const itemsToInsert = numericItems.map((item, i) => ({
    offer_id: id,
    position: i,
    type: item.type,
    category: item.category || null,
    title: item.title,
    description: item.description || null,
    deliverables: item.deliverables || null,
    timeline: item.timeline || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: Math.round(item.quantity * item.unit_price * 100) / 100,
  }))
  await supabase.from('offer_items').insert(itemsToInsert)

  revalidatePath('/offers')
  revalidatePath(`/offers/${id}`)
  redirect(`/offers/${id}`)
}

export async function duplicateOfferAction(formData: FormData): Promise<OfferState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  if (!id) return { error: 'ID lipsă.' }

  const { data: original } = await supabase
    .from('offers')
    .select('*, offer_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!original) return { error: 'Oferta originală nu a fost găsită.' }

  const number = await generateOfferNumber(supabase, user.id)

  const { data: newOffer, error } = await supabase.from('offers').insert({
    user_id: user.id,
    client_id: original.client_id,
    project_id: original.project_id,
    number,
    title: original.title ? `${original.title} (copie)` : null,
    status: 'draft',
    brand_color: original.brand_color,
    intro_text: original.intro_text,
    terms_text: original.terms_text,
    notes: original.notes,
    currency: original.currency,
    validity_days: original.validity_days,
    valid_until: (() => {
      const d = new Date()
      d.setDate(d.getDate() + (original.validity_days ?? 30))
      return d.toISOString().split('T')[0]
    })(),
    discount_type: original.discount_type,
    discount_value: original.discount_value,
    tax_rate: original.tax_rate,
    subtotal: original.subtotal,
    discount_amount: original.discount_amount,
    tax_amount: original.tax_amount,
    total: original.total,
  }).select('id').single()

  if (error || !newOffer) return { error: `Eroare la duplicare: ${error?.message ?? 'necunoscută'}` }

  const items = (original.offer_items ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((item: { position: number; type: string; category: string | null; title: string; description: string | null; deliverables: string | null; timeline: string | null; quantity: number; unit_price: number; total: number }, i: number) => ({
      offer_id: newOffer.id,
      position: i,
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      deliverables: item.deliverables,
      timeline: item.timeline,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }))

  if (items.length > 0) await supabase.from('offer_items').insert(items)

  revalidatePath('/offers')
  redirect(`/offers/${newOffer.id}/edit`)
}

export async function deleteOfferAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id') as string
  await supabase.from('offers').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/offers')
  redirect('/offers')
}

export async function sendOfferAction(formData: FormData): Promise<OfferState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const id = formData.get('id') as string
  const { error } = await supabase.from('offers')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: 'Eroare la trimitere.' }

  revalidatePath('/offers')
  revalidatePath(`/offers/${id}`)
  return { message: 'Oferta a fost marcată ca trimisă.' }
}

// Public actions (no auth required — called from /o/[token])
export async function markOfferViewedAction(token: string) {
  const supabase = await createClient()
  await supabase.from('offers')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('token', token)
    .in('status', ['sent'])
}

export async function acceptOfferAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const token = formData.get('token') as string
  if (!token) return { ok: false, error: 'Token lipsă.' }

  const { data: offer } = await supabase
    .from('offers')
    .select('id, number, user_id, client:clients(name)')
    .eq('token', token)
    .single()

  const { error } = await supabase.from('offers')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('token', token)
    .in('status', ['sent', 'viewed'])

  if (error) return { ok: false, error: 'Eroare la acceptare.' }

  // Trimite push notification și notificare în-app la owner-ul ofertei
  if (offer?.user_id) {
    const clientName = (offer.client as { name?: string } | null)?.name ?? 'Clientul'
    await sendPushToUser(offer.user_id, {
      title: 'Ofertă acceptată!',
      body: `${clientName} a acceptat oferta ${offer.number}.`,
      url: `/offers/${offer.id}`,
    }).catch(() => {}) // nu blocăm dacă push eșuează
    await createNotification(offer.user_id, {
      type: 'offer_accepted',
      title: `Ofertă acceptată: ${offer.number}`,
      body: `Clientul ${clientName} a acceptat oferta.`,
      resource_href: `/offers/${offer.id}`,
    })
  }

  return { ok: true }
}

export async function rejectOfferAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const token = formData.get('token') as string
  const reason = formData.get('reason') as string
  if (!token) return { ok: false, error: 'Token lipsă.' }

  const { data: offer } = await supabase
    .from('offers')
    .select('id, number, user_id, client:clients(name)')
    .eq('token', token)
    .single()

  const { error } = await supabase.from('offers')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      refusal_reason: reason || null,
    })
    .eq('token', token)
    .in('status', ['sent', 'viewed'])

  if (error) return { ok: false, error: 'Eroare la respingere.' }

  // Trimite push notification și notificare în-app la owner-ul ofertei
  if (offer?.user_id) {
    const clientName = (offer.client as { name?: string } | null)?.name ?? 'Clientul'
    await sendPushToUser(offer.user_id, {
      title: 'Ofertă respinsă',
      body: `${clientName} a respins oferta ${offer.number}.`,
      url: `/offers/${offer.id}`,
    }).catch(() => {}) // nu blocăm dacă push eșuează
    await createNotification(offer.user_id, {
      type: 'offer_rejected',
      title: `Ofertă respinsă: ${offer.number}`,
      body: `Clientul ${clientName} a respins oferta.`,
      resource_href: `/offers/${offer.id}`,
    })
  }

  return { ok: true }
}
