import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Clock, Edit2, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Project, Client, ProjectTask, ProjectMember } from '@/types/database'
import DeleteProjectButton from '@/components/projects/DeleteProjectButton'
import TaskList from '@/components/projects/TaskList'
import TeamMembers from '@/components/projects/TeamMembers'
import ExpensesCard from '@/components/projects/ExpensesCard'

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
  draft:     { label: 'Draft',     dot: 'bg-slate-400',  bg: 'bg-slate-100', text: 'text-slate-600' },
  active:    { label: 'Activ',     dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' },
  paused:    { label: 'Pauză',     dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  completed: { label: 'Finalizat', dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  cancelled: { label: 'Anulat',   dot: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-700' },
}

function DeadlineInfo({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-gray-400 text-sm">Nespecificat</span>
  const date = new Date(deadline)
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  const formatted = date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={15} className="text-gray-400" />
        <p className="font-semibold text-gray-900 text-sm">{formatted}</p>
      </div>
      {daysLeft < 0 ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
          <Clock size={13} className="text-red-500" />
          <span className="text-xs font-bold text-red-600">Expirat de {Math.abs(daysLeft)} zile</span>
        </div>
      ) : daysLeft === 0 ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
          <Clock size={13} className="text-red-500" />
          <span className="text-xs font-bold text-red-600">Azi!</span>
        </div>
      ) : daysLeft <= 7 ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
          <Clock size={13} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-700">{daysLeft} zile rămase</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
          <Clock size={13} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-600">{daysLeft} zile rămase</span>
        </div>
      )}
    </div>
  )
}

type ProjectWithClient = Project & { client: Client | null }

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [projectRes, tasksRes, membersRes, profileRes, timeEntriesRes, expensesRes, myMembershipRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(id, name, company, email, phone)')
      .eq('id', id)
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
      .order('invited_at', { ascending: false }),
    supabase.from('profiles').select('plan').eq('id', user!.id).single(),
    supabase
      .from('time_entries')
      .select('duration_minutes, hourly_rate, currency')
      .eq('project_id', id)
      .eq('user_id', user!.id)
      .not('ended_at', 'is', null),
    supabase
      .from('project_expenses')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false }),
    supabase
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('member_user_id', user!.id)
      .eq('status', 'accepted')
      .maybeSingle(),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data as ProjectWithClient
  const isOwner = project.user_id === user!.id
  const tasks = (tasksRes.data ?? []) as ProjectTask[]
  // Membrii sunt vizibili doar pentru proprietar
  const members = (isOwner ? (membersRes.data ?? []) : []) as ProjectMember[]
  const plan = profileRes.data?.plan ?? 'free'
  const isPlanAllowed = ['pro', 'team'].includes(plan)
  const expenses = expensesRes.data ?? []
  const totalExpenses = expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
  const canEdit = isOwner || ['editor', 'manager'].includes(myMembershipRes.data?.role ?? '')

  const sc = statusConfig[project.status]
  const completedTasks = tasks.filter(t => t.is_completed).length
  const totalTasks = tasks.length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Date pontaj pentru proiecte pe oră
  const timeEntries = timeEntriesRes.data ?? []
  const totalMinutes = timeEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
  const totalHours = totalMinutes / 60
  const trackedCost = timeEntries.reduce((s, e) => s + ((e.duration_minutes ?? 0) / 60) * (e.hourly_rate ?? 0), 0)
  const isHourly = project.budget_type === 'hourly'

  // SVG donut dimensions
  const r = 56
  const circumference = 2 * Math.PI * r

  const clientGradient = project.client
    ? getAvatarGradient(project.client.name)
    : getAvatarGradient(project.name)
  const clientInitials = project.client
    ? getInitials(project.client.name)
    : getInitials(project.name)

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="mb-7">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-[#6f7a72] hover:text-[#0e0f12] transition-colors mb-4 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Înapoi la proiecte
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0e0f12]">{project.name}</h1>
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {project.tags.map((tag: string) => (
                  <span key={tag} className="text-xs font-medium px-2.5 py-1 bg-[#e9eeea] text-[#4d574f] rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isOwner ? (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#dbe2dc] hover:border-[#c4ccc5] text-[#0e0f12] font-semibold rounded-full transition-all shadow-sm text-sm"
                >
                  <Edit2 size={15} />
                  Editează
                </Link>
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e9eeea] text-[#4d574f] text-xs font-semibold rounded-full">
                👁 Vizualizare
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid — 3 cols: [Left sidebar] [Financial Health] [Main content] ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_300px_1fr] gap-5 items-start">

        {/* ════ Col 1 — Status + Timeline + Team ════ */}
        <div className="space-y-4">

          {/* Status + Progres + Client */}
          <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${sc.bg} rounded-full mb-4`}>
              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              <span className={`text-xs font-bold ${sc.text}`}>{sc.label}</span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-[72px] h-[72px] shrink-0">
                <svg className="transform -rotate-90 w-[72px] h-[72px]" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" stroke="#e9eeea" strokeWidth="8" fill="none" />
                  <circle
                    cx="36" cy="36" r="28"
                    stroke="#acff55"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - progressPct / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-[#0e0f12]">{progressPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6f7a72]">Completare</p>
                {totalTasks > 0
                  ? <p className="text-xs text-[#9ba6a0] mt-0.5">{completedTasks}/{totalTasks} sarcini</p>
                  : <p className="text-xs text-[#9ba6a0] mt-0.5">Nicio sarcină</p>
                }
              </div>
            </div>

            {/* Client */}
            {project.client && (
              <div className="pt-4 border-t border-[#e9eeea]">
                <p className="text-[10px] font-bold text-[#9ba6a0] mb-2 uppercase tracking-widest">Client</p>
                <Link href={`/clients/${project.client.id}`} className="flex items-center gap-2.5 group">
                  <div className={`w-9 h-9 bg-gradient-to-br ${clientGradient} rounded-[10px] flex items-center justify-center shrink-0`}>
                    <span className="text-xs font-bold text-white">{clientInitials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0e0f12] text-sm group-hover:text-black transition truncate">{project.client.name}</p>
                    {project.client.company && <p className="text-xs text-[#6f7a72] truncate">{project.client.company}</p>}
                  </div>
                </Link>
                <div className="flex gap-1.5 mt-3">
                  {project.client.email && (
                    <a href={`mailto:${project.client.email}`}
                      className="flex-1 py-1.5 text-xs font-semibold text-center bg-[#f5f8f5] hover:bg-[#e9eeea] rounded-[8px] text-[#4d574f] transition px-1 truncate">
                      ✉ Email
                    </a>
                  )}
                  {project.client.phone && (
                    <a href={`tel:${project.client.phone}`}
                      className="flex-1 py-1.5 text-xs font-semibold text-center bg-[#f5f8f5] hover:bg-[#e9eeea] rounded-[8px] text-[#4d574f] transition">
                      ☎ Sună
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
            <h3 className="text-[11px] font-bold text-[#0e0f12] mb-4 uppercase tracking-widest">Timeline</h3>
            <div className="space-y-3.5">
              {project.start_date && (
                <div>
                  <p className="text-[10px] font-bold text-[#9ba6a0] mb-1 uppercase tracking-widest">Start</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#9ba6a0] shrink-0" />
                    <p className="font-semibold text-[#0e0f12] text-xs">
                      {new Date(project.start_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-[#9ba6a0] mb-1 uppercase tracking-widest">Creat</p>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#9ba6a0] shrink-0" />
                  <p className="font-semibold text-[#0e0f12] text-xs">
                    {new Date(project.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#9ba6a0] mb-1.5 uppercase tracking-widest">Deadline</p>
                <DeadlineInfo deadline={project.deadline} />
              </div>
            </div>
          </div>

          {/* Team */}
          <TeamMembers
            projectId={project.id}
            members={members}
            isPlanAllowed={isPlanAllowed}
            isOwner={isOwner}
          />
        </div>

        {/* ════ Col 2 — Financial Health (unified) ════ */}
        <div className="space-y-4">
          {/* Pontaj link — deasupra cardului, vizibil */}
          {isHourly && (
            <div className="flex justify-end">
              <Link
                href="/time"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dbe2dc] text-[#4d574f] hover:border-[#acff55] hover:text-[#0e0f12] font-semibold rounded-full transition-all text-xs shadow-sm"
              >
                <Clock size={12} />
                Pontaj →
              </Link>
            </div>
          )}

          <ExpensesCard
            projectId={project.id}
            expenses={expenses}
            currency={project.currency}
            isOwner={isOwner}
            canEdit={canEdit}
            budget={project.budget ?? null}
            budgetType={isHourly ? 'hourly' : 'fixed'}
            hourlyRate={project.hourly_rate ?? null}
            trackedCost={trackedCost}
            totalHours={totalHours}
          />
        </div>

        {/* ════ Col 3 — Descriere + Sarcini ════ */}
        <div className="space-y-5">
          {project.description ? (
            <div className="bg-white rounded-[20px] p-6 shadow-lg shadow-black/5">
              <h3 className="text-[11px] font-bold text-[#0e0f12] mb-4 uppercase tracking-widest">Descriere proiect</h3>
              <p className="text-[#4d574f] leading-relaxed whitespace-pre-line text-sm">
                {project.description}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5 border-2 border-dashed border-[#e9eeea]">
              <div className="flex items-center gap-3 text-[#9ba6a0]">
                <FolderOpen size={18} />
                {isOwner ? (
                  <p className="text-sm">
                    Nicio descriere adăugată.{' '}
                    <Link
                      href={`/projects/${project.id}/edit`}
                      className="text-[#5aa70d] font-semibold hover:text-[#437d0a] transition-colors"
                    >
                      Adaugă una →
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm">Nicio descriere adăugată.</p>
                )}
              </div>
            </div>
          )}

          <TaskList projectId={project.id} initialTasks={tasks} members={members} />
        </div>
      </div>
    </div>
  )
}
