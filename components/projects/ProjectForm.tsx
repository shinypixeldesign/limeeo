'use client'

import { useActionState } from 'react'
import Link from 'next/link'
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
  { value: 'active', label: 'Activ' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Pauză' },
  { value: 'completed', label: 'Finalizat' },
  { value: 'cancelled', label: 'Anulat' },
]

const currencyOptions = ['RON', 'EUR', 'USD', 'GBP']

function toInputDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

export default function ProjectForm({ action, project, clients, defaultClientId, cancelHref }: ProjectFormProps) {
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, undefined)
  const isEdit = !!project

  return (
    <form action={formAction} className="space-y-6">
      {project && <input type="hidden" name="id" value={project.id} />}

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Nume proiect */}
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nume proiect <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={project?.name}
            placeholder="ex: Website corporativ Acme"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Client */}
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-slate-700 mb-1.5">
            Client
          </label>
          <select
            id="client_id"
            name="client_id"
            defaultValue={project?.client_id ?? defaultClientId ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            <option value="">— Fără client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project?.status ?? 'active'}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-slate-700 mb-1.5">
            Buget
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="0.01"
            defaultValue={project?.budget ?? ''}
            placeholder="ex: 5000"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Monedă */}
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1.5">
            Monedă
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={project?.currency ?? 'RON'}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Data start */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-slate-700 mb-1.5">
            Data start
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={toInputDate(project?.start_date)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-1.5">
            Deadline
          </label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={toInputDate(project?.deadline)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Descriere */}
        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
            Descriere
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={project?.description ?? ''}
            placeholder="Detalii despre proiect, obiective, cerințe..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
          />
        </div>

        {/* Etichete */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Etichete <span className="text-slate-400 font-normal">(opțional)</span>
          </label>
          <TagInput
            defaultTags={project?.tags ?? []}
            name="tags"
            placeholder="ex: web, design, urgent..."
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
          {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Creează proiect'}
        </button>
      </div>
    </form>
  )
}
