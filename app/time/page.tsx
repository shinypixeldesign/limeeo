import { createClient } from '@/lib/supabase/server'
import type { TimeEntry, Client, Project, TimeTag, ClientRate, TimeSettings } from '@/types/database'
import TimeTracker from '@/components/time/TimeTracker'

export const dynamic = 'force-dynamic'

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [entriesRes, clientsRes, projectsRes, tagsRes, ratesRes, settingsRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('*, project:projects(id,name,client_id), client:clients(id,name)')
      .eq('user_id', user!.id)
      .order('started_at', { ascending: false })
      .limit(500),
    supabase.from('clients').select('id,name').eq('user_id', user!.id).order('name'),
    supabase.from('projects').select('id,name,client_id').eq('user_id', user!.id).order('name'),
    supabase.from('time_tags').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('client_rates').select('*').eq('user_id', user!.id),
    supabase.from('time_settings').select('*').eq('user_id', user!.id).single(),
  ])

  return (
    <TimeTracker
      initialEntries={(entriesRes.data ?? []) as TimeEntry[]}
      clients={(clientsRes.data ?? []) as Pick<Client, 'id' | 'name'>[]}
      projects={(projectsRes.data ?? []) as (Pick<Project, 'id' | 'name'> & { client_id: string | null })[]}
      tags={(tagsRes.data ?? []) as TimeTag[]}
      clientRates={(ratesRes.data ?? []) as ClientRate[]}
      settings={(settingsRes.data ?? null) as TimeSettings | null}
      runningEntry={((entriesRes.data ?? []) as TimeEntry[]).find(e => !e.ended_at) ?? null}
    />
  )
}
