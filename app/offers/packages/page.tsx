import { createClient } from '@/lib/supabase/server'
import type { OfferPackage } from '@/types/database'
import PackagesManager from '@/components/offers/PackagesManager'

export const dynamic = 'force-dynamic'

export default async function OfferPackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('offer_packages')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  return <PackagesManager packages={(data ?? []) as OfferPackage[]} />
}
