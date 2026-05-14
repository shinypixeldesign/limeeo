import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectForm from '@/components/projects/ProjectForm'
import { updateProjectAction } from '@/app/actions/projects'
import type { Project, Client } from '@/types/database'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [projectRes, clientsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', user!.id).single(),
    supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data as Project
  const clients = (clientsRes.data ?? []) as Client[]

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs text-slate-400 font-medium">{project.name}</p>
          <h1 className="text-2xl font-bold text-slate-900">Editează proiect</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ProjectForm
          action={updateProjectAction}
          project={project}
          clients={clients}
          cancelHref={`/projects/${project.id}`}
        />
      </div>
    </div>
  )
}
