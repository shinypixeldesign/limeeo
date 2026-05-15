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
  pending:  { label: 'Invitat',  cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Activ',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  declined: { label: 'Refuzat', cls: 'bg-red-50 text-red-700 ring-red-200' },
}

const roleConfig: Record<string, string> = {
  viewer:  'Vizitator',
  editor:  'Editor',
  manager: 'Manager',
}

function MemberAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return (
    <div className={`w-8 h-8 rounded-full ${colors[Math.abs(hash) % colors.length]} flex items-center justify-center shrink-0`}>
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
        <span className="text-[10px] text-[#9ba6a0]">Sigur?</span>
        <button type="submit" className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-1 py-0.5 rounded">Da</button>
        <button type="button" onClick={() => setConfirm(false)} className="text-[10px] text-[#9ba6a0] px-1 py-0.5 rounded">Nu</button>
      </form>
    )
  }
  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="p-1 rounded text-[#c4ccc5] hover:text-red-500 hover:bg-red-50 transition" title="Elimină">
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
    <button type="button" onClick={handle} disabled={loading || done}
      className="text-[10px] font-semibold text-[#5aa70d] hover:text-[#437d0a] transition disabled:opacity-50">
      {done ? '✓ Trimis' : loading ? '...' : 'Retrimite'}
    </button>
  )
}

/* ── Input / select shared style ── */
const fieldCls = 'w-full px-3 py-2.5 border border-[#dbe2dc] rounded-[12px] bg-[#f5f8f5] focus:bg-white focus:border-[#acff55] focus:outline-none focus:ring-2 focus:ring-[#acff55]/20 transition-all text-sm text-[#0e0f12] placeholder:text-[#9ba6a0]'

export default function TeamMembers({ projectId, members, isPlanAllowed, isOwner }: TeamMembersProps) {
  const [inviteState, inviteAction, pending] = useActionState(inviteMemberAction, undefined)

  /* ── Upgrade wall ── */
  if (!isPlanAllowed) {
    return (
      <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-[10px] bg-violet-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-[#0e0f12]">Membrii echipei</h3>
        </div>
        <div className="rounded-[14px] bg-violet-50 border border-violet-100 p-4 text-center">
          <p className="text-xs font-bold text-violet-900 mb-1">Funcție Pro</p>
          <p className="text-xs text-violet-600 mb-3">Invită colegi să colaboreze pe proiecte din planul Pro.</p>
          <a href="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition">
            Upgrade la Pro →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-[10px] bg-violet-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-[#0e0f12]">Membrii echipei</h3>
        {members.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-[#6f7a72] bg-[#e9eeea] px-2 py-0.5 rounded-full">
            {members.filter(m => m.status === 'accepted').length}/{members.length}
          </span>
        )}
      </div>

      {/* Lista membrilor */}
      {members.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {members.map(member => {
            const sc = statusConfig[member.status]
            return (
              <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-[12px] hover:bg-[#f5f8f5] transition">
                <MemberAvatar email={member.invited_email} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0e0f12] truncate">{member.invited_email}</p>
                  <p className="text-[10px] text-[#9ba6a0]">{roleConfig[member.role] ?? member.role}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${sc.cls}`}>
                    {sc.label}
                  </span>
                  {isOwner && member.status === 'pending' && <ResendButton memberId={member.id} />}
                  {isOwner && <RemoveButton memberId={member.id} projectId={projectId} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form invitație — doar owner */}
      {isOwner && (
        <form action={inviteAction} className="space-y-2">
          <input type="hidden" name="project_id" value={projectId} />

          {inviteState?.error && (
            <div className="rounded-[10px] bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {inviteState.error}
            </div>
          )}
          {inviteState?.success && (
            <div className="rounded-[10px] bg-[#e3f6e9] border border-[#b7e8c8] px-3 py-2 text-xs text-[#2d7a4a] flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Invitație trimisă!
            </div>
          )}

          {/* Email */}
          <input name="email" type="email" required placeholder="email@coleg.ro" className={fieldCls} />

          {/* Rol */}
          <select name="role" defaultValue="viewer" className={fieldCls}>
            <option value="viewer">👁 Vizitator</option>
            <option value="editor">✏️ Editor</option>
            <option value="manager">⭐ Manager</option>
          </select>

          {/* Buton invitare — full width, lime */}
          <button type="submit" disabled={pending}
            className="w-full py-2.5 bg-[#acff55] hover:bg-[#93ee35] text-black font-bold rounded-full transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
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

          <p className="text-[10px] text-[#9ba6a0] leading-relaxed">
            <span className="font-semibold text-[#6f7a72]">Vizitator</span> — doar vedere ·{' '}
            <span className="font-semibold text-[#6f7a72]">Editor</span> — poate edita sarcini ·{' '}
            <span className="font-semibold text-[#6f7a72]">Manager</span> — acces complet
          </p>
        </form>
      )}
    </div>
  )
}
