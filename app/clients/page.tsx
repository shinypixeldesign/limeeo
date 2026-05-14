import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/database'
import ClientsView from '@/components/clients/ClientsView'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientsRes, profileRes] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').eq('id', user!.id).single(),
  ])

  const clients = (clientsRes.data ?? []) as Client[]
  const plan = profileRes.data?.plan ?? 'free'

  return <ClientsView clients={clients} plan={plan} />
}
