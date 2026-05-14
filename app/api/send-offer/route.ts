import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { Offer, Client, Profile, OfferItem } from '@/types/database'

type FullOffer = Offer & { client: Client | null; offer_items: OfferItem[] }

function buildOfferEmailHtml(offer: FullOffer, profile: Profile | null, publicUrl: string): string {
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const accentColor = offer.brand_color ?? '#6366f1'
  const fromName = profile?.company_name ?? profile?.full_name ?? 'Freelio'

  const sortedItems = [...(offer.offer_items ?? [])].sort((a, b) => a.position - b.position)
  const itemsHtml = sortedItems.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:600;color:#1e293b;">${item.title}</div>
        ${item.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${item.description}</div>` : ''}
      </td>
      <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;">${item.type === 'hourly' ? `${item.quantity}h` : item.quantity}</td>
      <td style="padding:10px 12px;text-align:right;border-bottom:1px solid #e2e8f0;color:#64748b;">${fmt(item.unit_price)} ${offer.currency}</td>
      <td style="padding:10px 16px;text-align:right;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${fmt(item.total)} ${offer.currency}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:${accentColor};padding:32px 40px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
        <div>
          ${profile?.logo_url
            ? `<img src="${profile.logo_url}" alt="Logo" style="height:48px;object-fit:contain;margin-bottom:12px;">`
            : `<div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:22px;font-weight:bold;color:#fff;">${(profile?.company_name ?? fromName)[0].toUpperCase()}</div>`
          }
          <p style="margin:0;color:#fff;font-weight:700;font-size:18px;">${fromName}</p>
          ${profile?.company_cui ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">CUI: ${profile.company_cui}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <p style="margin:0;background:rgba(255,255,255,0.15);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding:6px 14px;border-radius:6px;display:inline-block;">Ofertă comercială</p>
          <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;font-family:monospace;">${offer.number}</p>
          ${offer.title ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${offer.title}</p>` : ''}
          ${offer.valid_until ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Valabilă până la: ${new Date(offer.valid_until).toLocaleDateString('ro-RO')}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">

      ${offer.intro_text ? `
      <div style="background:#f8fafc;border-left:3px solid ${accentColor};padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;font-style:italic;">${offer.intro_text}</p>
      </div>` : ''}

      <!-- Client -->
      ${offer.client ? `
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Adresată către</p>
        <p style="margin:0;font-weight:700;font-size:16px;color:#1e293b;">${offer.client.company ?? offer.client.name}</p>
        ${offer.client.email ? `<p style="margin:4px 0 0;color:#64748b;font-size:14px;">${offer.client.email}</p>` : ''}
      </div>` : ''}

      <!-- Servicii -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#1e293b;">
            <th style="text-align:left;padding:12px 16px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-radius:8px 0 0 0;">Serviciu</th>
            <th style="text-align:center;padding:12px 12px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:70px;">Cant.</th>
            <th style="text-align:right;padding:12px 12px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:120px;">Preț/u</th>
            <th style="text-align:right;padding:12px 16px;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;border-radius:0 8px 0 0;width:120px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- Totaluri -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
        <div style="width:280px;">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;">
            <span>Subtotal</span><span>${fmt(offer.subtotal)} ${offer.currency}</span>
          </div>
          ${offer.discount_amount > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#059669;">
            <span>Discount</span><span>-${fmt(offer.discount_amount)} ${offer.currency}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b;">
            <span>TVA (${offer.tax_rate}%)</span><span>${fmt(offer.tax_amount)} ${offer.currency}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px;font-weight:700;color:#1e293b;border-top:2px solid #1e293b;margin-top:4px;">
            <span>TOTAL</span><span>${fmt(offer.total)} ${offer.currency}</span>
          </div>
        </div>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${publicUrl}" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;letter-spacing:0.3px;">
          Vizualizează oferta completă →
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">sau accesează: <a href="${publicUrl}" style="color:${accentColor};">${publicUrl}</a></p>
      </div>

      ${offer.terms_text ? `
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Termeni & condiții</p>
        <p style="margin:0;font-size:13px;color:#64748b;white-space:pre-line;line-height:1.6;">${offer.terms_text}</p>
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        ${fromName}
        ${profile?.company_website ? ` · <a href="${profile.company_website}" style="color:#6366f1;">${profile.company_website.replace(/^https?:\/\//, '')}</a>` : ''}
        ${profile?.company_phone ? ` · ${profile.company_phone}` : ''}
        ${profile?.company_email ? ` · ${profile.company_email}` : ''}
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

  const { offerId } = await request.json()
  if (!offerId) return NextResponse.json({ error: 'ID ofertă lipsă' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY lipsește din .env.local. Creează un cont gratuit pe resend.com și adaugă cheia.'
    }, { status: 503 })
  }

  const [offerRes, profileRes] = await Promise.all([
    supabase
      .from('offers')
      .select('*, client:clients(id,name,company,email), offer_items(*)')
      .eq('id', offerId)
      .eq('user_id', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!offerRes.data) return NextResponse.json({ error: 'Oferta nu a fost găsită.' }, { status: 404 })

  const offer = offerRes.data as FullOffer
  const profile = profileRes.data as Profile | null

  if (!offer.client?.email) {
    return NextResponse.json({ error: 'Clientul nu are adresă de email. Adaugă email-ul clientului mai întâi.' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const publicUrl = `${baseUrl}/o/${offer.token}`
  const fromName = profile?.company_name ?? profile?.full_name ?? 'Freelio'
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const resend = new Resend(resendKey)

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [offer.client.email],
      subject: `Ofertă comercială ${offer.number}${offer.title ? ` — ${offer.title}` : ''} · ${fromName}`,
      html: buildOfferEmailHtml(offer, profile, publicUrl),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Marchează ca trimisă dacă era draft
    if (offer.status === 'draft' || offer.status === 'viewed') {
      await supabase.from('offers')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', offerId)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Eroare Resend: ${msg}` }, { status: 500 })
  }
}
