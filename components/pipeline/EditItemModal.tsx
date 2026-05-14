'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updatePipelineItemAction, deletePipelineItemAction } from '@/app/actions/pipeline'
import type { PipelineState } from '@/app/actions/pipeline'
import type { PipelineItem, PipelineStage } from '@/app/pipeline/page'
import type { Client } from '@/types/database'

interface EditItemModalProps {
  item: PipelineItem
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  onClose: () => void
}

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contactat' },
  { id: 'proposal', label: 'Propunere' },
  { id: 'negotiation', label: 'Negociere' },
  { id: 'won', label: 'Câștigat' },
  { id: 'lost', label: 'Pierdut' },
]

export default function EditItemModal({ item, clients, onClose }: EditItemModalProps) {
  const [state, formAction, pending] = useActionState<PipelineState, FormData>(
    updatePipelineItemAction,
    undefined
  )
  const [confirming, setConfirming] = useState(false)
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
          <h2 className="text-lg font-semibold text-slate-900">Editează oportunitate</h2>
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
          <input type="hidden" name="id" value={item.id} />

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Titlu <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-title"
              name="title"
              type="text"
              required
              defaultValue={item.title}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Stage */}
          <div>
            <label htmlFor="edit-stage" className="block text-sm font-medium text-slate-700 mb-1.5">
              Etapă
            </label>
            <select
              id="edit-stage"
              name="stage"
              defaultValue={item.stage}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label htmlFor="edit-client" className="block text-sm font-medium text-slate-700 mb-1.5">
              Client
            </label>
            <select
              id="edit-client"
              name="client_id"
              defaultValue={item.client_id ?? ''}
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
              <label htmlFor="edit-value" className="block text-sm font-medium text-slate-700 mb-1.5">
                Valoare estimată
              </label>
              <input
                id="edit-value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={item.value ?? ''}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="edit-currency" className="block text-sm font-medium text-slate-700 mb-1.5">
                Monedă
              </label>
              <select
                id="edit-currency"
                name="currency"
                defaultValue={item.currency}
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
              <label htmlFor="edit-prob" className="block text-sm font-medium text-slate-700 mb-1.5">
                Probabilitate (%)
              </label>
              <input
                id="edit-prob"
                name="probability"
                type="number"
                min="0"
                max="100"
                defaultValue={item.probability ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="edit-close" className="block text-sm font-medium text-slate-700 mb-1.5">
                Data estimată
              </label>
              <input
                id="edit-close"
                name="expected_close"
                type="date"
                defaultValue={item.expected_close ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Note
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              rows={2}
              defaultValue={item.notes ?? ''}
              placeholder="Detalii relevante..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {/* Delete side */}
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Confirmi ștergerea?</span>
                <form action={deletePipelineItemAction} className="inline">
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                    onClick={onClose}
                  >
                    Da, șterge
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Nu
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Șterge
              </button>
            )}

            <div className="flex items-center gap-3">
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
                {pending ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
