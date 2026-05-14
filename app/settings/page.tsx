import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'
import PushNotificationSettings from '@/components/settings/PushNotificationSettings'
import EmailIntegrations from '@/components/settings/EmailIntegrations'
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
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Setări profil</h1>
          <p className="text-sm text-slate-500 mt-1">
            Informațiile tale apar pe facturi și oferte. Completează-le pentru documente legale corecte.
          </p>
        </div>
        <SettingsForm profile={typedProfile} userEmail={user!.email ?? ''} />
      </div>

      {/* Notificări */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Notificări</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configurează notificările push pentru a fi anunțat în timp real.
          </p>
        </div>
        <PushNotificationSettings />
      </div>

      {/* Integrări email */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Integrări email</h2>
          <p className="text-sm text-slate-500 mt-1">
            Conectează-ți contul Gmail sau Outlook pentru a trimite emailuri din adresa proprie.
          </p>
        </div>
        <EmailIntegrations
          gmailEmail={typedProfile?.gmail_email ?? null}
          outlookEmail={typedProfile?.outlook_email ?? null}
        />
      </div>
    </div>
  )
}
