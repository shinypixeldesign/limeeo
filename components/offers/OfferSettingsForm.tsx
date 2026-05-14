'use client'

import { useActionState, useState } from 'react'
import { saveOfferSettingsAction } from '@/app/actions/offer-settings'
import type { Profile } from '@/types/database'

const BRAND_COLORS = [
  { label: 'Indigo',   value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Slate',   value: '#475569' },
]

export default function OfferSettingsForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(saveOfferSettingsAction, undefined)
  const [brandColor, setBrandColor] = useState(profile?.offer_brand_color ?? '#6366f1')

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="offer_brand_color" value={brandColor} />

      {/* Serie ofertă */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Serie și numerotare ofertă</h3>
          <p className="text-xs text-slate-400">Prefixul apare înaintea numărului de serie (ex: OFR2026-001)</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Prefix serie</label>
          <input
            name="offer_series_prefix"
            type="text"
            defaultValue={profile?.offer_series_prefix ?? 'OFR'}
            maxLength={10}
            placeholder="OFR"
            className="w-40 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Texte implicite */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Texte implicite</h3>
          <p className="text-xs text-slate-400">Acestea vor fi pre-completate la crearea fiecărei oferte noi.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Text introductiv implicit</label>
          <textarea
            name="offer_default_intro"
            rows={4}
            defaultValue={profile?.offer_default_intro ?? ''}
            placeholder="ex: Vă mulțumim pentru interesul acordat. Conform discuțiilor, vă prezentăm propunerea noastră..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Termeni & condiții impliciți</label>
          <textarea
            name="offer_default_terms"
            rows={4}
            defaultValue={profile?.offer_default_terms ?? ''}
            placeholder="ex: Prețurile nu includ TVA. Avans 50% la semnare. Durata estimată..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notă internă standard</label>
          <textarea
            name="offer_default_notes"
            rows={3}
            defaultValue={profile?.offer_default_notes ?? ''}
            placeholder="Notă internă implicită (vizibilă doar pentru tine)..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>
      </div>

      {/* Valabilitate */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Valabilitate implicită</h3>
          <p className="text-xs text-slate-400">Numărul de zile de valabilitate aplicat automat ofertelor noi.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            name="offer_default_validity"
            type="number"
            min="1"
            max="365"
            defaultValue={profile?.offer_default_validity ?? 30}
            className="w-28 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <span className="text-sm text-slate-500">zile</span>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Branding oferte</h3>
          <p className="text-xs text-slate-400">Culorile și logo-ul apar pe ofertele publice trimise clienților.</p>
        </div>

        {/* Logo */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Logo</p>
          {profile?.logo_url ? (
            <div className="flex items-center gap-3">
              <img src={profile.logo_url} alt="Logo" className="h-12 w-auto max-w-32 object-contain rounded-lg border border-slate-200 p-1" />
              <p className="text-xs text-slate-400">
                Logo-ul se gestionează din{' '}
                <a href="/settings" className="text-indigo-600 hover:underline font-medium">Setări profil</a>.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400">
                Adaugă logo-ul din{' '}
                <a href="/settings" className="text-indigo-600 hover:underline font-medium">Setări profil</a>.
              </p>
            </div>
          )}
        </div>

        {/* Culoare brand */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Culoare brand principală</p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {BRAND_COLORS.map(c => (
              <button key={c.value} type="button" onClick={() => setBrandColor(c.value)} title={c.label}
                className={`w-8 h-8 rounded-full transition-all ${brandColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c.value }} />
            ))}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs text-slate-400">Custom</span>
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-200" />
            </div>
          </div>
          <div className="rounded-lg py-2 px-4 text-sm font-semibold text-white inline-block"
            style={{ backgroundColor: brandColor }}>
            {brandColor} — preview
          </div>
        </div>
      </div>

      {/* Save */}
      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {state.message}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition">
          {pending ? 'Se salvează...' : 'Salvează setările'}
        </button>
      </div>
    </form>
  )
}
