'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
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

// Extrage seria și numărul dintr-un smartbill_number compus (ex: "FCT123" → { series: "FCT", number: "123" })
function parseSmartBillNumber(smartbillNumber: string, seriesPrefix: string): { series: string; number: string } {
  const number = smartbillNumber.startsWith(seriesPrefix)
    ? smartbillNumber.slice(seriesPrefix.length)
    : smartbillNumber.replace(/^[A-Za-z]+/, '')
  const series = smartbillNumber.startsWith(seriesPrefix)
    ? seriesPrefix
    : smartbillNumber.replace(/\d+$/, '')
  return { series, number }
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

  // Construim lista de produse (fără discount — adăugat separat mai jos)
  const regularProducts = (inv.items ?? []).map((item: { code?: string | null; description: string; quantity: number; um: string; unit_price: number }) => ({
    name: item.description,
    code: item.code || item.description.slice(0, 20),
    measuringUnitName: item.um || 'buc',
    currency: inv.currency,
    quantity: item.quantity,
    price: item.unit_price,
    isTaxIncluded: false,
    taxName: taxName(inv.tax_rate),
    taxPercentage: inv.tax_rate,
    isDiscount: false,
    saveToDb: false,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: any[] = [...regularProducts]

  // Discount — SmartBill folosește format dedicat (nu produs cu preț negativ)
  if (inv.discount_amount > 0) {
    if (inv.discount_type === 'percent') {
      // Discount procentual: discountType=2 + discountPercentage
      products.push({
        name: `Discount ${inv.discount_value}%`,
        isDiscount: true,
        numberOfItems: regularProducts.length,
        discountType: 2,
        discountPercentage: inv.discount_value,
      })
    } else {
      // Discount valoric: discountType=1 + discountValue (negativ)
      products.push({
        name: 'Discount',
        isDiscount: true,
        numberOfItems: regularProducts.length,
        discountType: 1,
        discountValue: -inv.discount_amount,
      })
    }
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

// Sincronizează statusul unei facturi din SmartBill → Limeeo
export async function syncSmartBillStatusAction(invoiceId: string): Promise<SmartBillState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('smartbill_email, smartbill_token, smartbill_series, company_cui')
    .eq('id', user.id)
    .single()

  if (!profile?.smartbill_email || !profile?.smartbill_token) {
    return { error: 'Configurează credențialele SmartBill în Setări.' }
  }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, status, smartbill_number')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()

  if (!inv?.smartbill_number) return { error: 'Factura nu are număr SmartBill.' }

  const result = await checkSmartBillInvoice(
    inv.smartbill_number,
    profile.smartbill_series ?? 'FCT',
    (profile.company_cui ?? '').replace(/^RO/i, ''),
    buildAuth(profile.smartbill_email, profile.smartbill_token),
  )

  if (result.deleted) {
    // Factura a fost ștearsă din SmartBill — resetăm legătura
    await supabase.from('invoices').update({
      smartbill_number: null,
      smartbill_synced_at: null,
    }).eq('id', invoiceId)
    revalidatePath(`/financials/${invoiceId}`)
    return { message: 'Factura a fost ștearsă din SmartBill. Legătura a fost resetată.' }
  }

  if (result.paid && inv.status !== 'paid') {
    await supabase.from('invoices').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      smartbill_synced_at: new Date().toISOString(),
    }).eq('id', invoiceId)
    revalidatePath(`/financials/${invoiceId}`)
    return { message: 'Factura a fost marcată ca plătită (sincronizat din SmartBill).' }
  }

  // Actualizăm doar timestamp-ul de sync
  await supabase.from('invoices').update({
    smartbill_synced_at: new Date().toISOString(),
  }).eq('id', invoiceId)
  revalidatePath(`/financials/${invoiceId}`)

  return { message: result.paid ? 'Deja marcată ca plătită.' : 'Factura este neîncasată în SmartBill.' }
}

// Verifică statusul unei facturi pe SmartBill (folosit și de cron)
async function checkSmartBillInvoice(
  smartbillNumber: string,
  seriesPrefix: string,
  cif: string,
  auth: string,
): Promise<{ paid: boolean; deleted: boolean }> {
  try {
    const { series, number } = parseSmartBillNumber(smartbillNumber, seriesPrefix)
    const url = `https://ws.smartbill.ro/SBORO/api/invoice/paymentstatus?cif=${encodeURIComponent(cif)}&seriesname=${encodeURIComponent(series)}&number=${encodeURIComponent(number)}`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Authorization': auth },
    })
    if (res.status === 404) return { paid: false, deleted: true }
    if (!res.ok) return { paid: false, deleted: false }
    const json = await res.json()
    // SmartBill returnează unpaidAmount=0 când e integral plătită
    const paid = json.unpaidAmount === 0 || json.status === 'Incasata'
    return { paid, deleted: false }
  } catch {
    return { paid: false, deleted: false }
  }
}

// Sync bulk — apelat din cron zilnic pentru toate facturile cu smartbill_number neîncasate
export async function syncAllSmartBillInvoices(): Promise<{ synced: number; errors: number }> {
  const supabase = createAdminClient()
  let synced = 0
  let errors = 0

  // Fetch toate facturile cu smartbill_number care nu sunt încă plătite sau anulate
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, user_id, status, smartbill_number')
    .not('smartbill_number', 'is', null)
    .not('status', 'in', '("paid","cancelled")')

  if (!invoices?.length) return { synced: 0, errors: 0 }

  // Grupăm pe user_id pentru a evita N+1 pe profile
  const userIds = [...new Set(invoices.map(i => i.user_id))]
  const profileMap: Record<string, { email: string; token: string; series: string; cif: string }> = {}

  for (const uid of userIds) {
    const { data: p } = await supabase
      .from('profiles')
      .select('smartbill_email, smartbill_token, smartbill_series, company_cui')
      .eq('id', uid)
      .single()
    if (p?.smartbill_email && p?.smartbill_token) {
      profileMap[uid] = {
        email: p.smartbill_email,
        token: p.smartbill_token,
        series: p.smartbill_series ?? 'FCT',
        cif: (p.company_cui ?? '').replace(/^RO/i, ''),
      }
    }
  }

  for (const inv of invoices) {
    const prof = profileMap[inv.user_id]
    if (!prof || !inv.smartbill_number) continue

    try {
      const auth = buildAuth(prof.email, prof.token)
      const result = await checkSmartBillInvoice(inv.smartbill_number, prof.series, prof.cif, auth)

      if (result.deleted) {
        await supabase.from('invoices').update({
          smartbill_number: null,
          smartbill_synced_at: null,
        }).eq('id', inv.id)
        synced++
      } else if (result.paid && inv.status !== 'paid') {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          smartbill_synced_at: new Date().toISOString(),
        }).eq('id', inv.id)
        synced++
      }
    } catch {
      errors++
    }
  }

  return { synced, errors }
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
