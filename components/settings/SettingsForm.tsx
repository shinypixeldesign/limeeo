'use client'

import { useActionState } from 'react'
import { saveProfileAction } from '@/app/actions/settings'
import type { Profile } from '@/types/database'
import type { SettingsState } from '@/app/actions/settings'

interface SettingsFormProps {
  profile: Profile | null
  userEmail: string
}

function Field({ label, name, defaultValue, placeholder, type = 'text', hint }: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function SettingsForm({ profile, userEmail }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveProfileAction, undefined)

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {state.success}
        </div>
      )}

      {/* Date personale */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">Date personale</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nume complet" name="full_name" defaultValue={profile?.full_name} placeholder="ex: Ion Popescu" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email cont</label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Date companie */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">Date companie / freelancer</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nume companie / Freelancer"
            name="company_name"
            defaultValue={profile?.company_name}
            placeholder="ex: SPD Design SRL / Ion Popescu PFA"
          />
          <Field
            label="CUI / CIF"
            name="company_cui"
            defaultValue={profile?.company_cui}
            placeholder="ex: RO12345678"
            hint="Codul de identificare fiscală"
          />
          <Field
            label="Nr. Reg. Comerțului"
            name="company_j"
            defaultValue={profile?.company_j}
            placeholder="ex: J40/1234/2023"
          />
          <Field
            label="Telefon"
            name="company_phone"
            defaultValue={profile?.company_phone}
            placeholder="ex: +40 721 234 567"
          />
          <div className="col-span-2">
            <Field
              label="Adresă sediu"
              name="company_address"
              defaultValue={profile?.company_address}
              placeholder="ex: Str. Exemplu nr. 10, ap. 2"
            />
          </div>
          <Field
            label="Oraș"
            name="company_city"
            defaultValue={profile?.company_city}
            placeholder="ex: București"
          />
          <Field
            label="Județ"
            name="company_county"
            defaultValue={profile?.company_county}
            placeholder="ex: Ilfov"
          />
          <Field
            label="Email facturare"
            name="company_email"
            defaultValue={profile?.company_email}
            type="email"
            placeholder="ex: facturi@firma.ro"
          />
          <Field
            label="Website"
            name="company_website"
            defaultValue={profile?.company_website}
            placeholder="ex: https://firma.ro"
          />
        </div>
      </section>

      {/* Date bancare */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">Date bancare</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field
              label="IBAN"
              name="company_iban"
              defaultValue={profile?.company_iban}
              placeholder="ex: RO49AAAA1B31007593840000"
            />
          </div>
          <Field
            label="Bancă"
            name="company_bank"
            defaultValue={profile?.company_bank}
            placeholder="ex: ING Bank"
          />
        </div>
      </section>

      {/* Logo */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">Logo companie</h2>
        <div className="flex items-start gap-6">
          {profile?.logo_url && (
            <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div className="flex-1">
            <Field
              label="URL logo (link direct la imagine)"
              name="logo_url"
              defaultValue={profile?.logo_url}
              placeholder="ex: https://firma.ro/logo.png"
              hint="PNG sau SVG pe fundal transparent. Recomandăm minim 300×100px."
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {pending ? 'Se salvează...' : 'Salvează setările'}
        </button>
      </div>
    </form>
  )
}
