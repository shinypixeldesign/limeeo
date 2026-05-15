'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SmartBillState = { error?: string; message?: string; smartbillNumber?: string } | undefined

// Mapare TVA rate → SmartBill tax name
function taxName(rate: number): string {
  if (rate === 19) return 'Normala'
  if (rate === 9)  return 'Redusa'
  if (rate === 5)  return 'Super-redusa'
  return 'Scutit'
}

function buildAuth(email: string, token: string): string {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

export async function emitToSmartBillAction(invoiceId: string): Promise<SmartBillState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  // Fetch profile (credențiale SmartBill)
  const { data: profile } = await supabase
    .from('profiles')
    .select('smartbill_email, smartbill_token, smartbill_series, company_cui')
    .eq('id', user.id)
    .single()

  if (!profile?.smartbill_email || !profile?.smartbill_token) {
    return { error: 'Configurează credențialele SmartBill în Setări.' }
  }

  // Fetch invoice + client
  const { data: inv } = await supabase
    .from('invoices')
    .select('*, client:clients(id,name,company,email,cui,reg_com,address,city,county,country)')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()

  if (!inv) return { error: 'Factura nu a fost găsită.' }
  if (inv.smartbill_number) return { error: `Deja emisă în SmartBill: ${inv.smartbill_number}` }

  const client = inv.client as { name: string; company: string | null; email: string | null; cui: string | null; reg_com: string | null; address: string | null; city: string | null; county: string | null; country: string | null } | null

  // Construim payload-ul JSON pentru SmartBill
  const products = (inv.items ?? []).map((item: { description: string; quantity: number; um: string; unit_price: number }) => ({
    name: item.description,
    measuringUnitName: item.um || 'buc',
    currency: inv.currency,
    quantity: item.quantity,
    price: item.unit_price,
    isTaxIncluded: false,
    taxName: taxName(inv.tax_rate),
    taxPercentage: inv.tax_rate,
    isDiscount: false,
    saveToDb: false,
    code: '',
  }))

  // Adaugă discount ca linie separată dacă există
  if (inv.discount_amount > 0) {
    products.push({
      name: inv.discount_type === 'percent'
        ? `Discount ${inv.discount_value}%`
        : 'Discount',
      measuringUnitName: 'buc',
      currency: inv.currency,
      quantity: 1,
      price: -inv.discount_amount,
      isTaxIncluded: false,
      taxName: taxName(inv.tax_rate),
      taxPercentage: inv.tax_rate,
      isDiscount: true,
      saveToDb: false,
      code: '',
    })
  }

  const vatCode = client?.cui?.replace(/^RO/i, '') ?? ''
  const isTaxPayer = !!client?.cui

  const payload = {
    companyVatCode: (profile.company_cui ?? '').replace(/^RO/i, ''),
    client: {
      name: client?.company ?? client?.name ?? 'Client necunoscut',
      vatCode: vatCode,
      regCom: client?.reg_com ?? '',
      address: client?.address ?? '',
      isTaxPayer,
      city: client?.city ?? '',
      county: client?.county ?? '',
      country: client?.country ?? 'Romania',
      email: client?.email ?? '',
      saveToDb: false,
    },
    issueDate: inv.issue_date,
    seriesName: profile.smartbill_series ?? 'FCT',
    isDraft: false,
    dueDate: inv.due_date ?? inv.issue_date,
    deliveryDate: null,
    precision: 2,
    currency: inv.currency,
    products,
    ...(inv.notes ? { mentions: inv.notes } : {}),
  }

  try {
    const res = await fetch('https://ws.smartbill.ro/SBORO/api/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': buildAuth(profile.smartbill_email, profile.smartbill_token),
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    if (!res.ok || json.errorText) {
      return { error: json.errorText || `Eroare SmartBill (${res.status})` }
    }

    const smartbillNumber = `${json.series}${json.number}`

    // Salvează numărul SmartBill în DB
    await supabase
      .from('invoices')
      .update({
        smartbill_number: smartbillNumber,
        smartbill_synced_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    revalidatePath(`/financials/${invoiceId}`)
    return { message: `Emisă în SmartBill: ${smartbillNumber}`, smartbillNumber }
  } catch (err) {
    return { error: `Eroare conexiune: ${err instanceof Error ? err.message : 'Necunoscută'}` }
  }
}

export async function testSmartBillConnectionAction(): Promise<SmartBillState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('smartbill_email, smartbill_token, company_cui')
    .eq('id', user.id)
    .single()

  if (!profile?.smartbill_email || !profile?.smartbill_token) {
    return { error: 'Completează email și token SmartBill mai întâi.' }
  }

  const cif = (profile.company_cui ?? '').replace(/^RO/i, '')
  if (!cif) return { error: 'Completează CIF-ul companiei în Setări.' }

  try {
    const res = await fetch(`https://ws.smartbill.ro/SBORO/api/series?cif=${cif}&type=f`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': buildAuth(profile.smartbill_email, profile.smartbill_token),
      },
    })
    if (res.ok) {
      const json = await res.json()
      const series = (json.list ?? []).map((s: { name: string }) => s.name).join(', ')
      return { message: `Conexiune reușită! Serii disponibile: ${series || 'niciuna'}` }
    }
    return { error: `Autentificare eșuată (${res.status}). Verifică email-ul și token-ul.` }
  } catch {
    return { error: 'Nu s-a putut conecta la SmartBill. Verifică conexiunea.' }
  }
}
