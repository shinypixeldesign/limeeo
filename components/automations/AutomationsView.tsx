'use client'

import { useActionState, useState, useTransition } from 'react'
import {
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  updateAutomationRule,
} from '@/app/actions/automations'
import type { AutomationRule } from '@/types/database'

const TRIGGER_LABELS: Record<string, string> = {
  offer_not_viewed: 'Ofertă netrimisă/nevăzută X zile',
  offer_viewed_no_reply: 'Ofertă văzută fără răspuns X zile',
  invoice_overdue: 'Factură restantă',
  invoice_due_soon: 'Factură scadentă în X zile',
  project_deadline: 'Deadline proiect în X zile',
}

const TRIGGER_HAS_DAYS: Record<string, boolean> = {
  offer_not_viewed: true,
  offer_viewed_no_reply: true,
  invoice_overdue: false,
  invoice_due_soon: true,
  project_deadline: true,
}

interface Props {
  rules: AutomationRule[]
}

function RuleCard({ rule }: { rule: AutomationRule }) {
  const [, startTransition] = useTransition()
  const [deleteState, deleteAction] = useActionState(deleteAutomationRule, undefined)
  const [editOpen, setEditOpen] = useState(false)
  const [editState, editAction] = useActionState(updateAutomationRule, undefined)

  function handleToggle() {
    startTransition(async () => {
      await toggleAutomationRule(rule.id, !rule.is_active)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900 truncate">{rule.name}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                rule.is_active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {rule.is_active ? 'Activ' : 'Inactiv'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type}
            {TRIGGER_HAS_DAYS[rule.trigger_type] && (
              <span className="font-medium text-slate-700"> — {rule.trigger_days} zile</span>
            )}
          </p>
          {rule.email_subject && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              Subiect: {rule.email_subject}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle switch */}
          <button
            type="button"
            onClick={handleToggle}
            title={rule.is_active ? 'Dezactivează' : 'Activează'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              rule.is_active ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                rule.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={() => setEditOpen(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Editează"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete button */}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={rule.id} />
            <button
              type="submit"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Șterge"
              onClick={e => {
                if (!confirm('Ești sigur că vrei să ștergi această regulă?')) e.preventDefault()
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {deleteState?.error && (
        <p className="mt-2 text-xs text-red-600">{deleteState.error}</p>
      )}

      {/* Edit form */}
      {editOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <form action={editAction} className="space-y-3">
            <input type="hidden" name="id" value={rule.id} />
            <RuleFormFields
              defaultName={rule.name}
              defaultTrigger={rule.trigger_type}
              defaultDays={rule.trigger_days}
              defaultSubject={rule.email_subject ?? ''}
              defaultBody={rule.email_body ?? ''}
            />
            {editState?.error && (
              <p className="text-xs text-red-600">{editState.error}</p>
            )}
            {editState?.message && (
              <p className="text-xs text-emerald-600">{editState.message}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Salvează
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function RuleFormFields({
  defaultName = '',
  defaultTrigger = 'offer_not_viewed',
  defaultDays = 3,
  defaultSubject = '',
  defaultBody = '',
}: {
  defaultName?: string
  defaultTrigger?: string
  defaultDays?: number
  defaultSubject?: string
  defaultBody?: string
}) {
  const [triggerType, setTriggerType] = useState(defaultTrigger)
  const showDays = TRIGGER_HAS_DAYS[triggerType] ?? true

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nume regulă</label>
        <input
          name="name"
          type="text"
          defaultValue={defaultName}
          required
          placeholder="ex: Reminder ofertă nevăzută"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
          <select
            name="trigger_type"
            value={triggerType}
            onChange={e => setTriggerType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {showDays && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Număr zile</label>
            <input
              name="trigger_days"
              type="number"
              min={1}
              max={365}
              defaultValue={defaultDays}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
        )}
        {!showDays && (
          <input type="hidden" name="trigger_days" value="0" />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Subiect email <span className="text-slate-400 font-normal">(opțional — se folosește default dacă e gol)</span>
        </label>
        <input
          name="email_subject"
          type="text"
          defaultValue={defaultSubject}
          placeholder="ex: Urmărire ofertă {{document_number}}"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Corp email <span className="text-slate-400 font-normal">(opțional)</span>
        </label>
        <textarea
          name="email_body"
          rows={4}
          defaultValue={defaultBody}
          placeholder="Dragă {{client_name}},&#10;&#10;Vă reamintim oferta {{document_number}}..."
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          Variabile disponibile: <code className="bg-slate-100 px-1 rounded">{'{{client_name}}'}</code>{' '}
          <code className="bg-slate-100 px-1 rounded">{'{{document_number}}'}</code>{' '}
          <code className="bg-slate-100 px-1 rounded">{'{{days}}'}</code>
        </p>
      </div>
    </>
  )
}

export default function AutomationsView({ rules }: Props) {
  const [createState, createAction] = useActionState(createAutomationRule, undefined)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-700">
          Regulile active sunt verificate zilnic la ora 08:00. Emailurile se trimit o singură dată per document/regulă.
          Necesită configurarea <code className="bg-indigo-100 px-1 rounded">RESEND_API_KEY</code> și <code className="bg-indigo-100 px-1 rounded">CRON_SECRET</code> în <code className="bg-indigo-100 px-1 rounded">.env.local</code>.
        </p>
      </div>

      {/* Lista reguli */}
      {rules.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Nicio regulă de automatizare</h3>
          <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
            Creează prima regulă pentru a trimite emailuri automat clienților tăi.
          </p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Adaugă regulă
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rules.map(rule => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>

          {!formOpen && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adaugă regulă nouă
            </button>
          )}
        </>
      )}

      {/* Formular adăugare */}
      {formOpen && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Regulă nouă de automatizare</h3>
          <form action={createAction} className="space-y-4">
            <RuleFormFields />
            {createState?.error && (
              <p className="text-sm text-red-600">{createState.error}</p>
            )}
            {createState?.message && (
              <p className="text-sm text-emerald-600">{createState.message}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Creează regula
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
