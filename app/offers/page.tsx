import { createClient } from '@/lib/supabase/server'
import type { Offer, Client } from '@/types/database'
import OffersDashboard from '@/components/offers/OffersDashboard'

export const dynamic = 'force-dynamic'

type OfferWithClient = Offer & { client: Pick<Client, 'id' | 'name' | 'logo_url'> | null }

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('offers')
    .select('*, client:clients(id, name, logo_url)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return <OffersDashboard offers={(data ?? []) as OfferWithClient[]} />
}
