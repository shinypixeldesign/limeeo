import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { Invoice, Client, Profile } from '@/types/database'

type FullInvoice = Invoice & { client: Client | null }

function buildEmailHtml(inv: FullInvoice, profile: Profile | null): string {
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const isOffer = inv.type === 'offer'
  const docTitle = isOffer ? 'Ofertă comercială' : 'Factură fiscală'
  const accentColor = isOffer ? '#7c3aed' : '#4f46e5'

  const itemsHtml = (inv.items ?? []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#1e293b;">${item.description}</td>
      <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">${item.um ?? 'buc'}</td>
      <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #e2e8f0;color:#64748b;">${item.quantity}</td>
      <td style="padding:10px 12px;text-align:right;border-bottom:1px solid #e2e8f0;color:#64748b;">${fmt(item.unit_price)} ${inv.currency}</td>
      <td style="padding:10px 16px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${fmt(item.total)} ${inv.currency}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:${accentColor};padding:32px 40px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          ${profile?.logo_url
            ? `<img src="${profile.logo_url}" alt="Logo" style="height:48px;object-fit:contain;margin-bottom:12px;">`
            : `<div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:bold;color:#fff;">${(profile?.company_name ?? 'F')[0]}</div>`
          }
          <p style="margin:0;color:#fff;font-weight:700;font-size:18px;">${profile?.company_name ?? profile?.full_name ?? ''}</p>
          ${profile?.company_cui ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">CUI: ${profile.company_cui}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <p style="margin:0;background:rgba(255,255,255,0.15);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding:6px 14px;border-radius:6px;display:inline-block;">${docTitle}</p>
          <p style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;font-family:monospace;">${inv.number}</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Data: ${new Date(inv.issue_date).toLocaleDateString('ro-RO')}</p>
          ${inv.due_date && !isOffer ? `<p style="margin:2px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Scadență: ${new Date(inv.due_date).toLocaleDateString('ro-RO')}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">

      <!-- Client -->
      ${inv.client ? `
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">${isOffer ? 'Adresată către' : 'Facturat către'}</p>
        <p style="margin:0;font-weight:700;font-size:16px;color:#1e293b;">${inv.client.company ?? inv.client.name}</p>
        ${inv.client.email ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">${inv.client.email}</p>` : ''}
      </div>` : ''}

      <!-- Tabel -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#1e293b;">
            <th style="text-align:left;padding:12px 16px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-radius:8px 0 0 0;">Descriere</th>
            <th style="text-align:center;padding:12px 8px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:50px;">UM</th>
            <th style="text-align:center;padding:12px 12px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:60px;">Cant.</th>
            <th style="text-align:right;padding:12px 12px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:110px;">Preț/u</th>
            <th style="text-align:right;padding:12px 16px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-radius:0 8px 0 0;width:110px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- Totaluri -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
        <div style="width:260px;">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;">
            <span>Subtotal</span><span>${fmt(inv.subtotal)} ${inv.currency}</span>
          </div>
          ${(inv.discount_amount ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#d97706;">
            <span>Discount${inv.discount_type === 'percent' ? ` (${inv.discount_value}%)` : ''}</span>
            <span>−${fmt(inv.discount_amount)} ${inv.currency}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;">
            <span>TVA (${inv.tax_rate}%)</span><span>${fmt(inv.tax_amount)} ${inv.currency}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:700;color:#1e293b;border-top:2px solid #1e293b;margin-top:4px;">
            <span>TOTAL</span><span>${fmt(inv.total)} ${inv.currency}</span>
          </div>
        </div>
      </div>

      <!-- Date bancare -->
      ${!isOffer && (profile?.company_iban || profile?.company_bank) ? `
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;">Date pentru plată</p>
        ${profile?.company_bank ? `<p style="margin:0;font-size:13px;color:#374151;">Bancă: <strong>${profile.company_bank}</strong></p>` : ''}
        ${profile?.company_iban ? `<p style="margin:4px 0 0;font-size:13px;color:#374151;">IBAN: <strong style="font-family:monospace;">${profile.company_iban}</strong></p>` : ''}
      </div>` : ''}

      <!-- Note -->
      ${inv.notes ? `
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Mențiuni</p>
        <p style="margin:0;font-size:13px;color:#64748b;white-space:pre-line;">${inv.notes}</p>
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        ${profile?.company_name ?? profile?.full_name ?? ''}
        ${profile?.company_website ? ` · <a href="${profile.company_website}" style="color:#6366f1;">${profile.company_website}</a>` : ''}
        ${profile?.company_phone ? ` · ${profile.company_phone}` : ''}
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })

  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: 'ID factură lipsă' }, { status: 400 })

  // Verificăm Resend API key
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY lipsește din .env.local. Creează un cont gratuit pe resend.com și adaugă cheia.'
    }, { status: 503 })
  }

  // Fetch invoice + profile
  const [invoiceRes, profileRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, client:clients(id,name,company,email,phone)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
  ])

  if (!invoiceRes.data) return NextResponse.json({ error: 'Factura nu a fost găsită.' }, { status: 404 })

  const inv = invoiceRes.data as FullInvoice
  const profile = profileRes.data as Profile | null

  if (!inv.client?.email) {
    return NextResponse.json({ error: 'Clientul nu are adresă de email.' }, { status: 400 })
  }

  const isOffer = inv.type === 'offer'
  const docTitle = isOffer ? 'Ofertă comercială' : 'Factură fiscală'
  const fromName = profile?.company_name ?? profile?.full_name ?? 'Freelio'
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const resend = new Resend(resendKey)

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [inv.client.email],
      subject: `${docTitle} ${inv.number} — ${fromName}`,
      html: buildEmailHtml(inv, profile),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Actualizăm statusul la 'sent' dacă era 'draft'
    if (inv.status === 'draft') {
      await supabase.from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoiceId)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Eroare Resend: ${msg}` }, { status: 500 })
  }
}
