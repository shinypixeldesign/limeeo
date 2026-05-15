'use client'

import { useActionState, useState } from 'react'
import type { ProjectMember } from '@/types/database'
import { inviteMemberAction, removeMemberAction, resendInviteAction } from '@/app/actions/team'

interface TeamMembersProps {
  projectId: string
  members: ProjectMember[]
  isPlanAllowed: boolean
  isOwner: boolean
}

const statusConfig = {
  pending:  { label: 'Invitație trimisă', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Activ',             cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  declined: { label: 'Refuzat',           cls: 'bg-red-50 text-red-700 ring-red-200' },
}

const roleConfig: Record<string, string> = {
  viewer: 'Vizitator',
  editor: 'Editor',
  manager: 'Manager Proiect',
}

function MemberAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const color = colors[Math.abs(hash) % colors.length]
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  )
}

function RemoveButton({ memberId, projectId }: { memberId: string; projectId: string }) {
  const [confirm, setConfirm] = useState(false)

  if (confirm) {
    return (
      <form action={removeMemberAction} className="flex items-center gap-1">
        <input type="hidden" name="member_id" value={memberId} />
        <input type="hidden" name="project_id" value={projectId} />
        <span className="text-xs text-slate-500">Sigur?</span>
        <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition">
          Da
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="text-xs text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-100 transition">
          Nu
        </button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="text-xs text-slate-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
      title="Elimină membrul"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function ResendButton({ memberId }: { memberId: string }) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    const fd = new FormData()
    fd.append('member_id', memberId)
    await resendInviteAction(fd)
    setLoading(false)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading || done}
      className="text-xs text-indigo-500 hover:text-indigo-600 transition disabled:opacity-50"
    >
      {done ? '✓ Trimis' : loading ? 'Se trimite…' : 'Retrimite'}
    </button>
  )
}

export default function TeamMembers({ projectId, members, isPlanAllowed, isOwner }: TeamMembersProps) {
  const [inviteState, inviteAction, pending] = useActionState(inviteMemberAction, undefined)

  if (!isPlanAllowed) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Membrii echipei</h3>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 p-4 text-center">
          <p className="text-sm font-medium text-violet-900 mb-1">Funcție Pro</p>
          <p className="text-xs text-violet-600 mb-3">Invită colegi să colaboreze pe proiecte începând cu planul Pro.</p>
          <a
            href="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition"
          >
            Fă upgrade la Pro →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Membrii echipei</h3>
        {members.length > 0 && (
          <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {members.filter(m => m.status === 'accepted').length}/{members.length}
          </span>
        )}
      </div>

      {/* Lista membrilor */}
      {members.length > 0 && (
        <div className="space-y-2 mb-5">
          {members.map(member => {
            const sc = statusConfig[member.status]
            return (
              <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition">
                <MemberAvatar email={member.invited_email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{member.invited_email}</p>
                  <p className="text-xs text-slate-400">{roleConfig[member.role] ?? member.role}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${sc.cls}`}>
                    {sc.label}
                  </span>
                  {isOwner && member.status === 'pending' && (
                    <ResendButton memberId={member.id} />
                  )}
                  {isOwner && (
                    <RemoveButton memberId={member.id} projectId={projectId} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formular invitație — doar pentru owner */}
      {isOwner && (
        <form action={inviteAction} className="space-y-2.5">
          <input type="hidden" name="project_id" value={projectId} />

          {inviteState?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {inviteState.error}
            </div>
          )}
          {inviteState?.success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Invitație trimisă cu succes!
            </div>
          )}

          {/* Rând 1: email */}
          <input
            name="email"
            type="email"
            required
            placeholder="email@coleg.ro"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />

          {/* Rând 2: rol + buton — ambele în card */}
          <div className="flex gap-2">
            <select
              name="role"
              defaultValue="viewer"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
            >
              <option value="viewer">👁 Vizitator</option>
              <option value="editor">✏️ Editor</option>
              <option value="manager">⭐ Manager Proiect</option>
            </select>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                  Invită
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-500">Vizitator</span> — doar vedere ·{' '}
            <span className="font-medium text-slate-500">Editor</span> — poate edita sarcini ·{' '}
            <span className="font-medium text-slate-500">Manager</span> — acces complet
          </p>
        </form>
      )}
    </div>
  )
}
