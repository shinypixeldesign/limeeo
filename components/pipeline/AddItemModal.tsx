'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPipelineItemAction } from '@/app/actions/pipeline'
import type { PipelineState } from '@/app/actions/pipeline'
import type { PipelineStage } from '@/app/pipeline/page'
import type { Client } from '@/types/database'

interface AddItemModalProps {
  stage: PipelineStage
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  onClose: () => void
}

const stageLabels: Record<PipelineStage, string> = {
  lead: 'Lead',
  contacted: 'Contactat',
  proposal: 'Propunere',
  negotiation: 'Negociere',
  won: 'Câștigat',
  lost: 'Pierdut',
}

export default function AddItemModal({ stage, clients, onClose }: AddItemModalProps) {
  const [state, formAction, pending] = useActionState<PipelineState, FormData>(
    createPipelineItemAction,
    undefined
  )

  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on success
  useEffect(() => {
    if (state?.message) {
      onClose()
    }
  }, [state, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Adaugă oportunitate</h2>
            <p className="text-xs text-slate-500 mt-0.5">Coloană: <span className="font-medium text-indigo-600">{stageLabels[stage]}</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form action={formAction} className="px-6 py-5 space-y-4">
          <input type="hidden" name="stage" value={stage} />

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="add-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Titlu <span className="text-red-500">*</span>
            </label>
            <input
              id="add-title"
              name="title"
              type="text"
              required
              autoFocus
              placeholder="ex: Website pentru Acme SRL"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Client */}
          <div>
            <label htmlFor="add-client" className="block text-sm font-medium text-slate-700 mb-1.5">
              Client
            </label>
            <select
              id="add-client"
              name="client_id"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
            >
              <option value="">— Fără client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Value + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="add-value" className="block text-sm font-medium text-slate-700 mb-1.5">
                Valoare estimată
              </label>
              <input
                id="add-value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="add-currency" className="block text-sm font-medium text-slate-700 mb-1.5">
                Monedă
              </label>
              <select
                id="add-currency"
                name="currency"
                defaultValue="RON"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Probability + Expected close */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-prob" className="block text-sm font-medium text-slate-700 mb-1.5">
                Probabilitate (%)
              </label>
              <input
                id="add-prob"
                name="probability"
                type="number"
                min="0"
                max="100"
                placeholder="50"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="add-close" className="block text-sm font-medium text-slate-700 mb-1.5">
                Data estimată
              </label>
              <input
                id="add-close"
                name="expected_close"
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="add-notes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Note
            </label>
            <textarea
              id="add-notes"
              name="notes"
              rows={2}
              placeholder="Detalii relevante..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {pending ? 'Se adaugă...' : 'Adaugă'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
