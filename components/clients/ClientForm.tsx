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

export default function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction, pending] = useActionState<ClientState, FormData>(action, undefined)
  const [logoUrl, setLogoUrl] = useState(client?.logo_url ?? '')
  const [clientName, setClientName] = useState(client?.name ?? '')
  const isEdit = !!client

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
                defaultValue={client?.company ?? ''}
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
        <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Date Fiscale & Facturare</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="cui" className={labelCls}>CUI / CIF</label>
            <input
              id="cui"
              name="cui"
              type="text"
              defaultValue={client?.cui ?? ''}
              placeholder="ex: RO12345678"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="reg_com" className={labelCls}>Nr. Registrul Comerțului</label>
            <input
              id="reg_com"
              name="reg_com"
              type="text"
              defaultValue={client?.reg_com ?? ''}
              placeholder="ex: J40/1234/2020"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="sm:col-span-2">
            <label htmlFor="address" className={labelCls}>Adresă</label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={client?.address ?? ''}
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
              defaultValue={client?.city ?? ''}
              placeholder="ex: București"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="county" className={labelCls}>Județ</label>
            <input
              id="county"
              name="county"
              type="text"
              defaultValue={client?.county ?? ''}
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
