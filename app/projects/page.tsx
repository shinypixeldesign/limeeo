import Link from 'next/link'
import { Plus, Search, FolderOpen, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Project, Client } from '@/types/database'

function getAvatarGradient(name: string) {
  const gradients = [
    'from-violet-400 to-purple-600',
    'from-blue-400 to-cyan-600',
    'from-emerald-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-pink-400 to-rose-600',
    'from-amber-400 to-yellow-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return gradients[hash % gradients.length]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const statusConfig: Record<Project['status'], { label: string; dot: string; bg: string; text: string }> = {
  draft:     { label: 'Draft',     dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600' },
  active:    { label: 'Activ',     dot: 'bg-green-500',   bg: 'bg-green-50',    text: 'text-green-700' },
  paused:    { label: 'Pauză',     dot: 'bg-amber-500',   bg: 'bg-amber-50',    text: 'text-amber-700' },
  completed: { label: 'Finalizat', dot: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700' },
  cancelled: { label: 'Anulat',    dot: 'bg-red-400',     bg: 'bg-red-50',      text: 'text-red-700' },
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full">
        <Clock size={12} className="text-red-500" />
        <span className="text-xs font-bold text-red-600">Expirat</span>
      </div>
    )
  }
  if (daysLeft <= 7) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full">
        <Clock size={12} className="text-amber-600" />
        <span className="text-xs font-bold text-amber-700">{daysLeft}z rămase</span>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
      <span className="text-xs font-medium text-gray-600">
        {new Date(deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
      </span>
    </div>
  )
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
  const completedCount = projects.filter(p => p.status === 'completed').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proiecte</h1>
          <p className="text-gray-500 mt-1">
            {activeCount} active · {completedCount} finalizate · {projects.length} total
            {plan === 'free' && (
              <span className="ml-2 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {projects.length}/2 plan Free
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {atFreeLimit ? (
            <Link
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full transition-all shadow-lg shadow-amber-500/20"
            >
              Upgrade la Solo
            </Link>
          ) : (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20 hover:shadow-xl hover:shadow-[#acff55]/30"
            >
              <Plus size={20} />
              Proiect nou
            </Link>
          )}
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="bg-white rounded-[28px] p-16 text-center shadow-lg shadow-black/5">
          <div className="w-16 h-16 rounded-[18px] bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <FolderOpen size={28} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Niciun proiect încă</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Creează primul proiect și asociază-l unui client pentru a urmări progresul și termenele.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20"
          >
            <Plus size={20} />
            Creează primul proiect
          </Link>
        </div>
      )}

      {/* Project cards grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => {
            const sc = statusConfig[project.status]
            const gradient = project.client ? getAvatarGradient(project.client.name) : getAvatarGradient(project.name)
            const initials = project.client ? getInitials(project.client.name) : getInitials(project.name)

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white rounded-[20px] p-5 shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/8 transition-all cursor-pointer group"
              >
                {/* Top row: client avatar + status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-[10px] bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                    <span className="text-sm text-gray-500 truncate max-w-[140px]">
                      {project.client?.name ?? 'Fără client'}
                    </span>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${sc.bg} rounded-full`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-black transition leading-snug">
                  {project.name}
                </h3>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Budget */}
                {project.budget && (
                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    {project.budget.toLocaleString('ro-RO')} {project.currency}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                  <DeadlineBadge deadline={project.deadline} />
                  {!project.deadline && (
                    <span className="text-xs text-gray-400">
                      {new Date(project.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
