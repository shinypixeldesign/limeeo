'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Client } from '@/types/database'
import type { ClientState } from '@/app/actions/clients'
import LogoUpload from './LogoUpload'

interface ClientFormProps {
  action: (state: ClientState, formData: FormData) => Promise<ClientState>
  client?: Client
  cancelHref: string
}

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400'
const labelCls = 'block text-sm font-bold text-gray-700 mb-3'

interface AnafResult {
  success: boolean
  error?: string
  data?: {
    denumire: string
    adresa: string
    nrRegCom: string
    platitorTva: boolean
    stare: string
    localitate: string
    judet: string
  }
}

export default function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction, pending] = useActionState<ClientState, FormData>(action, undefined)
  const [logoUrl, setLogoUrl] = useState(client?.logo_url ?? '')
  const [clientName, setClientName] = useState(client?.name ?? '')

  // Câmpuri controlate pentru auto-completare ANAF
  const [cui, setCui]         = useState(client?.cui ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [regCom, setRegCom]   = useState(client?.reg_com ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [city, setCity]       = useState(client?.city ?? '')
  const [county, setCounty]   = useState(client?.county ?? '')

  // State ANAF lookup
  const [anafLoading, setAnafLoading]   = useState(false)
  const [anafError, setAnafError]       = useState<string | null>(null)
  const [anafSuccess, setAnafSuccess]   = useState(false)

  const isEdit = !!client

  async function handleAnafLookup() {
    if (!cui.trim()) {
      setAnafError('Introduceți mai întâi CUI-ul.')
      return
    }
    setAnafLoading(true)
    setAnafError(null)
    setAnafSuccess(false)

    try {
      const res = await fetch('/api/anaf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cui: cui.trim() }),
      })
      const result: AnafResult = await res.json()

      if (!result.success || !result.data) {
        setAnafError(result.error ?? 'Eroare la interogarea ANAF.')
        return
      }

      const { denumire, adresa, nrRegCom, localitate, judet } = result.data

      console.log('[ANAF] date primite:', { denumire, adresa, nrRegCom, localitate, judet })

      // Populează câmpurile
      if (denumire)  setCompany(denumire)
      if (adresa)    setAddress(adresa)
      if (nrRegCom)  setRegCom(nrRegCom)
      if (localitate) setCity(localitate)
      if (judet)     setCounty(judet)
      setAnafSuccess(true)
    } catch {
      setAnafError('Nu s-a putut conecta la serviciul ANAF. Verifică conexiunea.')
    } finally {
      setAnafLoading(false)
    }
  }

  return (
    <form action={formAction}>
      {client && <input type="hidden" name="id" value={client.id} />}
      <input type="hidden" name="logo_url" value={logoUrl} />

      {state?.error && (
        <div className="mb-6 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card 1: Identitate Companie */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5">
          <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Identitate Companie</h3>
          <div className="space-y-6">
            {/* Logo */}
            <div>
              <label className={labelCls}>Logo Companie</label>
              <LogoUpload
                currentUrl={logoUrl || null}
                clientName={clientName}
                onUploaded={setLogoUrl}
              />
            </div>

            {/* Nume */}
            <div>
              <label htmlFor="name" className={labelCls}>
                Nume <span className="text-red-500 font-normal">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={client?.name}
                placeholder="ex: Andrei Ionescu"
                onChange={e => setClientName(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Companie */}
            <div>
              <label htmlFor="company" className={labelCls}>Companie</label>
              <input
                id="company"
                name="company"
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="ex: Acme SRL"
                className={inputCls}
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className={labelCls}>Status</label>
              <select
                id="status"
                name="status"
                defaultValue={client?.status ?? 'active'}
                className={inputCls}
              >
                <option value="active">Activ</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactiv</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Informații Contact */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5">
          <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Informații Contact</h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className={labelCls}>Adresă Email</label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email ?? ''}
                placeholder="client@exemplu.ro"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelCls}>Număr Telefon</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={client?.phone ?? ''}
                placeholder="07xx xxx xxx"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="website" className={labelCls}>Website</label>
              <input
                id="website"
                name="website"
                type="url"
                defaultValue={client?.website ?? ''}
                placeholder="https://exemplu.ro"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Date Fiscale — full width */}
      <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Date Fiscale & Facturare</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* CUI cu buton ANAF */}
          <div>
            <label htmlFor="cui" className={labelCls}>CUI / CIF</label>
            <div className="flex gap-2">
              <input
                id="cui"
                name="cui"
                type="text"
                value={cui}
                onChange={e => { setCui(e.target.value); setAnafError(null); setAnafSuccess(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAnafLookup() } }}
                placeholder="ex: RO12345678"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={handleAnafLookup}
                disabled={anafLoading || !cui.trim()}
                title="Completează automat din ANAF"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-3 bg-[#acff55] hover:bg-[#9fee44] disabled:bg-gray-100 disabled:text-gray-400 text-black font-bold rounded-[12px] transition-all text-sm whitespace-nowrap"
              >
                {anafLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Se caută...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                    </svg>
                    Completare automată
                  </>
                )}
              </button>
            </div>

            {/* Feedback ANAF */}
            {anafError && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
                {anafError}
              </p>
            )}
            {anafSuccess && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Date completate automat din ANAF
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg_com" className={labelCls}>Nr. Registrul Comerțului</label>
            <input
              id="reg_com"
              name="reg_com"
              type="text"
              value={regCom}
              onChange={e => setRegCom(e.target.value)}
              placeholder="ex: J40/1234/2020"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6">
          <div className="sm:col-span-2">
            <label htmlFor="address" className={labelCls}>Adresă</label>
            <input
              id="address"
              name="address"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Str. Exemplu nr. 1, Bl. A, Ap. 5"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="city" className={labelCls}>Localitate</label>
            <input
              id="city"
              name="city"
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="ex: București"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="county" className={labelCls}>Județ</label>
            <input
              id="county"
              name="county"
              type="text"
              value={county}
              onChange={e => setCounty(e.target.value)}
              placeholder="ex: Ilfov"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={labelCls}>Note Interne</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={client?.notes ?? ''}
            placeholder="Adaugă orice informații relevante despre acest client..."
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-4">
        <Link
          href={cancelHref}
          className="px-6 py-3 font-semibold text-gray-600 hover:text-gray-900 transition-all"
        >
          Anulează
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20 hover:shadow-xl hover:shadow-[#acff55]/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Adaugă client'}
        </button>
      </div>
    </form>
  )
}
