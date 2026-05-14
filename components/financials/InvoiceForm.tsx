'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Invoice, Client, Project } from '@/types/database'
import type { FinancialState } from '@/app/actions/financials'

interface InvoiceFormProps {
  action: (state: FinancialState, formData: FormData) => Promise<FinancialState>
  invoice?: Invoice
  clients: Client[]
  projects: Project[]
  defaultType?: 'invoice' | 'offer'
  cancelHref: string
  prefillItems?: Array<{ description: string; quantity: string; unit_price: string }>
  prefillClientId?: string
  prefillProjectId?: string
  prefillCurrency?: string
  prefillTaxRate?: string
}

interface ItemRow {
  description: string
  um: string
  quantity: string
  unit_price: string
}

const UM_OPTIONS = ['buc', 'ore', 'zile', 'luni', 'km', 'kg', 'l', 'mp', 'ml', 'set', 'abonament', 'proiect']

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Trimisă' },
  { value: 'paid',      label: 'Plătită' },
  { value: 'overdue',   label: 'Restantă' },
  { value: 'cancelled', label: 'Anulată' },
]

function rowTotal(row: ItemRow): number {
  const qty   = parseFloat(row.quantity) || 0
  const price = parseFloat(row.unit_price) || 0
  return Math.round(qty * price * 100) / 100
}

export default function InvoiceForm({
  action, invoice, clients, projects,
  defaultType = 'invoice', cancelHref,
  prefillItems, prefillClientId, prefillProjectId,
  prefillCurrency, prefillTaxRate,
}: InvoiceFormProps) {
  const [state, formAction, pending] = useActionState<FinancialState, FormData>(action, undefined)
  const isEdit = !!invoice

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (invoice?.items?.length) {
      return invoice.items.map(i => ({
        description: i.description,
        um:          i.um ?? 'buc',
        quantity:    String(i.quantity),
        unit_price:  String(i.unit_price),
      }))
    }
    if (prefillItems?.length) {
      return prefillItems.map(i => ({ ...i, um: 'buc' }))
    }
    return [{ description: '', um: 'buc', quantity: '1', unit_price: '' }]
  })

  const [taxRate,      setTaxRate]      = useState(invoice != null ? String(invoice.tax_rate) : (prefillTaxRate ?? '19'))
  const [currency,     setCurrency]     = useState(invoice != null ? invoice.currency : (prefillCurrency ?? 'RON'))
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>(invoice?.discount_type ?? 'none')
  const [discountVal,  setDiscountVal]  = useState(invoice != null ? String(invoice.discount_value ?? 0) : '0')

  const subtotal      = items.reduce((s, r) => s + rowTotal(r), 0)
  const taxRateNum    = parseFloat(taxRate) || 0
  const discountValN  = parseFloat(discountVal) || 0
  const discountAmt   = discountType === 'percent'
    ? Math.round(subtotal * (discountValN / 100) * 100) / 100
    : discountType === 'fixed'
      ? Math.min(discountValN, subtotal)
      : 0
  const taxable   = subtotal - discountAmt
  const taxAmount = Math.round(taxable * (taxRateNum / 100) * 100) / 100
  const total     = Math.round((taxable + taxAmount) * 100) / 100

  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', um: 'buc', quantity: '1', unit_price: '' }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={formAction} className="space-y-6">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <input type="hidden" name="type" value={invoice?.type ?? defaultType} />
      <input type="hidden" name="discount_type"   value={discountType} />
      <input type="hidden" name="discount_value"  value={discountVal} />
      <input type="hidden" name="tax_rate"        value={taxRate} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
          <select
            name="status"
            defaultValue={invoice?.status ?? 'draft'}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Monedă</label>
          <select
            name="currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {['RON', 'EUR', 'USD', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Client + Proiect */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
          <select
            name="client_id"
            defaultValue={invoice?.client_id ?? prefillClientId ?? ''}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">— Fără client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Proiect</label>
          <select
            name="project_id"
            defaultValue={invoice?.project_id ?? prefillProjectId ?? ''}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">— Fără proiect —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Data emiterii</label>
          <input
            name="issue_date"
            type="date"
            defaultValue={invoice?.issue_date ?? today}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Scadență</label>
          <input
            name="due_date"
            type="date"
            defaultValue={invoice?.due_date ?? ''}
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabel linii */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Produse / Servicii</label>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide"
            style={{ gridTemplateColumns: '1fr 70px 70px 110px 90px 32px' }}>
            <div>Descriere</div>
            <div className="text-center">UM</div>
            <div className="text-center">Cant.</div>
            <div className="text-right">Preț/u ({currency})</div>
            <div className="text-right">Total</div>
            <div />
          </div>

          {/* Rânduri */}
          {items.map((row, idx) => (
            <div
              key={idx}
              className="grid border-b border-slate-100 last:border-0 px-4 py-2 items-center gap-2 group hover:bg-slate-50"
              style={{ gridTemplateColumns: '1fr 70px 70px 110px 90px 32px' }}
            >
              <input
                name="item_description"
                type="text"
                value={row.description}
                onChange={e => updateItem(idx, 'description', e.target.value)}
                placeholder="ex: Design logo, Consultanță..."
                className="text-sm text-slate-900 placeholder:text-slate-300 bg-transparent border-0 focus:outline-none focus:ring-0 w-full"
              />
              <select
                name="item_um"
                value={row.um}
                onChange={e => updateItem(idx, 'um', e.target.value)}
                className="text-xs text-slate-600 bg-transparent border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
              >
                {UM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input
                name="item_quantity"
                type="text"
                inputMode="decimal"
                value={row.quantity}
                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                onFocus={e => e.target.select()}
                className="text-sm text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 text-center w-full"
              />
              <input
                name="item_price"
                type="text"
                inputMode="decimal"
                value={row.unit_price}
                onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="0"
                className="text-sm text-slate-900 placeholder:text-slate-300 bg-transparent border-0 focus:outline-none focus:ring-0 text-right w-full"
              />
              <div className="text-sm font-medium text-slate-700 text-right">
                {fmt(rowTotal(row))}
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                tabIndex={-1}
                className="text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Adaugă rând */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adaugă rând
            </button>
          </div>
        </div>
      </div>

      {/* Discount + Totaluri */}
      <div className="flex justify-end">
        <div className="w-80 space-y-2.5 bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">{fmt(subtotal)} {currency}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span className="shrink-0">Discount</span>
            <div className="flex items-center gap-1.5">
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as typeof discountType)}
                className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="none">Fără</option>
                <option value="percent">%</option>
                <option value="fixed">Fix</option>
              </select>
              {discountType !== 'none' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountVal}
                  onChange={e => setDiscountVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-16 text-xs text-right border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
              {discountType !== 'none' && (
                <span className="text-xs text-amber-600 font-medium">−{fmt(discountAmt)}</span>
              )}
            </div>
          </div>

          {/* TVA */}
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>TVA</span>
              <input
                type="text"
                inputMode="decimal"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                onFocus={e => e.target.select()}
                className="w-12 text-xs text-center border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
            <span className="font-medium">{fmt(taxAmount)} {currency}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2.5">
            <span>Total de plată</span>
            <span>{fmt(total)} {currency}</span>
          </div>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Note / Mențiuni</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={invoice?.notes ?? ''}
          placeholder="ex: Plata în 30 de zile de la emitere. Vă mulțumim!"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Butoane */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href={cancelHref} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
          Anulează
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Creează factura'}
        </button>
      </div>
    </form>
  )
}
