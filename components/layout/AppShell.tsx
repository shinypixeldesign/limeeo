import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUnreadCount } from '@/lib/notifications'
import Sidebar from './Sidebar'
import RunningTimerBar from '@/components/time/RunningTimerBar'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userName = user.user_metadata?.full_name as string | undefined
  const unreadCount = await getUnreadCount(user.id)

  // Fetch timer activ
  const { data: runningTimer } = await supabase
    .from('time_entries')
    .select('id, started_at, description, project_id, client_id, project:projects(name), client:clients(name)')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()

  const timer = runningTimer as {
    id: string
    started_at: string
    description: string | null
    project: { name: string } | null
    client: { name: string } | null
  } | null

  return (
    <div className="flex h-full bg-[#e9eeea]">
      <Sidebar userEmail={user.email} userName={userName} unreadCount={unreadCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {timer && (
          <RunningTimerBar
            entryId={timer.id}
            startedAt={timer.started_at}
            description={timer.description}
            projectName={timer.project?.name ?? null}
            clientName={timer.client?.name ?? null}
          />
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
