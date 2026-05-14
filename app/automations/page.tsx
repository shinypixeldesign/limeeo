import { createClient } from '@/lib/supabase/server'
import AutomationsView from '@/components/automations/AutomationsView'
import type { AutomationRule } from '@/types/database'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Automatizări follow-up</h1>
        <p className="text-sm text-slate-500 mt-1">
          Creează reguli care trimit emailuri automat — oferte nevăzute, facturi restante, deadline-uri apropiante.
        </p>
      </div>
      <AutomationsView rules={(rules ?? []) as AutomationRule[]} />
    </div>
  )
}
