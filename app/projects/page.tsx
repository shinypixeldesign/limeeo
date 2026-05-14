import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project, Client } from '@/types/database'

const TAG_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]
function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

const statusConfig: Record<Project['status'], { label: string; class: string }> = {
  draft:     { label: 'Draft',     class: 'bg-slate-100 text-slate-600 ring-slate-200' },
  active:    { label: 'Activ',     class: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  paused:    { label: 'Pauză',     class: 'bg-amber-50 text-amber-700 ring-amber-200' },
  completed: { label: 'Finalizat', class: 'bg-blue-50 text-blue-700 ring-blue-200' },
  cancelled: { label: 'Anulat',   class: 'bg-red-50 text-red-700 ring-red-200' },
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const date = new Date(deadline)
  const today = new Date()
  const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expirat</span>
  }
  if (daysLeft <= 7) {
    return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{daysLeft}z</span>
  }
  return <span className="text-xs text-slate-400">{date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
}

type ProjectWithClient = Project & { client: Client | null }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [projectsRes, profileRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(id, name, company)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').eq('id', user!.id).single(),
  ])

  const projects = (projectsRes.data ?? []) as ProjectWithClient[]
  const plan = profileRes.data?.plan ?? 'free'
  const atFreeLimit = plan === 'free' && projects.length >= 2

  const activeCount = projects.filter(p => p.status === 'active').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proiecte</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeCount} active · {projects.length} total
            {plan === 'free' && (
              <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {projects.length}/2 plan Free
              </span>
            )}
          </p>
        </div>
        {atFreeLimit ? (
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Limita planului Free atinsă</p>
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
            >
              Upgrade la Solo
            </Link>
          </div>
        ) : (
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Proiect nou
          </Link>
        )}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Niciun proiect încă</h2>
          <p className="text-slate-500 text-sm mb-6">Creează primul proiect și asociază-l unui client.</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Creează primul proiect
          </Link>
        </div>
      )}

      {/* Cards grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const sc = statusConfig[project.status]
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                {/* Status + deadline */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 ring-inset ${sc.class}`}>
                    {sc.label}
                  </span>
                  <DeadlineBadge deadline={project.deadline} />
                </div>

                {/* Nume */}
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition leading-snug mb-1">
                  {project.name}
                </h3>

                {/* Client */}
                {project.client && (
                  <p className="text-xs text-slate-500 mb-3">
                    {project.client.name}{project.client.company ? ` · ${project.client.company}` : ''}
                  </p>
                )}

                {/* Descriere */}
                {project.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tagColor(tag)}`}>
                        #{tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer: buget */}
                {project.budget && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Buget</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {project.budget.toLocaleString('ro-RO')} {project.currency}
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
