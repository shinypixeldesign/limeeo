import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Caută invitația după token
  const { data: invite } = await supabase
    .from('project_members')
    .select('*, project:projects(id, name, user_id)')
    .eq('invite_token', token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link invalid sau expirat</h1>
          <p className="text-sm text-slate-500 mb-6">Această invitație nu mai este validă. Contactează persoana care te-a invitat pentru un link nou.</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Mergi la Freelio
          </Link>
        </div>
      </div>
    )
  }

  // Verifică dacă invitația e deja acceptată
  if (invite.status === 'accepted') {
    const project = invite.project as { id: string; name: string } | null
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitație deja acceptată</h1>
          <p className="text-sm text-slate-500 mb-6">Ești deja membru în proiectul <strong>{project?.name}</strong>.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Du-te la Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Verifică dacă userul e autentificat
  const { data: { user } } = await supabase.auth.getUser()
  const project = invite.project as { id: string; name: string; user_id: string } | null
  const roleLabel = invite.role === 'editor' ? 'Editor' : 'Vizitator'

  if (!user) {
    // Neautentificat — arată pagina de invitație cu link de login
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://freelio-six.vercel.app'
    const loginUrl = `/login?redirect=/invite/${token}`

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Invitație de colaborare
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Ai fost invitat pe proiectul
          </h1>
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
            Autentifică-te în Freelio pentru a accepta invitația.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Conectează-te pentru a accepta
            </Link>
            <Link
              href={`/register?redirect=/invite/${token}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Creează cont gratuit
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Userul e autentificat — verifică că email-ul se potrivește
  if (user.email !== invite.invited_email) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Cont greșit</h1>
          <p className="text-sm text-slate-500 mb-2">
            Această invitație a fost trimisă la <strong>{invite.invited_email}</strong>.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Ești autentificat ca <strong>{user.email}</strong>. Deconectează-te și conectează-te cu contul corect.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            Mergi la Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Accept invitația
  await supabase
    .from('project_members')
    .update({
      status: 'accepted',
      member_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('invite_token', token)

  // Redirect spre proiect (dacă are access) sau dashboard
  redirect('/dashboard')
}
