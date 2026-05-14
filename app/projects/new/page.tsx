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
    <div className="p-8">
      <div className="mb-10">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Înapoi la proiecte</span>
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Proiect Nou</h1>
        <p className="text-gray-500 mt-1">Completează detaliile proiectului</p>
      </div>

      <ProjectForm
        action={createProjectAction}
        clients={clients}
        defaultClientId={defaultClientId}
        cancelHref="/projects"
      />
    </div>
  )
}
