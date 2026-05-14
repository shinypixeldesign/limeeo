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
    <div className="p-8">
      <div className="mb-10">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Înapoi la {project.name}</span>
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Editează Proiectul</h1>
      </div>

      <ProjectForm
        action={updateProjectAction}
        project={project}
        clients={clients}
        cancelHref={`/projects/${project.id}`}
      />
    </div>
  )
}
