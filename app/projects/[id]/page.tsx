import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, Client, ProjectTask, ProjectMember } from '@/types/database'
import DeleteProjectButton from '@/components/projects/DeleteProjectButton'
import TaskList from '@/components/projects/TaskList'
import TeamMembers from '@/components/projects/TeamMembers'

const statusConfig: Record<Project['status'], { label: string; class: string; dot: string }> = {
  draft:     { label: 'Draft',     class: 'bg-slate-100 text-slate-700 ring-slate-200',     dot: 'bg-slate-400' },
  active:    { label: 'Activ',     class: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  paused:    { label: 'Pauză',     class: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-500' },
  completed: { label: 'Finalizat', class: 'bg-blue-50 text-blue-700 ring-blue-200',          dot: 'bg-blue-500' },
  cancelled: { label: 'Anulat',   class: 'bg-red-50 text-red-700 ring-red-200',             dot: 'bg-red-400' },
}

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

function DeadlineDisplay({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-slate-400 text-sm">—</span>
  const date = new Date(deadline)
  const today = new Date()
  const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

  if (daysLeft < 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-red-600">{formatted}</p>
        <p className="text-xs text-red-400 mt-0.5">Expirat de {Math.abs(daysLeft)} zile</p>
      </div>
    )
  }
  if (daysLeft === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-amber-600">{formatted}</p>
        <p className="text-xs text-amber-500 mt-0.5">Azi!</p>
      </div>
    )
  }
  if (daysLeft <= 7) {
    return (
      <div>
        <p className="text-sm font-semibold text-amber-600">{formatted}</p>
        <p className="text-xs text-amber-500 mt-0.5">{daysLeft} zile rămase</p>
      </div>
    )
  }
  return <p className="text-sm font-medium text-slate-800">{formatted}</p>
}

function InfoCard({
  icon, label, children, accent = 'slate',
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  accent?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'red'
}) {
  const accentMap = {
    slate:   'bg-slate-50 text-slate-500',
    indigo:  'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-500',
  }
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm font-medium text-slate-800">{children}</div>
      </div>
    </div>
  )
}

type ProjectWithClient = Project & { client: Client | null }

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [projectRes, tasksRes, membersRes, profileRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(id, name, company, email, phone)')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('project_members')
      .select('*')
      .eq('project_id', id)
      .eq('owner_user_id', user!.id)
      .order('invited_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user!.id)
      .single(),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data as ProjectWithClient
  const tasks = (tasksRes.data ?? []) as ProjectTask[]
  const members = (membersRes.data ?? []) as ProjectMember[]
  const plan = profileRes.data?.plan ?? 'free'
  const isPlanAllowed = ['pro', 'team'].includes(plan)
  const sc = statusConfig[project.status]

  const completedTasks = tasks.filter(t => t.is_completed).length
  const totalTasks = tasks.length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/projects"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition shrink-0 mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium mb-0.5">Proiecte</p>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{project.name}</h1>
            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.tags.map(tag => (
                  <span key={tag} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${tagColor(tag)}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editează
          </Link>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coloana stânga */}
        <div className="space-y-5">

          {/* Card detalii — design grafic cu iconuri */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {/* Status + progress */}
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${sc.class}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {totalTasks > 0 && (
                <span className="text-xs text-slate-400 font-medium">{completedTasks}/{totalTasks} sarcini</span>
              )}
            </div>

            {/* Progress bar (dacă există sarcini) */}
            {totalTasks > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Progres</span>
                  <span className="text-xs font-semibold text-slate-600">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Info cards cu iconuri */}
            <div className="space-y-2">
              {/* Client */}
              <InfoCard
                accent="indigo"
                label="Client"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                {project.client ? (
                  <Link href={`/clients/${project.client.id}`} className="text-indigo-600 hover:underline">
                    {project.client.name}
                    {project.client.company && <span className="text-slate-400 font-normal text-xs block">{project.client.company}</span>}
                  </Link>
                ) : <span className="text-slate-400 font-normal">Fără client</span>}
              </InfoCard>

              {/* Buget */}
              <InfoCard
                accent="emerald"
                label="Buget"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                {project.budget
                  ? <span className="text-lg font-bold text-emerald-700">{project.budget.toLocaleString('ro-RO')} <span className="text-sm font-medium">{project.currency}</span></span>
                  : <span className="text-slate-400 font-normal">Nespecificat</span>
                }
              </InfoCard>

              {/* Data start */}
              <InfoCard
                accent="slate"
                label="Data start"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              >
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
                  : <span className="text-slate-400 font-normal">—</span>
                }
              </InfoCard>

              {/* Deadline */}
              {(() => {
                const daysLeft = project.deadline
                  ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
                  : null
                const accentColor = daysLeft !== null && daysLeft < 0 ? 'red' : daysLeft !== null && daysLeft <= 7 ? 'amber' : 'slate'
                return (
                  <InfoCard
                    accent={accentColor}
                    label="Deadline"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    <DeadlineDisplay deadline={project.deadline} />
                  </InfoCard>
                )
              })()}

              {/* Creat */}
              <InfoCard
                accent="slate"
                label="Creat pe"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                {new Date(project.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </InfoCard>
            </div>
          </div>

          {/* Card client detaliat */}
          {project.client && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Contact client
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-indigo-600">
                    {project.client.name[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{project.client.name}</p>
                  {project.client.company && <p className="text-xs text-slate-500">{project.client.company}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                {project.client.email && (
                  <a href={`mailto:${project.client.email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {project.client.email}
                  </a>
                )}
                {project.client.phone && (
                  <a href={`tel:${project.client.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {project.client.phone}
                  </a>
                )}
              </div>
              <Link
                href={`/clients/${project.client.id}`}
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
              >
                Fișa completă →
              </Link>
            </div>
          )}

          {/* Team Members */}
          <TeamMembers
            projectId={project.id}
            members={members}
            isPlanAllowed={isPlanAllowed}
          />
        </div>

        {/* Coloana dreapta */}
        <div className="lg:col-span-2 space-y-5">
          {/* Descriere */}
          {project.description && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
                </svg>
                Descriere
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {project.description}
              </p>
            </div>
          )}

          {/* Sarcini */}
          <TaskList projectId={project.id} initialTasks={tasks} members={members} />
        </div>
      </div>
    </div>
  )
}
