import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ProjectMember } from '@/types/database'
import TeamPageClient from '@/components/team/TeamPageClient'

const TEAM_PLANS = ['pro', 'team']

type MemberWithProject = ProjectMember & {
  project: { id: string; name: string } | null
}

export type MyMembership = {
  id: string
  role: string
  project_id: string
  owner_user_id: string
  project: { id: string; name: string } | null
  owner: { id: string; full_name: string | null; company_name: string | null } | null
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, membersRes, projectsRes, myMembershipsRes] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user!.id).single(),
    supabase
      .from('project_members')
      .select('*, project:projects(id, name)')
      .eq('owner_user_id', user!.id)
      .order('invited_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_members')
      .select('id, role, project_id, owner_user_id, project:projects(id, name)')
      .eq('member_user_id', user!.id)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false }),
  ])

  const plan = profileRes.data?.plan ?? 'free'
  const isPlanAllowed = TEAM_PLANS.includes(plan)
  const members = (isPlanAllowed ? (membersRes.data ?? []) : []) as MemberWithProject[]
  const projects = projectsRes.data ?? []

  // Fetch owner profiles separately (FK is to auth.users, not profiles)
  const rawMemberships = myMembershipsRes.data ?? []
  const ownerIds = [...new Set(rawMemberships.map(m => m.owner_user_id))]
  const ownersMap = new Map<string, { id: string; full_name: string | null; company_name: string | null }>()
  if (ownerIds.length > 0) {
    const { data: ownerProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, company_name')
      .in('id', ownerIds)
    for (const p of ownerProfiles ?? []) {
      ownersMap.set(p.id, p)
    }
  }
  const myMemberships: MyMembership[] = rawMemberships.map(m => ({
    ...m,
    project: m.project as unknown as { id: string; name: string } | null,
    owner: ownersMap.get(m.owner_user_id) ?? null,
  }))

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Echipă</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Invită colegi și gestionează accesul la proiectele tale
          </p>
        </div>
      </div>

      {/* Upgrade wall */}
      {!isPlanAllowed && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Colaborare în echipă</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-2 text-sm">
            Invită colegi pe proiectele tale, atribuie roluri și lucrați împreună din același loc.
          </p>
          <p className="text-xs text-slate-400 mb-8">
            Disponibil din planul <strong className="text-slate-600">Pro</strong> (€19/lună)
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {[
              { plan: 'Pro', price: '€19/lună', features: ['Membrii nelimitați', 'Roluri: Editor / Vizitator', 'Invite prin email', 'Mesaje AI nelimitate'] },
              { plan: 'Team', price: '€49/lună', features: ['Tot din Pro', 'Dashboard echipă', 'Rapoarte colaborare', 'Suport prioritar'] },
            ].map(p => (
              <div key={p.plan} className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-left w-64">
                <p className="font-bold text-slate-900">{p.plan}</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1 mb-4">{p.price}</p>
                <ul className="space-y-1.5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Fă upgrade acum
          </Link>
        </div>
      )}

      {/* Conținut Pro+ */}
      {isPlanAllowed && (
        <TeamPageClient projects={projects} members={members} myMemberships={myMemberships} />
      )}
    </div>
  )
}
