'use client'

import { useActionState, useState, useRef } from 'react'
import { Upload, Check, Loader2, ChevronDown } from 'lucide-react'
import { saveProfileAction } from '@/app/actions/settings'
import type { Profile } from '@/types/database'
import type { SettingsState } from '@/app/actions/settings'
import PushNotificationSettings from './PushNotificationSettings'
import EmailIntegrations from './EmailIntegrations'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profile: Profile | null
  userEmail: string
  gmailEmail: string | null
  outlookEmail: string | null
}

const inputCls =
  'w-full px-4 py-2.5 border border-[#dbe2dc] rounded-[12px] bg-[#f5f8f5] focus:bg-white focus:border-[#acff55] focus:outline-none focus:ring-2 focus:ring-[#acff55]/20 transition-all text-sm font-medium text-[#0e0f12] placeholder:text-[#9ba6a0]'
const labelCls = 'block text-sm font-semibold text-[#2e342f] mb-1.5'

export default function SettingsForm({ profile, userEmail, gmailEmail, outlookEmail }: Props) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveProfileAction, undefined)

  /* ── CUI auto-completare ── */
  const [cuiLoading, setCuiLoading] = useState(false)
  const [cuiError, setCuiError]   = useState<string | null>(null)
  const cuiRef             = useRef<HTMLInputElement>(null)
  const companyNameRef     = useRef<HTMLInputElement>(null)
  const companyJRef        = useRef<HTMLInputElement>(null)
  const companyAddressRef  = useRef<HTMLInputElement>(null)
  const companyCityRef     = useRef<HTMLInputElement>(null)
  const companyCountyRef   = useRef<HTMLInputElement>(null)
  const companyPhoneRef    = useRef<HTMLInputElement>(null)

  async function handleCUILookup() {
    const cui = cuiRef.current?.value?.trim()
    if (!cui) return
    setCuiLoading(true)
    setCuiError(null)
    try {
      const res  = await fetch('/api/anaf-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui }),
      })
      const data = await res.json()
      if (!res.ok) { setCuiError(data.error ?? 'Firma negăsită'); return }
      if (companyNameRef.current)    companyNameRef.current.value    = data.denumire  ?? ''
      if (companyJRef.current)       companyJRef.current.value       = data.nrRegCom  ?? ''
      if (companyAddressRef.current) companyAddressRef.current.value = data.adresa    ?? ''
      if (companyCityRef.current)    companyCityRef.current.value    = data.city      ?? ''
      if (companyCountyRef.current)  companyCountyRef.current.value  = data.county    ?? ''
      if (companyPhoneRef.current && data.telefon) companyPhoneRef.current.value = data.telefon
    } catch {
      setCuiError('Nu s-a putut contacta ANAF. Încearcă din nou.')
    } finally {
      setCuiLoading(false)
    }
  }

  /* ── Logo upload ── */
  const [logoUrl,       setLogoUrl]       = useState(profile?.logo_url ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith('image/')) { setLogoError('Selectează o imagine (JPG, PNG, SVG, WebP)'); return }
    if (file.size > 2 * 1024 * 1024)    { setLogoError('Dimensiunea maximă este 2MB'); return }
    setLogoError(null)
    setLogoUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLogoError('Neautorizat'); setLogoUploading(false); return }
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `profiles/${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('client-logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setLogoError(upErr.message); setLogoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(path)
    setLogoUrl(publicUrl)
    setLogoUploading(false)
  }

  /* ── SmartBill panel toggle ── */
  const [smartbillOpen, setSmartbillOpen] = useState(!!profile?.smartbill_email)

  return (
    <form action={formAction}>
      {/* logo_url sincronizat cu state */}
      <input type="hidden" name="logo_url" value={logoUrl} />

      {/* ── Header ── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0e0f12]">Setări &amp; Profil</h1>
          <p className="text-[#6f7a72] text-sm mt-1">
            Gestionează contul și preferințele companiei
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#acff55] hover:bg-[#93ee35] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20 hover:shadow-xl hover:shadow-[#acff55]/30 disabled:opacity-60 text-sm"
          >
            {pending
              ? <Loader2 size={17} className="animate-spin" />
              : <Check size={17} />}
            {pending ? 'Se salvează...' : 'Salvează modificările'}
          </button>
          {state?.success && (
            <p className="text-xs text-emerald-600 font-semibold">{state.success}</p>
          )}
          {state?.error && (
            <p className="text-xs text-red-500 font-semibold">{state.error}</p>
          )}
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* ── Card 1: Companie & Profil ── */}
        <div className="bg-white rounded-[20px] p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-bold text-[#0e0f12] mb-6">Detalii companie &amp; profil</h3>

          <div className="space-y-5">
            {/* Nume + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nume complet</label>
                <input name="full_name" type="text" defaultValue={profile?.full_name ?? ''} placeholder="ex: Ion Popescu" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email cont</label>
                <input type="email" value={userEmail} disabled
                  className="w-full px-4 py-2.5 border border-[#dbe2dc] rounded-[12px] bg-[#e9eeea] text-sm font-medium text-[#9ba6a0] cursor-not-allowed" />
              </div>
            </div>

            {/* CUI */}
            <div>
              <label className={labelCls}>CUI / CIF</label>
              <div className="flex gap-3">
                <input
                  ref={cuiRef}
                  name="company_cui"
                  type="text"
                  defaultValue={profile?.company_cui ?? ''}
                  placeholder="ex: RO12345678"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={handleCUILookup}
                  disabled={cuiLoading}
                  className="px-5 py-2.5 bg-[#acff55] hover:bg-[#93ee35] text-black font-bold rounded-[12px] transition-all disabled:opacity-50 whitespace-nowrap text-sm shrink-0"
                >
                  {cuiLoading ? <Loader2 size={16} className="animate-spin" /> : 'Auto-completare'}
                </button>
              </div>
              {cuiError && <p className="text-xs text-red-500 mt-1.5">{cuiError}</p>}
            </div>

            {/* Nume companie */}
            <div>
              <label className={labelCls}>Nume companie</label>
              <input ref={companyNameRef} name="company_name" type="text"
                defaultValue={profile?.company_name ?? ''} placeholder="Se auto-completează din CUI" className={inputCls} />
            </div>

            {/* Reg. Com. */}
            <div>
              <label className={labelCls}>Nr. Reg. Comerțului</label>
              <input ref={companyJRef} name="company_j" type="text"
                defaultValue={profile?.company_j ?? ''} placeholder="ex: J40/1234/2024" className={inputCls} />
            </div>

            {/* Adresă */}
            <div>
              <label className={labelCls}>Adresă sediu</label>
              <input ref={companyAddressRef} name="company_address" type="text"
                defaultValue={profile?.company_address ?? ''} placeholder="Se auto-completează din CUI" className={inputCls} />
            </div>

            {/* Oraș + Județ */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Oraș</label>
                <input ref={companyCityRef} name="company_city" type="text"
                  defaultValue={profile?.company_city ?? ''} placeholder="ex: București" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Județ</label>
                <input ref={companyCountyRef} name="company_county" type="text"
                  defaultValue={profile?.company_county ?? ''} placeholder="ex: Ilfov" className={inputCls} />
              </div>
            </div>

            {/* Telefon + Email facturare */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Telefon</label>
                <input ref={companyPhoneRef} name="company_phone" type="text"
                  defaultValue={profile?.company_phone ?? ''} placeholder="+40 721 234 567" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email facturare</label>
                <input name="company_email" type="email"
                  defaultValue={profile?.company_email ?? ''} placeholder="facturi@firma.ro" className={inputCls} />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className={labelCls}>Website</label>
              <input name="company_website" type="text"
                defaultValue={profile?.company_website ?? ''} placeholder="https://firma.ro" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Card 2: Brand companie ── */}
        <div className="bg-white rounded-[20px] p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-bold text-[#0e0f12] mb-6">Brand companie</h3>

          <label className={labelCls}>Logo companie</label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
          />
          <div
            onClick={() => logoInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleLogoFile(f) }}
            onDragOver={e => e.preventDefault()}
            className="flex flex-col items-center justify-center w-full h-60 border-2 border-dashed border-[#c4ccc5] rounded-[16px] cursor-pointer hover:border-[#acff55] hover:bg-[#f3ffe1] transition-all group"
          >
            {logoUploading ? (
              <div className="flex items-center gap-2 text-sm text-[#6f7a72]">
                <Loader2 size={20} className="animate-spin text-[#acff55]" />
                Se încarcă...
              </div>
            ) : logoUrl ? (
              <div className="text-center px-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="h-28 max-w-[240px] object-contain mx-auto mb-3" />
                <p className="text-xs text-[#6f7a72]">Click pentru a schimba</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 mb-3 bg-[#e9eeea] rounded-[12px] flex items-center justify-center group-hover:bg-[#acff55]/20 transition">
                  <Upload size={24} className="text-[#9ba6a0] group-hover:text-[#76d318] transition" />
                </div>
                <p className="text-sm font-semibold text-[#0e0f12] mb-1">Trage &amp; plasează logo-ul</p>
                <p className="text-xs text-[#9ba6a0]">sau click pentru a selecta</p>
                <p className="text-xs text-[#c4ccc5] mt-2">PNG, JPG sau SVG · max 2MB</p>
              </>
            )}
          </div>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl('')}
              className="mt-2 text-xs text-[#9ba6a0] hover:text-red-500 transition">
              Elimină logo
            </button>
          )}
          {logoError && <p className="text-xs text-red-500 mt-2">{logoError}</p>}
        </div>

        {/* ── Card 3: Date bancare & Preferințe ── */}
        <div className="bg-white rounded-[20px] p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-bold text-[#0e0f12] mb-6">Date bancare &amp; preferințe</h3>

          <div className="space-y-5">
            <div>
              <label className={labelCls}>IBAN</label>
              <input name="company_iban" type="text"
                defaultValue={profile?.company_iban ?? ''}
                placeholder="RO49 AAAA 1B31 0075 9384 0000"
                className={`${inputCls} font-mono tracking-wide`} />
            </div>
            <div>
              <label className={labelCls}>Bancă</label>
              <input name="company_bank" type="text"
                defaultValue={profile?.company_bank ?? ''}
                placeholder="ex: BCR, BRD, ING"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valută implicită</label>
              <select name="default_currency" defaultValue={profile?.default_currency ?? 'RON'}
                className={inputCls}>
                <option value="RON">RON — Leu românesc</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dolar american</option>
                <option value="GBP">GBP — Liră sterlină</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Card 4: Integrări & Notificări ── */}
        <div className="bg-white rounded-[20px] p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-bold text-[#0e0f12] mb-6">Integrări &amp; Notificări</h3>

          {/* SmartBill */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setSmartbillOpen(o => !o)}
              className="w-full flex items-center justify-between p-4 rounded-[14px] bg-[#f5f8f5] hover:bg-[#e9eeea] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center text-xl border border-[#e9eeea] shrink-0">
                  📄
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#0e0f12] text-sm">SmartBill</p>
                  <p className="text-xs text-[#6f7a72]">Facturare &amp; contabilitate automată</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {profile?.smartbill_email && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Configurat
                  </span>
                )}
                <ChevronDown size={16} className={`text-[#9ba6a0] transition-transform ${smartbillOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* SmartBill fields — always in DOM (display toggle), submit regardless */}
            <div className={`mt-3 space-y-3 px-1 ${smartbillOpen ? 'block' : 'hidden'}`}>
              <div>
                <label className={labelCls}>Email SmartBill</label>
                <input name="smartbill_email" type="email"
                  defaultValue={profile?.smartbill_email ?? ''}
                  placeholder="email@firma.ro"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Token SmartBill</label>
                <input name="smartbill_token" type="password" autoComplete="off"
                  defaultValue={profile?.smartbill_token ?? ''}
                  placeholder="001|xxxxxxxxxxxxxxxx"
                  className={inputCls} />
                <p className="text-xs text-[#9ba6a0] mt-1">SmartBill → Configurare → API → Token</p>
              </div>
              <div>
                <label className={labelCls}>Serie facturi</label>
                <input name="smartbill_series"
                  defaultValue={profile?.smartbill_series ?? 'FCT'}
                  placeholder="ex: FCT"
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Gmail + Outlook */}
          <div className="mb-5 space-y-3">
            <EmailIntegrations gmailEmail={gmailEmail} outlookEmail={outlookEmail} />
          </div>

          {/* Push Notifications */}
          <div className="pt-5 border-t border-[#e9eeea]">
            <PushNotificationSettings />
          </div>
        </div>

      </div>
    </form>
  )
}
