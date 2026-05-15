'use client'

import { useActionState, useState } from 'react'
import { addExpenseAction, deleteExpenseAction } from '@/app/actions/expenses'
import type { ExpenseState } from '@/app/actions/expenses'

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  currency: string
  payment_method: string | null
  vendor: string | null
  notes: string | null
  user_id: string
}

interface ExpensesCardProps {
  projectId: string
  expenses: Expense[]
  currency: string
  isOwner: boolean
  canEdit: boolean
}

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  labor:     { label: 'Manoperă / Echipă',      bg: 'bg-violet-100', text: 'text-violet-700' },
  materials: { label: 'Materiale',               bg: 'bg-amber-100',  text: 'text-amber-700' },
  software:  { label: 'Software / Licențe',      bg: 'bg-blue-100',   text: 'text-blue-700' },
  travel:    { label: 'Transport / Deplasare',   bg: 'bg-emerald-100',text: 'text-emerald-700' },
  marketing: { label: 'Marketing',               bg: 'bg-pink-100',   text: 'text-pink-700' },
  equipment: { label: 'Echipament',              bg: 'bg-orange-100', text: 'text-orange-700' },
  other:     { label: 'Altele',                  bg: 'bg-gray-100',   text: 'text-gray-600' },
}

const paymentLabels: Record<string, string> = {
  card: 'Card',
  cash: 'Numerar',
  transfer: 'Transfer bancar',
  other: 'Alt mod',
}

function DeleteExpenseButton({ expenseId, projectId }: { expenseId: string; projectId: string }) {
  const [confirm, setConfirm] = useState(false)

  if (confirm) {
    return (
      <form action={deleteExpenseAction} className="flex items-center gap-1">
        <input type="hidden" name="expense_id" value={expenseId} />
        <input type="hidden" name="project_id" value={projectId} />
        <span className="text-xs text-gray-400">Sigur?</span>
        <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition">Da</button>
        <button type="button" onClick={() => setConfirm(false)} className="text-xs text-gray-400 px-1.5 py-0.5 rounded hover:bg-gray-100 transition">Nu</button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
      title="Șterge cheltuiala"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}

function AddExpenseModal({
  projectId,
  currency,
  onClose,
}: {
  projectId: string
  currency: string
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState<ExpenseState | undefined, FormData>(addExpenseAction, undefined)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">Adaugă cheltuială</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="project_id" value={projectId} />

          {state?.error && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-[12px] bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Cheltuială salvată!
            </div>
          )}

          {/* Data + Categorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
              <input
                type="date"
                name="date"
                defaultValue={today}
                className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
              <select
                name="category"
                defaultValue="other"
                className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
              >
                <option value="labor">Manoperă / Echipă</option>
                <option value="materials">Materiale</option>
                <option value="software">Software / Licențe</option>
                <option value="travel">Transport / Deplasare</option>
                <option value="marketing">Marketing</option>
                <option value="equipment">Echipament</option>
                <option value="other">Altele</option>
              </select>
            </div>
          </div>

          {/* Descriere */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descriere *</label>
            <input
              type="text"
              name="description"
              required
              placeholder="ex: Licență Adobe, materiale construcție..."
              className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
            />
          </div>

          {/* Sumă + Metodă plată */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sumă * ({currency})</label>
              <input
                type="number"
                name="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Metodă plată</label>
              <select
                name="payment_method"
                defaultValue="card"
                className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
              >
                <option value="card">Card</option>
                <option value="cash">Numerar</option>
                <option value="transfer">Transfer bancar</option>
                <option value="other">Alt mod</option>
              </select>
            </div>
          </div>

          {/* Furnizor */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Furnizor (opțional)</label>
            <input
              type="text"
              name="vendor"
              placeholder="Numele furnizorului"
              className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (opțional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Detalii suplimentare..."
              className="w-full px-4 py-3 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition text-sm"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 px-4 py-3 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition text-sm disabled:opacity-50"
            >
              {pending ? 'Se salvează…' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ExpensesCard({ projectId, expenses, currency, isOwner, canEdit }: ExpensesCardProps) {
  const [showModal, setShowModal] = useState(false)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const recentExpenses = expenses.slice(0, 5)
  const hasMore = expenses.length > 5

  return (
    <>
      <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Cheltuieli</h3>
          {expenses.length > 0 && (
            <p className="text-sm font-bold text-gray-900">
              {totalExpenses.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-medium ml-1 text-gray-500">{currency}</span>
            </p>
          )}
        </div>

        {/* Lista cheltuieli */}
        {expenses.length === 0 ? (
          <p className="text-xs text-gray-400 mb-3">Nicio cheltuială înregistrată.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {recentExpenses.map(expense => {
              const cat = categoryConfig[expense.category] ?? categoryConfig.other
              return (
                <div key={expense.id} className="flex items-center gap-2 p-2 rounded-[10px] hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate">{expense.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(expense.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                      {expense.vendor && ` · ${expense.vendor}`}
                      {expense.payment_method && ` · ${paymentLabels[expense.payment_method] ?? expense.payment_method}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-xs font-bold text-gray-900">
                      {expense.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {isOwner && (
                      <DeleteExpenseButton expenseId={expense.id} projectId={projectId} />
                    )}
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <p className="text-xs text-gray-400 text-center pt-1">
                + {expenses.length - 5} mai multe
              </p>
            )}
          </div>
        )}

        {/* Buton adăugare */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full py-2 text-xs font-semibold text-gray-600 border border-dashed border-gray-200 rounded-[12px] hover:border-[#acff55] hover:text-gray-800 transition"
          >
            + Adaugă cheltuială
          </button>
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          projectId={projectId}
          currency={currency}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
