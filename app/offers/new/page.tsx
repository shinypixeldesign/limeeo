import { createClient } from '@/lib/supabase/server'
import OfferForm from '@/components/offers/OfferForm'
import { createOfferAction } from '@/app/actions/offers'
import type { Client, Project, OfferPackage, Profile } from '@/types/database'
import Link from 'next/link'

export default async function NewOfferPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [clientsRes, projectsRes, packagesRes, profileRes] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('projects').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('offer_packages').select('*').eq('user_id', user!.id).order('updated_at', { ascending: false }),
    supabase.from('profiles').select('offer_series_prefix,offer_default_intro,offer_default_terms,offer_default_notes,offer_default_validity,offer_brand_color,default_currency').eq('id', user!.id).single(),
  ])

  const profile = profileRes.data as Pick<Profile, 'offer_series_prefix'|'offer_default_intro'|'offer_default_terms'|'offer_default_notes'|'offer_default_validity'|'offer_brand_color'|'default_currency'> | null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/offers" className="hover:text-slate-600 transition">Oferte</Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">Ofertă nouă</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ofertă nouă</h1>
        </div>
        <Link href="/offers/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Setări oferte
        </Link>
      </div>
      <OfferForm
        action={createOfferAction}
        clients={(clientsRes.data ?? []) as Client[]}
        projects={(projectsRes.data ?? []) as Project[]}
        cancelHref="/offers"
        packages={(packagesRes.data ?? []) as OfferPackage[]}
        profileDefaults={profile}
      />
    </div>
  )
}
