import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'
import type { Profile } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const typedProfile = profile as Profile | null

  return (
    <div className="p-8 max-w-6xl">
      <SettingsForm
        profile={typedProfile}
        userEmail={user!.email ?? ''}
        gmailEmail={typedProfile?.gmail_email ?? null}
        outlookEmail={typedProfile?.outlook_email ?? null}
      />
    </div>
  )
}
