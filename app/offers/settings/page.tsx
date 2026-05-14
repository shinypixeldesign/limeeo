import { createClient } from '@/lib/supabase/server'
import OfferSettingsForm from '@/components/offers/OfferSettingsForm'
import type { Profile } from '@/types/database'
import Link from 'next/link'

export default async function OfferSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <Link href="/offers" className="hover:text-slate-600 transition">Oferte</Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">Setări oferte</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Setări oferte</h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalizează seria, textele implicite și brandingul ofertelor tale.
        </p>
      </div>
      <OfferSettingsForm profile={profile as Profile | null} />
    </div>
  )
}
