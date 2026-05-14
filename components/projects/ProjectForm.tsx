'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Clock, DollarSign } from 'lucide-react'
import type { Project, Client } from '@/types/database'
import type { ProjectState } from '@/app/actions/projects'
import TagInput from './TagInput'

interface ProjectFormProps {
  action: (state: ProjectState, formData: FormData) => Promise<ProjectState>
  project?: Project
  clients: Client[]
  defaultClientId?: string
  cancelHref: string
}

const statusOptions = [
  { value: 'active',    label: 'Activ' },
  { value: 'draft',     label: 'Draft' },
  { value: 'paused',    label: 'Pauză' },
  { value: 'completed', label: 'Finalizat' },
  { value: 'cancelled', label: 'Anulat' },
]

const currencyOptions = ['RON', 'EUR', 'USD', 'GBP']

function toInputDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400'
const labelCls = 'block text-sm font-bold text-gray-700 mb-3'

export default function ProjectForm({ action, project, clients, defaultClientId, cancelHref }: ProjectFormProps) {
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, undefined)
  const isEdit = !!project

  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>(
    project?.budget_type ?? 'fixed'
  )

  return (
    <form action={formAction}>
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="budget_type" value={budgetType} />

      {state?.error && (
        <div className="mb-6 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Card 1: Informații Proiect */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5">
          <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Informații Proiect</h3>
          <div className="space-y-6">

            {/* Nume */}
            <div>
              <label htmlFor="name" className={labelCls}>
                Titlu proiect <span className="text-red-500 font-normal">*</span>
              </label>
              <input
                id="name" name="name" type="text" required
                defaultValue={project?.name}
                placeholder="ex: Website corporativ Acme"
                className={inputCls}
              />
            </div>

            {/* Client */}
            <div>
              <label htmlFor="client_id" className={labelCls}>Client</label>
              <select
                id="client_id" name="client_id"
                defaultValue={project?.client_id ?? defaultClientId ?? ''}
                className={inputCls}
              >
                <option value="">— Fără client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` (${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className={labelCls}>Status</label>
              <select
                id="status" name="status"
                defaultValue={project?.status ?? 'active'}
                className={inputCls}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Etichete */}
            <div>
              <label className={labelCls}>
                Etichete <span className="text-gray-400 font-normal">(opțional)</span>
              </label>
              <TagInput
                defaultTags={project?.tags ?? []}
                name="tags"
                placeholder="ex: web, design, urgent..."
              />
            </div>

          </div>
        </div>

        {/* Card 2: Timeline & Buget */}
        <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5">
          <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Timeline & Buget</h3>
          <div className="space-y-6">

            {/* Data start */}
            <div>
              <label htmlFor="start_date" className={labelCls}>Data start</label>
              <input
                id="start_date" name="start_date" type="date"
                defaultValue={toInputDate(project?.start_date)}
                className={inputCls}
              />
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className={labelCls}>Deadline final</label>
              <input
                id="deadline" name="deadline" type="date"
                defaultValue={toInputDate(project?.deadline)}
                className={inputCls}
              />
            </div>

            {/* Tip buget */}
            <div>
              <label className={labelCls}>Tip buget</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBudgetType('fixed')}
                  className={`flex items-center gap-3 p-4 rounded-[14px] border-2 transition-all text-left ${
                    budgetType === 'fixed'
                      ? 'border-[#acff55] bg-[#acff55]/10'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    budgetType === 'fixed' ? 'bg-[#acff55]' : 'bg-gray-200'
                  }`}>
                    <DollarSign size={16} className={budgetType === 'fixed' ? 'text-black' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Preț fix</p>
                    <p className="text-xs text-gray-500">Buget total stabilit</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBudgetType('hourly')}
                  className={`flex items-center gap-3 p-4 rounded-[14px] border-2 transition-all text-left ${
                    budgetType === 'hourly'
                      ? 'border-[#acff55] bg-[#acff55]/10'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    budgetType === 'hourly' ? 'bg-[#acff55]' : 'bg-gray-200'
                  }`}>
                    <Clock size={16} className={budgetType === 'hourly' ? 'text-black' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Pe oră</p>
                    <p className="text-xs text-gray-500">Legat de pontaj</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Câmpuri condiționale */}
            {budgetType === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget" className={labelCls}>Buget total</label>
                  <input
                    id="budget" name="budget" type="number" min="0" step="0.01"
                    defaultValue={project?.budget ?? ''}
                    placeholder="ex: 5000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className={labelCls}>Monedă</label>
                  <select
                    id="currency" name="currency"
                    defaultValue={project?.currency ?? 'RON'}
                    className={inputCls}
                  >
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {budgetType === 'hourly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hourly_rate" className={labelCls}>Tarif orar</label>
                  <input
                    id="hourly_rate" name="hourly_rate" type="number" min="0" step="0.01"
                    defaultValue={project?.hourly_rate ?? ''}
                    placeholder="ex: 75"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className={labelCls}>Monedă</label>
                  <select
                    id="currency" name="currency"
                    defaultValue={project?.currency ?? 'RON'}
                    className={inputCls}
                  >
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Card 3: Descriere — full width */}
      <div className="bg-white rounded-[24px] p-8 shadow-lg shadow-black/5 mb-8">
        <h3 className="text-xs font-bold text-gray-900 mb-6 uppercase tracking-wide">Descriere Proiect</h3>
        <textarea
          id="description" name="description"
          rows={6}
          defaultValue={project?.description ?? ''}
          placeholder="Detalii despre proiect, obiective, cerințe, specificații tehnice..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-4">
        <Link href={cancelHref} className="px-6 py-3 font-semibold text-gray-600 hover:text-gray-900 transition-all">
          Anulează
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20 hover:shadow-xl hover:shadow-[#acff55]/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Creează proiect'}
        </button>
      </div>
    </form>
  )
}
