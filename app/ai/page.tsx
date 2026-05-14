import { createClient } from '@/lib/supabase/server'
import { AI_LIMITS } from '@/lib/claude'
import AIAssistant from '@/components/ai/AIAssistant'

export default async function AIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, messagesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('plan, ai_messages_used, ai_messages_reset_at')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('ai_messages')
      .select('id, role, content, context_type, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true })
      .limit(300),
  ])

  const plan = (profileRes.data?.plan ?? 'free') as string
  const limitRaw = AI_LIMITS[plan] ?? 0
  const used = profileRes.data?.ai_messages_used ?? 0
  const hasAccess = limitRaw > 0
  const limit = limitRaw === Infinity ? -1 : limitRaw
  const remaining = limitRaw === Infinity ? -1 : Math.max(0, limitRaw - used)

  return (
    <div className="flex flex-col h-full">
      <AIAssistant
        plan={plan}
        hasAccess={hasAccess}
        remaining={remaining}
        limit={limit}
        dbMessages={(messagesRes.data ?? []) as Array<{
          id: string
          role: string
          content: string
          context_type: string
          created_at: string
        }>}
      />
    </div>
  )
}
