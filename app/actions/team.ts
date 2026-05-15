'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const TEAM_PLANS = ['pro', 'team']

function buildInviteEmailHtml(opts: {
  fromName: string
  projectName: string
  inviteUrl: string
  role: string
}) {
  const roleLabel = opts.role === 'editor' ? 'Editor (poate modifica)' : 'Vizitator (doar citire)'
  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#6366f1;padding:32px 40px;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">Limeeo</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 12px;">Ai fost invitat să colaborezi</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 8px;">
        <strong>${opts.fromName}</strong> te invită să accesezi proiectul:
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#1e293b;">📁 ${opts.projectName}</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Rol: ${roleLabel}</p>
      </div>
      <a href="${opts.inviteUrl}"
        style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;margin:8px 0 24px;">
        Acceptă invitația →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Link-ul expiră în 7 zile. Dacă nu ai un cont Limeeo, vei fi ghidat să îți creezi unul gratuit.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function inviteMemberAction(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  // Verifică planul
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, full_name, company_name')
    .eq('id', user.id)
    .single()

  if (!TEAM_PLANS.includes(profile?.plan ?? '')) {
    return { error: 'Team Members este disponibil din planul Pro (€19/lună). Fă upgrade din pagina Abonament.' }
  }

  // Verifică limita pentru planul Pro (max 10 membrii activi)
  if (profile?.plan === 'pro') {
    const { count } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', user.id)
      .eq('status', 'accepted')
    if ((count ?? 0) >= 10) {
      return { error: 'Ai atins limita de 10 membrii activi pe planul Pro. Fă upgrade la Team pentru membrii nelimitați.' }
    }
  }

  const projectId = formData.get('project_id') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string) || 'viewer'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email invalid.' }
  }
  if (!projectId) return { error: 'ID proiect lipsă.' }

  // Verifică că proiectul aparține userului
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Proiectul nu a fost găsit.' }

  // Nu poți invita pe tine însuți
  if (email === user.email) return { error: 'Nu te poți invita pe tine însuți.' }

  // Verifică dacă deja invitat
  const { data: existing } = await supabase
    .from('project_members')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('invited_email', email)
    .single()

  if (existing) {
    return { error: existing.status === 'accepted' ? 'Această persoană este deja membră.' : 'Invitație deja trimisă.' }
  }

  // Inserează invitația
  const token = crypto.randomUUID()
  const { error: insertError } = await supabase.from('project_members').insert({
    project_id: projectId,
    owner_user_id: user.id,
    invited_email: email,
    role,
    invite_token: token,
  })

  if (insertError) return { error: 'Eroare la salvare.' }

  // Trimite email de invitație
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://limeeo.com'
    const inviteUrl = `${appUrl}/invite/${token}`
    const fromName = profile?.company_name ?? profile?.full_name ?? 'Un freelancer'

    const { error: emailErr } = await resend.emails.send({
      from: `Limeeo <${fromEmail}>`,
      to: email,
      subject: `${fromName} te invită să colaborezi pe "${project.name}"`,
      html: buildInviteEmailHtml({ fromName, projectName: project.name, inviteUrl, role }),
    })

    if (emailErr) {
      console.error('[invite] Resend error:', emailErr)
    }
  } catch (err) {
    console.error('[invite] Email send failed:', err)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/team')
  return { success: true }
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const memberId = formData.get('member_id') as string
  const projectId = formData.get('project_id') as string

  await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('owner_user_id', user.id)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/team')
}

export async function resendInviteAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neautorizat.' }

  const memberId = formData.get('member_id') as string

  const { data: member } = await supabase
    .from('project_members')
    .select('*, project:projects(name)')
    .eq('id', memberId)
    .eq('owner_user_id', user.id)
    .single()

  if (!member) return { error: 'Invitație negăsită.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', user.id)
    .single()

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://limeeo-six.vercel.app'
    const inviteUrl = `${appUrl}/invite/${member.invite_token}`
    const fromName = profile?.company_name ?? profile?.full_name ?? 'Un freelancer'
    const projectName = (member.project as { name: string } | null)?.name ?? 'Proiect'

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    await resend.emails.send({
      from: `Limeeo <${fromEmail}>`,
      to: member.invited_email,
      subject: `Reminder: ${fromName} te invită să colaborezi pe "${projectName}"`,
      html: buildInviteEmailHtml({ fromName, projectName, inviteUrl, role: member.role }),
    })
  } catch (err) {
    console.error('[resend-invite] Email send failed:', err)
    return { error: 'Eroare la trimiterea email-ului.' }
  }

  return { success: true }
}
