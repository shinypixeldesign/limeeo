import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProjectForm from '@/components/projects/ProjectForm'
import { createProjectAction } from '@/app/actions/projects'
import type { Client } from '@/types/database'

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user!.id)
    .order('name')

  const clients = (data ?? []) as Client[]

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/projects"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proiect nou</h1>
          <p className="text-slate-500 text-sm mt-0.5">Completează detaliile proiectului</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ProjectForm
          action={createProjectAction}
          clients={clients}
          defaultClientId={defaultClientId}
          cancelHref="/projects"
        />
      </div>
    </div>
  )
}
