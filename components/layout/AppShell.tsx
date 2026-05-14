import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUnreadCount } from '@/lib/notifications'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userName = user.user_metadata?.full_name as string | undefined
  const unreadCount = await getUnreadCount(user.id)

  return (
    <div className="flex h-full">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader initialUnreadCount={unreadCount} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
