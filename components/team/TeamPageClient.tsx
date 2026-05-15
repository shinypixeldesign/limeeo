'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { inviteMemberAction, removeMemberAction, resendInviteAction } from '@/app/actions/team'
import type { ProjectMember } from '@/types/database'
import type { MyMembership } from '@/app/team/page'

interface Project {
  id: string
  name: string
}

type MemberWithProject = ProjectMember & {
  project: { id: string; name: string } | null
}

interface Props {
  projects: Project[]
  members: MemberWithProject[]
  myMemberships: MyMembership[]
}

const statusConfig = {
  pending:  { label: 'Invitat',  cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Activ',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  declined: { label: 'Refuzat',  cls: 'bg-red-50 text-red-700 ring-red-200' },
}

function MemberAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return (
    <div className={`w-9 h-9 rounded-full ${colors[Math.abs(hash) % colors.length]} flex items-center justify-center shrink-0`}>
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  )
}

function ResendBtn({ memberId }: { memberId: string }) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    const fd = new FormData(); fd.append('member_id', memberId)
    await resendInviteAction(fd)
    setLoading(false); setDone(true)
    setTimeout(() => setDone(false), 3000)
  }
  return (
    <button type="button" onClick={handle} disabled={loading || done}
      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium disabled:opacity-50 transition">
      {done ? '✓ Trimis' : loading ? 'Se trimite…' : 'Retrimite'}
    </button>
  )
}

function RemoveBtn({ memberId, projectId }: { memberId: string; projectId: string }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) return (
    <form action={removeMemberAction} className="flex items-center gap-1">
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="project_id" value={projectId} />
      <span className="text-xs text-slate-400">Sigur?</span>
      <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition">Da</button>
      <button type="button" onClick={() => setConfirm(false)} className="text-xs text-slate-400 px-1.5 py-0.5 rounded hover:bg-slate-100 transition">Nu</button>
    </form>
  )
  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Elimină">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}

export default function TeamPageClient({ projects, members, myMemberships }: Props) {
  const [inviteState, inviteAction, pending] = useActionState(inviteMemberAction, undefined)
  const [showForm, setShowForm] = useState(members.length === 0)

  const totalMembers = members.length
  const activeMembers = members.filter(m => m.status === 'accepted').length
  const pendingMembers = members.filter(m => m.status === 'pending').length

  // Grupare pe proiecte
  const byProject = new Map<string, { projectId: string; projectName: string; members: MemberWithProject[] }>()
  for (const m of members) {
    const pid = m.project?.id ?? 'unknown'
    if (!byProject.has(pid)) {
      byProject.set(pid, { projectId: pid, projectName: m.project?.name ?? 'Proiect șters', members: [] })
    }
    byProject.get(pid)!.members.push(m)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {totalMembers > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total invitați', value: totalMembers, color: 'text-slate-900' },
            { label: 'Activi', value: activeMembers, color: 'text-emerald-600' },
            { label: 'În așteptare', value: pendingMembers, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formular invitare */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm">Invită coleg nou</span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 text-slate-400 transition-transform ${showForm ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showForm && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-5">
            {projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">Nu ai niciun proiect creat încă.</p>
                <Link href="/projects/new"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
                  Creează primul proiect →
                </Link>
              </div>
            ) : (
              <form action={inviteAction} className="space-y-3">
                {inviteState?.error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    {inviteState.error}
                  </div>
                )}
                {inviteState?.success && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Invitație trimisă cu succes!
                  </div>
                )}

                {/* Proiect */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Proiect</label>
                  <select
                    name="project_id"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selectează proiectul...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Email + Rol */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email coleg</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="coleg@exemplu.ro"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                    <select
                      name="role"
                      defaultValue="viewer"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="viewer">👁 Vizitator — doar citire</option>
                      <option value="editor">✏️ Editor — poate edita</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {pending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Se trimite…
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Trimite invitație
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Lista membri */}
      {members.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Niciun coleg invitat încă</h2>
          <p className="text-slate-500 text-sm">Folosește formularul de mai sus pentru a trimite prima invitație.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byProject.values()).map(group => (
            <div key={group.projectId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header proiect */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <Link
                    href={`/projects/${group.projectId}`}
                    className="font-semibold text-sm text-slate-900 hover:text-indigo-600 transition"
                  >
                    {group.projectName}
                  </Link>
                </div>
                <span className="text-xs text-slate-400">
                  {group.members.length} {group.members.length === 1 ? 'membru' : 'membri'}
                </span>
              </div>

              {/* Membrii */}
              <div className="divide-y divide-slate-100">
                {group.members.map(member => {
                  const sc = statusConfig[member.status]
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition group">
                      <MemberAvatar email={member.invited_email} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{member.invited_email}</p>
                        <p className="text-xs text-slate-400">
                          {member.role === 'editor' ? 'Editor' : 'Vizitator'} ·{' '}
                          {new Date(member.invited_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${sc.cls}`}>
                          {sc.label}
                        </span>
                        {member.status === 'pending' && (
                          <ResendBtn memberId={member.id} />
                        )}
                        <RemoveBtn memberId={member.id} projectId={member.project?.id ?? ''} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Echipe din care fac parte */}
      {myMemberships.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            Echipe din care fac parte
          </h2>
          <div className="space-y-3">
            {myMemberships.map(membership => {
              const ownerName = membership.owner?.company_name ?? membership.owner?.full_name ?? membership.owner?.email ?? 'Necunoscut'
              const ownerInitials = ownerName.slice(0, 2).toUpperCase()
              const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
              let hash = 0
              for (let i = 0; i < ownerName.length; i++) hash = ownerName.charCodeAt(i) + ((hash << 5) - hash)
              const avatarColor = colors[Math.abs(hash) % colors.length]

              return (
                <div key={membership.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <Link
                        href={`/projects/${membership.project_id}`}
                        className="font-semibold text-sm text-slate-900 hover:text-indigo-600 transition"
                      >
                        {membership.project?.name ?? 'Proiect'}
                      </Link>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${membership.role === 'editor' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                      {membership.role === 'editor' ? 'Editor' : 'Vizitator'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
                      <span className="text-xs font-bold text-white">{ownerInitials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ownerName}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
