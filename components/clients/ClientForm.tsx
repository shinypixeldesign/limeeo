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

export default function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction, pending] = useActionState<ClientState, FormData>(action, undefined)
  const [logoUrl, setLogoUrl] = useState(client?.logo_url ?? '')
  const [clientName, setClientName] = useState(client?.name ?? '')
  const isEdit = !!client

  return (
    <form action={formAction} className="space-y-6">
      {client && <input type="hidden" name="id" value={client.id} />}
      <input type="hidden" name="logo_url" value={logoUrl} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Logo companie */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Logo companie
        </label>
        <LogoUpload
          currentUrl={logoUrl || null}
          clientName={clientName}
          onUploaded={setLogoUrl}
        />
      </div>

      {/* Grid 2 coloane */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Nume */}
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nume <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={client?.name}
            placeholder="ex: Andrei Ionescu"
            onChange={e => setClientName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Companie */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">
            Companie
          </label>
          <input
            id="company"
            name="company"
            type="text"
            defaultValue={client?.company ?? ''}
            placeholder="ex: Acme SRL"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={client?.status ?? 'active'}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            <option value="active">Activ</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactiv</option>
          </select>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ''}
            placeholder="client@exemplu.ro"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Telefon */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ''}
            placeholder="07xx xxx xxx"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Website */}
        <div className="sm:col-span-2">
          <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-1.5">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={client?.website ?? ''}
            placeholder="https://exemplu.ro"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Date fiscale */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Date fiscale (pentru facturi)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="cui" className="block text-sm font-medium text-slate-700 mb-1.5">CUI / CIF</label>
            <input
              id="cui"
              name="cui"
              type="text"
              defaultValue={client?.cui ?? ''}
              placeholder="ex: RO12345678"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label htmlFor="reg_com" className="block text-sm font-medium text-slate-700 mb-1.5">Nr. Reg. Comerțului</label>
            <input
              id="reg_com"
              name="reg_com"
              type="text"
              defaultValue={client?.reg_com ?? ''}
              placeholder="ex: J40/1234/2020"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1.5">Adresă</label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={client?.address ?? ''}
              placeholder="Str. Exemplu nr. 1, Bl. A, Ap. 5"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1.5">Localitate</label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={client?.city ?? ''}
              placeholder="ex: București"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label htmlFor="county" className="block text-sm font-medium text-slate-700 mb-1.5">Județ</label>
            <input
              id="county"
              name="county"
              type="text"
              defaultValue={client?.county ?? ''}
              placeholder="ex: Ilfov"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Note */}
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">
            Note
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={client?.notes ?? ''}
            placeholder="Informații relevante despre client..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
          />
        </div>
      </div>

      {/* Butoane */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={cancelHref}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
        >
          Anulează
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Adaugă client'}
        </button>
      </div>
    </form>
  )
}
