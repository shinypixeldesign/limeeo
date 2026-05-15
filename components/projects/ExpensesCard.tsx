'use client'

import { useActionState, useState } from 'react'
import { DollarSign, TrendingDown, TrendingUp, Clock } from 'lucide-react'
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
  /* budget / financial */
  budget: number | null
  budgetType: 'fixed' | 'hourly'
  hourlyRate: number | null
  trackedCost: number
  totalHours: number        // ore pontate (float)
}

const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
  labor:     { label: 'Manoperă',    bg: 'bg-violet-100', text: 'text-violet-700' },
  materials: { label: 'Materiale',   bg: 'bg-amber-100',  text: 'text-amber-700' },
  software:  { label: 'Software',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  travel:    { label: 'Transport',   bg: 'bg-emerald-100',text: 'text-emerald-700' },
  marketing: { label: 'Marketing',   bg: 'bg-pink-100',   text: 'text-pink-700' },
  equipment: { label: 'Echipament',  bg: 'bg-orange-100', text: 'text-orange-700' },
  other:     { label: 'Altele',      bg: 'bg-gray-100',   text: 'text-gray-600' },
}

const paymentLabels: Record<string, string> = {
  card: 'Card', cash: 'Numerar', transfer: 'Transfer', other: 'Alt mod',
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('ro-RO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/* ── Delete button ── */
function DeleteExpenseButton({ expenseId, projectId }: { expenseId: string; projectId: string }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) {
    return (
      <form action={deleteExpenseAction} className="flex items-center gap-1">
        <input type="hidden" name="expense_id" value={expenseId} />
        <input type="hidden" name="project_id" value={projectId} />
        <span className="text-[10px] text-gray-400">Sigur?</span>
        <button type="submit" className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-1 py-0.5 rounded">Da</button>
        <button type="button" onClick={() => setConfirm(false)} className="text-[10px] text-gray-400 px-1 py-0.5 rounded">Nu</button>
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

/* ── Add expense modal ── */
function AddExpenseModal({ projectId, currency, onClose }: { projectId: string; currency: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ExpenseState | undefined, FormData>(addExpenseAction, undefined)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#0e0f12]">Adaugă cheltuială</h3>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="project_id" value={projectId} />

          {state?.error && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{state.error}</div>
          )}
          {state?.success && (
            <div className="rounded-[12px] bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Cheltuială salvată!
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
              <input type="date" name="date" defaultValue={today}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categorie</label>
              <select name="category" defaultValue="other"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm">
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descriere *</label>
            <input type="text" name="description" required placeholder="ex: Licență Adobe, materiale..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sumă * ({currency})</label>
              <input type="number" name="amount" required min="0.01" step="0.01" placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Metodă plată</label>
              <select name="payment_method" defaultValue="card"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm">
                <option value="card">Card</option>
                <option value="cash">Numerar</option>
                <option value="transfer">Transfer bancar</option>
                <option value="other">Alt mod</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Furnizor (opțional)</label>
            <input type="text" name="vendor" placeholder="Numele furnizorului"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-[12px] bg-gray-50 focus:bg-white focus:border-[#acff55] focus:outline-none transition-all text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition text-sm">
              Anulează
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 px-4 py-2.5 bg-[#acff55] hover:bg-[#93ee35] text-black font-bold rounded-full transition text-sm disabled:opacity-50">
              {pending ? 'Se salvează…' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FINANCIAL HEALTH CARD — main export
══════════════════════════════════════════════ */
export default function ExpensesCard({
  projectId, expenses, currency, isOwner, canEdit,
  budget, budgetType, hourlyRate, trackedCost, totalHours,
}: ExpensesCardProps) {
  const [showModal, setShowModal] = useState(false)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  /* Reference value: what the project "earns" */
  const referenceValue = budgetType === 'hourly' ? trackedCost : (budget ?? 0)
  const net = referenceValue - totalExpenses
  const overBudget = referenceValue > 0 && net < 0

  const totalHoursInt  = Math.floor(totalHours)
  const totalMinutesRem = Math.round((totalHours % 1) * 60)

  return (
    <>
      <div className="bg-white rounded-[20px] p-5 shadow-lg shadow-black/5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-[#0e0f12] uppercase tracking-widest">
            Financial Health
          </h3>
        </div>

        {/* ── Budget / Tarif orar ── */}
        {budgetType === 'fixed' && budget !== null && budget > 0 && (
          <div className="p-4 bg-[#f3ffe1] rounded-[14px] mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={13} className="text-[#5aa70d]" />
              <p className="text-xs font-semibold text-[#5aa70d]">Valoare proiect</p>
            </div>
            <p className="text-2xl font-bold text-[#2e342f]">
              {fmt(budget, 0)}
              <span className="text-sm font-medium ml-1.5 text-[#6f7a72]">{currency}</span>
            </p>
          </div>
        )}

        {budgetType === 'hourly' && (
          <>
            <div className="p-4 bg-[#f3ffe1] rounded-[14px] mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={13} className="text-[#5aa70d]" />
                <p className="text-xs font-semibold text-[#5aa70d]">Tarif orar</p>
              </div>
              <p className="text-2xl font-bold text-[#2e342f]">
                {fmt(hourlyRate ?? 0, 0)}
                <span className="text-sm font-medium ml-1.5 text-[#6f7a72]">{currency}/h</span>
              </p>
            </div>
            <div className="p-4 bg-[#e8efff] rounded-[14px] mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={13} className="text-[#6c8cf5]" />
                <p className="text-xs font-semibold text-[#6c8cf5]">Cost acumulat (pontaj)</p>
              </div>
              <p className="text-2xl font-bold text-[#2e342f]">
                {fmt(trackedCost)}
                <span className="text-sm font-medium ml-1.5 text-[#6f7a72]">{currency}</span>
              </p>
              <p className="text-[11px] text-[#9ba6a0] mt-0.5">
                {totalHoursInt}h {totalMinutesRem}m pontate
              </p>
            </div>
          </>
        )}

        {/* ── Cheltuieli curente ── */}
        <div className="p-4 bg-[#fff4f0] rounded-[14px] mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={13} className="text-[#e05a2b]" />
            <p className="text-xs font-semibold text-[#e05a2b]">Cheltuieli curente</p>
          </div>
          <p className="text-2xl font-bold text-[#2e342f]">
            {totalExpenses > 0 ? fmt(totalExpenses) : '—'}
            {totalExpenses > 0 && (
              <span className="text-sm font-medium ml-1.5 text-[#6f7a72]">{currency}</span>
            )}
          </p>
          {totalExpenses === 0 && (
            <p className="text-[11px] text-[#9ba6a0] mt-0.5">Nicio cheltuială înregistrată</p>
          )}
        </div>

        {/* ── Net ── (doar daca avem valoare de referinta) */}
        {referenceValue > 0 && totalExpenses > 0 && (
          <div className={`p-3 rounded-[12px] mb-4 flex items-center justify-between ${overBudget ? 'bg-red-50' : 'bg-[#e3f6e9]'}`}>
            <div className="flex items-center gap-1.5">
              {overBudget
                ? <TrendingDown size={13} className="text-red-600" />
                : <TrendingUp   size={13} className="text-[#3fb96b]" />}
              <p className={`text-xs font-semibold ${overBudget ? 'text-red-600' : 'text-[#3fb96b]'}`}>
                {overBudget ? 'Depășit buget' : 'Rămas'}
              </p>
            </div>
            <p className={`text-sm font-bold ${overBudget ? 'text-red-700' : 'text-[#2e342f]'}`}>
              {overBudget ? '-' : ''}{fmt(Math.abs(net))}
              <span className="text-[11px] font-medium ml-1 opacity-70">{currency}</span>
            </p>
          </div>
        )}

        {/* ── Lista cheltuieli ── */}
        {expenses.length > 0 && (
          <div className="space-y-1 mb-4">
            {expenses.slice(0, 5).map(expense => {
              const cat = categoryConfig[expense.category] ?? categoryConfig.other
              return (
                <div key={expense.id} className="flex items-start gap-2 px-2 py-2 rounded-[10px] hover:bg-[#f5f8f5] transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#0e0f12] truncate">{expense.description}</p>
                    <p className="text-[10px] text-[#9ba6a0]">
                      {new Date(expense.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                      {expense.vendor && ` · ${expense.vendor}`}
                      {expense.payment_method && ` · ${paymentLabels[expense.payment_method] ?? expense.payment_method}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-xs font-bold text-[#2e342f]">{fmt(expense.amount)}</p>
                    {isOwner && <DeleteExpenseButton expenseId={expense.id} projectId={projectId} />}
                  </div>
                </div>
              )
            })}
            {expenses.length > 5 && (
              <p className="text-[11px] text-[#9ba6a0] text-center pt-0.5">
                + {expenses.length - 5} mai multe
              </p>
            )}
          </div>
        )}

        {/* ── Buton Add Expense (mare, lime) ── */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full py-3.5 bg-[#acff55] hover:bg-[#93ee35] text-black font-bold text-sm rounded-full transition-all shadow-md shadow-[#acff55]/30 hover:shadow-lg hover:shadow-[#acff55]/40 hover:-translate-y-0.5"
          >
            + Adaugă cheltuială
          </button>
        )}
      </div>

      {showModal && (
        <AddExpenseModal projectId={projectId} currency={currency} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
