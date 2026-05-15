import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Caută invitația după token (fără RLS, oricine cu link-ul poate vedea)
  const { data: invite } = await supabase
    .from('project_members')
    .select('*, project:projects(id, name, user_id)')
    .eq('invite_token', token)
    .single()

  if (!invite) {
    return <InviteCard icon="error" title="Link invalid sau expirat"
      message="Această invitație nu mai este validă. Contactează persoana care te-a invitat pentru un link nou." />
  }

  const project = invite.project as { id: string; name: string; user_id: string } | null
  const roleLabel = invite.role === 'editor' ? 'Editor' : 'Vizitator'

  // Deja acceptată
  if (invite.status === 'accepted') {
    return (
      <InviteCard icon="success" title="Invitație deja acceptată"
        message={`Ești deja membru în proiectul ${project?.name ?? ''}.`}>
        <Link href={`/projects/${invite.project_id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          Mergi la proiect →
        </Link>
      </InviteCard>
    )
  }

  // Verifică autentificare
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Invitație de colaborare
          </span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Ai fost invitat pe proiectul</h1>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-4 text-left">
            <p className="font-semibold text-slate-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {project?.name ?? 'Proiect'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Rol: <span className="font-medium">{roleLabel}</span></p>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Autentifică-te sau creează un cont gratuit pentru a accepta invitația.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`/login?redirect=/invite/${token}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Conectează-te pentru a accepta
            </Link>
            <Link href={`/register?redirect=/invite/${token}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Creează cont gratuit
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Userul e autentificat — acceptă invitația cu admin client (ocolește RLS)
  const adminSupabase = createAdminClient()

  await adminSupabase
    .from('project_members')
    .update({
      status: 'accepted',
      member_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('invite_token', token)
    .neq('status', 'accepted') // nu suprascrie dacă deja acceptată

  // Trimite notificare proprietarului proiectului
  if (project?.user_id) {
    const memberName = user.email ?? 'Cineva'
    await adminSupabase
      .from('notifications')
      .insert({
        user_id: project.user_id,
        type: 'system',
        title: `${memberName} a acceptat invitația`,
        body: `A acceptat să colaboreze pe proiectul "${project.name}" cu rolul de ${roleLabel}.`,
        resource_href: `/projects/${invite.project_id}`,
        is_read: false,
      })
  }

  // Afișează pagina de succes (nu auto-redirect, userul trebuie să vadă ce s-a întâmplat)
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Invitație acceptată
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bun venit în echipă!</h1>
        <p className="text-sm text-slate-500 mb-1">
          Acum faci parte din proiectul
        </p>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 my-4 text-left">
          <p className="font-semibold text-slate-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {project?.name ?? 'Proiect'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Rolul tău: <span className="font-semibold text-slate-700">{roleLabel}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 mt-6">
          <Link
            href={`/projects/${invite.project_id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Mergi la proiect
          </Link>
          <Link href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// Componentă helper pentru mesaje simple
function InviteCard({
  icon, title, message, children
}: {
  icon: 'error' | 'success' | 'warning'
  title: string
  message: string
  children?: React.ReactNode
}) {
  const icons = {
    error: { bg: 'bg-red-50', color: 'text-red-500', path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    success: { bg: 'bg-emerald-50', color: 'text-emerald-500', path: 'M5 13l4 4L19 7' },
    warning: { bg: 'bg-amber-50', color: 'text-amber-500', path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  }
  const ic = icons[icon]
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
        <div className={`w-14 h-14 rounded-2xl ${ic.bg} flex items-center justify-center mx-auto mb-5`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 ${ic.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ic.path} />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        {children ?? (
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Mergi la Limeeo
          </Link>
        )}
      </div>
    </div>
  )
}
