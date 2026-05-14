'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Offer, OfferItem, Client, Project, OfferPackage } from '@/types/database'
import type { OfferState } from '@/app/actions/offers'

interface OfferFormProps {
  action: (state: OfferState, formData: FormData) => Promise<OfferState>
  offer?: Offer & { offer_items?: OfferItem[] }
  clients: Client[]
  projects: Project[]
  cancelHref: string
  formId?: string
  packages?: OfferPackage[]
  profileDefaults?: {
    offer_series_prefix?: string | null
    offer_default_intro?: string | null
    offer_default_terms?: string | null
    offer_default_notes?: string | null
    offer_default_validity?: number | null
    offer_brand_color?: string | null
    default_currency?: string | null
  } | null
}

interface ItemRow {
  type: 'fix' | 'hourly' | 'monthly'
  category: string
  title: string
  description: string
  deliverables: string
  timeline: string
  quantity: string
  unit_price: string
}

/* ─── Templates ──────────────────────────────────────────────── */
interface Template {
  id: string
  category: string
  name: string
  description: string
  items: Omit<ItemRow, 'deliverables' | 'timeline'>[]
}

const TEMPLATES: Template[] = [
  {
    id: 'web-landing',
    category: 'Web Design',
    name: 'Landing Page',
    description: 'Pagină de prezentare optimizată pentru conversii',
    items: [
      { type: 'fix', category: 'Web Design', title: 'Design Landing Page', description: 'Wireframe + design vizual, 1 variantă + 2 runde revizii', quantity: '1', unit_price: '1200' },
      { type: 'fix', category: 'Web Design', title: 'Dezvoltare HTML/CSS', description: 'Implementare responsive, cross-browser', quantity: '1', unit_price: '800' },
      { type: 'fix', category: 'Web Design', title: 'Integrare CMS / CTA', description: 'Formular contact, integrare analytics', quantity: '1', unit_price: '400' },
    ],
  },
  {
    id: 'web-prezentare',
    category: 'Web Design',
    name: 'Website Prezentare (5 pagini)',
    description: 'Site de prezentare complet cu 5 pagini',
    items: [
      { type: 'fix', category: 'Web Design', title: 'Design UI complet', description: 'Design 5 pagini: Home, Despre, Servicii, Portfolio, Contact', quantity: '1', unit_price: '2500' },
      { type: 'fix', category: 'Web Design', title: 'Dezvoltare & implementare', description: 'Responsive, CMS WordPress/Next.js, SEO de bază', quantity: '1', unit_price: '2000' },
      { type: 'fix', category: 'Web Design', title: 'Hosting & domeniu (1 an)', description: 'Configurare hosting, SSL, backup automat', quantity: '1', unit_price: '500' },
    ],
  },
  {
    id: 'web-ecommerce',
    category: 'Web Design',
    name: 'Magazin Online',
    description: 'Platformă e-commerce completă',
    items: [
      { type: 'fix', category: 'Web Design', title: 'Design UI/UX magazin', description: 'Home, categorie, produs, coș, checkout', quantity: '1', unit_price: '4000' },
      { type: 'fix', category: 'Web Design', title: 'Dezvoltare WooCommerce', description: 'Configurare, plăți online (Stripe/PayPal), livrare', quantity: '1', unit_price: '3500' },
      { type: 'fix', category: 'Web Design', title: 'Migrare produse', description: 'Import catalog produse, poze, prețuri (până la 500)', quantity: '1', unit_price: '1000' },
    ],
  },
  {
    id: 'branding-logo',
    category: 'Branding',
    name: 'Logo Design',
    description: 'Identitate vizuală de bază',
    items: [
      { type: 'fix', category: 'Branding', title: 'Logo Design', description: '3 concepte + 2 runde revizii, fișiere finale SVG/PNG/PDF', quantity: '1', unit_price: '1500' },
      { type: 'fix', category: 'Branding', title: 'Brand Guidelines basic', description: 'Paletă culori, tipografie, reguli utilizare logo', quantity: '1', unit_price: '500' },
    ],
  },
  {
    id: 'branding-complet',
    category: 'Branding',
    name: 'Brand Identity Complet',
    description: 'Identitate vizuală completă pentru business',
    items: [
      { type: 'fix', category: 'Branding', title: 'Cercetare & strategie brand', description: 'Analiza concurenței, poziționare, personalitate brand', quantity: '1', unit_price: '1000' },
      { type: 'fix', category: 'Branding', title: 'Logo & sistem vizual', description: '3 concepte + revizii, variante color/alb-negru', quantity: '1', unit_price: '2500' },
      { type: 'fix', category: 'Branding', title: 'Brand Guidelines complet', description: 'Manual de brand 20+ pagini', quantity: '1', unit_price: '1500' },
      { type: 'fix', category: 'Branding', title: 'Materiale print', description: 'Business card, antet, plic, semnătură email', quantity: '1', unit_price: '1000' },
    ],
  },
  {
    id: 'social-management',
    category: 'Social Media',
    name: 'Management Social Media',
    description: 'Gestionare completă rețele sociale',
    items: [
      { type: 'fix', category: 'Social Media', title: 'Strategie & audit', description: 'Audit profil existent, strategie conținut 3 luni', quantity: '1', unit_price: '800' },
      { type: 'monthly', category: 'Social Media', title: 'Management lunar', description: '12 postări/lună, stories, engagement cu comunitatea', quantity: '1', unit_price: '1200' },
      { type: 'fix', category: 'Social Media', title: 'Creație vizuală', description: 'Template-uri branded, 12 grafice/lună', quantity: '1', unit_price: '600' },
    ],
  },
  {
    id: 'google-ads',
    category: 'Marketing Digital',
    name: 'Campanii Google Ads',
    description: 'Setup și management campanii PPC',
    items: [
      { type: 'fix',    category: 'Marketing Digital', title: 'Audit & strategie PPC', description: 'Cercetare keywords, structură campanii', quantity: '1', unit_price: '700' },
      { type: 'fix',    category: 'Marketing Digital', title: 'Setup campanii Google Ads', description: 'Creare campanii Search + Display, ad copywriting', quantity: '1', unit_price: '1200' },
      { type: 'hourly', category: 'Marketing Digital', title: 'Management lunar campanii', description: 'Optimizare bids, A/B testing, raportare săptămânală', quantity: '8', unit_price: '150' },
    ],
  },
  {
    id: 'video-promo',
    category: 'Video & Foto',
    name: 'Video Promoțional',
    description: 'Video de prezentare companie/produs',
    items: [
      { type: 'fix', category: 'Video & Foto', title: 'Pre-producție & scenariu', description: 'Concept creativ, storyboard, planificare filmare', quantity: '1', unit_price: '800' },
      { type: 'fix', category: 'Video & Foto', title: 'Filmare (1 zi)', description: 'Echipă video, locație', quantity: '1', unit_price: '1500' },
      { type: 'fix', category: 'Video & Foto', title: 'Post-producție & editare', description: 'Montaj, color grading, muzică, motion graphics', quantity: '1', unit_price: '1200' },
    ],
  },
  {
    id: 'consultanta-ora',
    category: 'Consultanță',
    name: 'Pachet Consultanță',
    description: 'Servicii de consultanță per oră',
    items: [
      { type: 'hourly', category: 'Consultanță', title: 'Consultanță strategică', description: 'Sesiuni de consultanță, analiză și recomandări', quantity: '10', unit_price: '200' },
    ],
  },
  {
    id: 'dev-ora',
    category: 'Programare',
    name: 'Dezvoltare per oră',
    description: 'Servicii de programare la tarif orar',
    items: [
      { type: 'hourly', category: 'Programare', title: 'Programare / Dezvoltare', description: 'Frontend, backend sau full-stack', quantity: '20', unit_price: '120' },
      { type: 'fix',    category: 'Programare', title: 'Setup proiect & arhitectură', description: 'Configurare ambiente, repository, CI/CD', quantity: '1', unit_price: '500' },
    ],
  },
]

const CATEGORIES = Array.from(new Set(TEMPLATES.map(t => t.category)))

const ITEM_CATEGORIES = [
  '', 'Web Design', 'Branding', 'Programare', 'Marketing Digital', 'Social Media',
  'Video & Foto', 'Consultanță', 'Copywriting', 'SEO', 'Print', 'Altele',
]

const BRAND_COLORS = [
  { label: 'Lime',    value: '#acff55' },
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Slate',   value: '#475569' },
]

/* ─── Helpers ─────────────────────────────────────────────────── */
function rowTotal(row: ItemRow): number {
  return Math.round((parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0) * 100) / 100
}

function toItemRows(items: OfferItem[]): ItemRow[] {
  return [...items].sort((a, b) => a.position - b.position).map(i => ({
    type: (i.type === 'rate_card' ? 'fix' : i.type) as ItemRow['type'],
    category: i.category ?? '',
    title: i.title,
    description: i.description ?? '',
    deliverables: i.deliverables ?? '',
    timeline: i.timeline ?? '',
    quantity: String(i.quantity),
    unit_price: String(i.unit_price),
  }))
}

function tmplTotal(items: Template['items']): number {
  return items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
}

/* ─── Template modal ──────────────────────────────────────────── */
function TemplateModal({ onSelect, onClose }: { onSelect: (rows: ItemRow[]) => void; onClose: () => void }) {
  const [cat, setCat] = useState(CATEGORIES[0])
  const [editing, setEditing] = useState<{ tpl: Template; items: Template['items'] } | null>(null)

  function updateItem(i: number, field: keyof Template['items'][0], val: string) {
    setEditing(prev => prev ? { ...prev, items: prev.items.map((r, idx) => idx === i ? { ...r, [field]: val } : r) } : prev)
  }

  const editTotal = editing ? tmplTotal(editing.items) : 0
  const fmt = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">

        {!editing && (<>
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Alege un template</h2>
              <p className="text-sm text-slate-500 mt-0.5">Personalizează înainte de aplicare</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex gap-1.5 px-6 py-3 overflow-x-auto border-b border-slate-100 shrink-0">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  cat === c ? 'bg-[#acff55] text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{c}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {TEMPLATES.filter(t => t.category === cat).map(tpl => (
              <div key={tpl.id} onClick={() => setEditing({ tpl, items: tpl.items.map(i => ({ ...i })) })}
                className="border border-slate-200 rounded-xl p-4 hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 group-hover:text-black transition">{tpl.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tpl.items.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-black bg-[#acff55] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {tmplTotal(tpl.items).toLocaleString('ro-RO')} RON
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
              Anulează
            </button>
          </div>
        </>)}

        {editing && (<>
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <button type="button" onClick={() => setEditing(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-1.5 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Înapoi
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              <p className="text-base font-bold text-slate-900">{editing.tpl.name}</p>
              <p className="text-xs text-slate-500">Personalizează prețurile înainte de aplicare</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {editing.items.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50">
                <input type="text" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)}
                  placeholder="Titlu serviciu"
                  className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#acff55] bg-white" />
                <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="Descriere (opțional)"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#acff55] bg-white text-slate-600" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {(['fix', 'hourly', 'monthly'] as const).map(t => (
                      <button key={t} type="button" onClick={() => updateItem(i, 'type', t)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                          item.type === t ? 'bg-[#acff55] text-black' : 'text-gray-600 hover:text-gray-800'
                        }`}>
                        {t === 'fix' ? 'Fix' : t === 'hourly' ? 'Orar' : 'Lunar'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                    <span className="text-xs text-slate-400">Cant.</span>
                    <input type="text" inputMode="decimal" value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                      onFocus={e => e.target.select()}
                      className="w-10 text-sm text-center focus:outline-none bg-transparent" />
                  </div>
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex-1">
                    <span className="text-xs text-slate-400">Preț</span>
                    <input type="text" inputMode="decimal" value={item.unit_price}
                      onChange={e => updateItem(i, 'unit_price', e.target.value)}
                      onFocus={e => e.target.select()} placeholder="0"
                      className="flex-1 text-sm text-right focus:outline-none bg-transparent" />
                    <span className="text-xs text-slate-400">RON</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 text-right w-20 shrink-0">
                    {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Total: <span className="font-bold text-slate-800">{fmt(editTotal)} RON</span>
            </span>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                Înapoi
              </button>
              <button type="button"
                onClick={() => {
                  onSelect(editing.items.filter(i => i.title.trim()).map(i => ({
                    ...i,
                    deliverables: '',
                    timeline: '',
                  })))
                  onClose()
                }}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#acff55] text-black hover:opacity-90 transition">
                Aplică template
              </button>
            </div>
          </div>
        </>)}
      </div>
    </div>
  )
}

/* ─── Toggle switch ───────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${checked ? 'bg-[#acff55]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  )
}

/* ─── Main component ──────────────────────────────────────────── */
export default function OfferForm({ action, offer, clients, projects, cancelHref, formId, packages = [], profileDefaults }: OfferFormProps) {
  const [state, formAction, pending] = useActionState<OfferState, FormData>(action, undefined)
  const isEdit = !!offer
  const errorRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<ItemRow[]>(
    offer?.offer_items?.length
      ? toItemRows(offer.offer_items)
      : [{ type: 'fix', category: '', title: '', description: '', deliverables: '', timeline: '', quantity: '1', unit_price: '' }]
  )
  const [taxRate, setTaxRate]             = useState(String(offer?.tax_rate ?? 19))
  const [currency, setCurrency]           = useState(offer?.currency ?? profileDefaults?.default_currency ?? 'RON')
  const [discountType, setDiscountType]   = useState<'none' | 'percent' | 'fixed'>(offer?.discount_type ?? 'none')
  const [discountValue, setDiscountValue] = useState(String(offer?.discount_value ?? 0))
  const [brandColor, setBrandColor]       = useState(offer?.brand_color ?? profileDefaults?.offer_brand_color ?? '#acff55')
  const [selectedClientId, setSelectedClientId] = useState(offer?.client_id ?? '')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTemplateGrid, setShowTemplateGrid] = useState(false)
  const [paymentConditions, setPaymentConditions] = useState(offer?.payment_conditions ?? '')
  const [projectStartDate, setProjectStartDate] = useState(offer?.project_start_date ?? '')
  const [revisionsIncluded, setRevisionsIncluded] = useState(offer?.revisions_included != null ? String(offer.revisions_included) : '')
  const [activeTemplCat, setActiveTemplCat] = useState<string>(CATEGORIES[0])
  const [templTab, setTemplTab] = useState<'mine' | 'preset'>(packages.length > 0 ? 'mine' : 'preset')

  // New fields
  const [autoConvertCurrency, setAutoConvertCurrency] = useState(offer?.auto_convert_currency ?? false)
  const [urgencyEnabled, setUrgencyEnabled] = useState(offer?.urgency_discount_enabled ?? false)
  const [urgencyDiscountType, setUrgencyDiscountType] = useState(offer?.urgency_discount_type ?? 'percent')
  const [urgencyDiscountValue, setUrgencyDiscountValue] = useState(String(offer?.urgency_discount_value ?? 10))
  const [urgencyDiscountDays, setUrgencyDiscountDays] = useState(String(offer?.urgency_discount_days ?? 7))

  useEffect(() => {
    if (state?.error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [state?.error])

  /* Totals */
  const subtotal       = items.reduce((s, row) => s + rowTotal(row), 0)
  const discountNum    = parseFloat(discountValue) || 0
  const discountAmount = discountType === 'percent' ? Math.round(subtotal * (discountNum / 100) * 100) / 100
                       : discountType === 'fixed'   ? Math.min(discountNum, subtotal) : 0
  const taxable        = subtotal - discountAmount
  const taxRateNum     = parseFloat(taxRate) || 0
  const taxAmount      = Math.round(taxable * (taxRateNum / 100) * 100) / 100
  const total          = taxable + taxAmount
  const fmt            = (n: number) => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }
  function addItem() {
    setItems(prev => [...prev, { type: 'fix', category: '', title: '', description: '', deliverables: '', timeline: '', quantity: '1', unit_price: '' }])
  }
  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }
  function moveItem(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= items.length) return
    setItems(prev => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]]
      return arr
    })
  }

  const defaultValidUntil = (() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })()

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null

  const inputCls = 'w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#acff55] focus:bg-white transition'
  const labelCls = 'block text-sm font-bold text-gray-700 mb-3'
  const cardCls  = 'bg-white rounded-[24px] p-6 lg:p-8 shadow-lg shadow-black/5'
  const sectionHeaderCls = 'text-sm font-bold text-gray-900 mb-6 uppercase tracking-wide'

  return (
    <>
      {showTemplates && (
        <TemplateModal onSelect={rows => setItems(rows)} onClose={() => setShowTemplates(false)} />
      )}

      <form id={formId ?? 'offer-form'} action={formAction}>
        {offer && <input type="hidden" name="id" value={offer.id} />}
        <input type="hidden" name="tax_rate"       value={taxRate} />
        <input type="hidden" name="discount_type"  value={discountType} />
        <input type="hidden" name="discount_value" value={discountValue} />
        <input type="hidden" name="brand_color"    value={brandColor} />
        <input type="hidden" name="payment_conditions"  value={paymentConditions} />
        <input type="hidden" name="project_start_date"  value={projectStartDate} />
        <input type="hidden" name="revisions_included"  value={revisionsIncluded} />
        <input type="hidden" name="auto_convert_currency" value={String(autoConvertCurrency)} />
        <input type="hidden" name="urgency_discount_enabled" value={String(urgencyEnabled)} />
        <input type="hidden" name="urgency_discount_type" value={urgencyDiscountType} />
        <input type="hidden" name="urgency_discount_value" value={urgencyDiscountValue} />
        <input type="hidden" name="urgency_discount_days" value={urgencyDiscountDays} />

        {state?.error && (
          <div ref={errorRef} className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Nu s-a putut salva oferta</p>
              <p className="text-red-600 mt-0.5">{state.error}</p>
            </div>
          </div>
        )}

        {/* ── 3-column grid layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-28">

          {/* ── Left: col-span-2 ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Card 1 - General Details */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Detalii Generale</h2>
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Titlu ofertă</label>
                  <input name="title" type="text" defaultValue={offer?.title ?? ''}
                    placeholder="ex: Propunere website corporate, Pachet branding complet..."
                    className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Client</label>
                    <select name="client_id" value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className={inputCls + ' bg-gray-50'}>
                      <option value="">— Fără client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Proiect <span className="text-gray-400 font-normal text-xs">(opțional)</span></label>
                    <select name="project_id" defaultValue={offer?.project_id ?? ''}
                      className={inputCls + ' bg-gray-50'}>
                      <option value="">— Fără proiect —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Monedă</label>
                    <select name="currency" value={currency} onChange={e => setCurrency(e.target.value)}
                      className={inputCls + ' bg-gray-50'}>
                      {['RON','EUR','USD','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Valabilă până la</label>
                    <input name="valid_until" type="date"
                      defaultValue={offer?.valid_until ?? defaultValidUntil}
                      className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Services & Pricing */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={sectionHeaderCls + ' mb-0'}>Servicii & Prețuri</h2>
                <button type="button" onClick={() => setShowTemplateGrid(v => !v)}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full border-2 transition ${
                    showTemplateGrid
                      ? 'bg-[#acff55] border-[#acff55] text-black'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Templates
                </button>
              </div>

              {/* Inline template grid */}
              {showTemplateGrid && (
                <div className="border border-gray-200 rounded-[16px] bg-gray-50 p-4 mb-6">
                  <div className="flex items-center gap-1 mb-4 bg-white rounded-xl p-1 w-fit border border-gray-200">
                    {packages.length > 0 && (
                      <button type="button" onClick={() => setTemplTab('mine')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${templTab === 'mine' ? 'bg-[#acff55] text-black' : 'text-gray-500 hover:text-gray-700'}`}>
                        Pachetele mele
                        <span className="ml-1.5 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{packages.length}</span>
                      </button>
                    )}
                    <button type="button" onClick={() => { setTemplTab('preset'); setActiveTemplCat(CATEGORIES[0]) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${templTab === 'preset' ? 'bg-[#acff55] text-black' : 'text-gray-500 hover:text-gray-700'}`}>
                      Template-uri presetate
                    </button>
                  </div>

                  {templTab === 'mine' && (
                    <>
                      {packages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-400 mb-3">Nu ai pachete salvate încă.</p>
                          <Link href="/offers/packages" target="_blank"
                            className="text-xs font-bold text-black bg-[#acff55] px-4 py-2 rounded-full hover:opacity-90 transition">
                            Creează primul pachet →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {packages.map(pkg => {
                            const pkgTotal = pkg.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
                            return (
                              <button key={pkg.id} type="button"
                                onClick={() => {
                                  setItems(pkg.items.map(i => ({
                                    type: (i.type === 'rate_card' ? 'fix' : i.type) as ItemRow['type'],
                                    category: i.category,
                                    title: i.title,
                                    description: i.description,
                                    deliverables: i.deliverables,
                                    timeline: i.timeline,
                                    quantity: i.quantity,
                                    unit_price: i.unit_price,
                                  })))
                                  setShowTemplateGrid(false)
                                }}
                                className="text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition group">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    {pkg.category && (
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 block mb-0.5">{pkg.category}</span>
                                    )}
                                    <p className="text-sm font-bold text-slate-800">{pkg.name}</p>
                                    {pkg.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{pkg.description}</p>}
                                  </div>
                                  <span className="text-xs font-bold text-black bg-[#acff55] px-2 py-1 rounded-lg shrink-0">
                                    {pkgTotal.toLocaleString('ro-RO')} RON
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {pkg.items.slice(0, 3).map((item, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{item.title}</span>
                                  ))}
                                  {pkg.items.length > 3 && <span className="text-[10px] text-slate-400">+{pkg.items.length - 3}</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <Link href="/offers/packages" target="_blank"
                          className="text-xs font-medium text-slate-500 hover:text-black flex items-center gap-1 transition">
                          Gestionează pachete
                        </Link>
                      </div>
                    </>
                  )}

                  {templTab === 'preset' && (
                    <>
                      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3">
                        {CATEGORIES.map(c => (
                          <button key={c} type="button" onClick={() => setActiveTemplCat(c)}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
                              activeTemplCat === c ? 'bg-[#acff55] text-black' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                            }`}>{c}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TEMPLATES.filter(t => t.category === activeTemplCat).map(tpl => (
                          <button key={tpl.id} type="button"
                            onClick={() => {
                              setItems(tpl.items.map(i => ({ ...i, deliverables: '', timeline: '' })))
                              setShowTemplateGrid(false)
                            }}
                            className="text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition group">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">{tpl.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{tpl.description}</p>
                              </div>
                              <span className="text-xs font-bold text-black bg-[#acff55] px-2 py-1 rounded-lg shrink-0">
                                {tmplTotal(tpl.items).toLocaleString('ro-RO')} RON
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tpl.items.slice(0, 3).map((item, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{item.title}</span>
                              ))}
                              {tpl.items.length > 3 && <span className="text-[10px] text-slate-400">+{tpl.items.length - 3}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button type="button" onClick={() => { setShowTemplateGrid(false); setShowTemplates(true) }}
                          className="text-xs font-medium text-gray-500 hover:text-black flex items-center gap-1 transition">
                          Deschide cu personalizare
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Item rows */}
              <div className="space-y-4">
                {items.map((row, index) => (
                  <div key={index} className="border border-gray-200 rounded-[16px] p-4 group">
                    {/* Grid row: col-span-12 */}
                    <div className="grid grid-cols-12 gap-2 mb-3">
                      {/* Service Title: col-span-6 */}
                      <div className="col-span-12 sm:col-span-6">
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Serviciu</label>
                        <input name="item_title" type="text"
                          value={row.title} onChange={e => updateItem(index, 'title', e.target.value)}
                          placeholder="Titlu serviciu..."
                          className="w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#acff55] focus:bg-white transition" />
                      </div>

                      {/* Billing type toggle: col-span-3 */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Tip facturare</label>
                        <div className="flex bg-gray-100 rounded-[12px] p-0.5 h-[38px]">
                          {(['fix', 'hourly', 'monthly'] as const).map(t => (
                            <button key={t} type="button" onClick={() => updateItem(index, 'type', t)}
                              className={`flex-1 text-xs font-bold rounded-[10px] transition ${
                                row.type === t ? 'bg-[#acff55] text-black' : 'text-gray-600 hover:text-gray-800'
                              }`}>
                              {t === 'fix' ? 'Fix' : t === 'hourly' ? 'Orar' : 'Lunar'}
                            </button>
                          ))}
                        </div>
                        <input type="hidden" name="item_type" value={row.type} />
                        <input type="hidden" name="item_category" value={row.category} />
                      </div>

                      {/* Price: col-span-1 */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Preț</label>
                        <input name="item_price" type="text" inputMode="decimal"
                          value={row.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)}
                          onFocus={e => e.target.select()} placeholder="0"
                          className="w-full rounded-[12px] border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-right text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#acff55] focus:bg-white transition" />
                      </div>

                      {/* Qty: col-span-1 */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-600 mb-2 block">{row.type === 'hourly' ? 'Ore' : 'Cant.'}</label>
                        <input name="item_quantity" type="text" inputMode="decimal"
                          value={row.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                          onFocus={e => e.target.select()}
                          className="w-full rounded-[12px] border border-gray-200 bg-gray-50 px-2 py-2 text-sm text-center text-slate-900 focus:outline-none focus:border-[#acff55] focus:bg-white transition" />
                      </div>

                      {/* Total + remove: col-span-1 */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-600 mb-2 block">Total</label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-slate-800 flex-1 text-right">
                            {fmt(rowTotal(row))}
                          </span>
                          <button type="button" onClick={() => removeItem(index)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Description textarea: col-span-12 */}
                    <textarea name="item_description" rows={2}
                      value={row.description} onChange={e => updateItem(index, 'description', e.target.value)}
                      placeholder="Descriere serviciu, ce include..."
                      className="w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none focus:border-[#acff55] focus:bg-white transition resize-none mb-2" />

                    {/* Deliverables (hidden from Figma design but kept for data) */}
                    <textarea name="item_deliverables" rows={2}
                      value={row.deliverables} onChange={e => updateItem(index, 'deliverables', e.target.value)}
                      placeholder="Livrabile: ce primește clientul..."
                      className="w-full rounded-[12px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none focus:border-[#acff55] focus:bg-white transition resize-none mb-2" />

                    {/* Timeline + move controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 border border-gray-200 rounded-[12px] px-3 py-1.5 bg-gray-50 flex-1">
                        <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input name="item_timeline" type="text"
                          value={row.timeline} onChange={e => updateItem(index, 'timeline', e.target.value)}
                          placeholder="Timeline estimativ..."
                          className="flex-1 text-xs focus:outline-none placeholder:text-slate-300 text-slate-600 bg-transparent min-w-0" />
                      </div>
                      <select value={row.category} onChange={e => updateItem(index, 'category', e.target.value)}
                        className="text-xs border border-gray-200 rounded-[12px] px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:border-[#acff55] text-slate-600 max-w-32">
                        {ITEM_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c || '— Categorie —'}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add service button */}
              <button type="button" onClick={addItem}
                className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-[16px] text-sm font-bold text-gray-500 hover:border-[#acff55] hover:text-black hover:bg-[#acff55]/5 transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Adaugă Serviciu
              </button>

              {/* Calculation block */}
              <div className="mt-6 bg-gray-50 rounded-[16px] p-5 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="font-bold">Subtotal</span>
                  <span className="font-medium">{fmt(subtotal)} {currency}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-bold shrink-0">Discount</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as typeof discountType)}
                      className="text-xs border border-gray-200 rounded-[8px] px-2 py-1 bg-white focus:outline-none focus:border-[#acff55] text-gray-600">
                      <option value="none">Fără</option>
                      <option value="percent">Procent (%)</option>
                      <option value="fixed">Sumă fixă</option>
                    </select>
                    {discountType !== 'none' && (
                      <input type="text" inputMode="decimal"
                        value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-16 text-sm text-right border border-gray-200 rounded-[8px] px-2 py-1 focus:outline-none focus:border-[#acff55] bg-white" />
                    )}
                    {discountType === 'percent' && <span className="text-xs text-gray-400">%</span>}
                  </div>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Reducere aplicată</span>
                    <span className="font-bold">-{fmt(discountAmount)} {currency}</span>
                  </div>
                )}

                {/* VAT */}
                <div className="flex justify-between text-sm text-gray-600 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">TVA</span>
                    <input type="text" inputMode="decimal"
                      value={taxRate} onChange={e => setTaxRate(e.target.value)} onFocus={e => e.target.select()}
                      className="w-12 text-sm text-center border border-gray-200 rounded-[8px] px-1 py-0.5 focus:outline-none focus:border-[#acff55] bg-white" />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <span className="font-medium">{fmt(taxAmount)} {currency}</span>
                </div>

                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-gray-200 pt-3">
                  <span>TOTAL</span>
                  <span>{fmt(total)} {currency}</span>
                </div>
              </div>
            </div>

            {/* Card 3 - Proposal Content */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Conținut Propunere</h2>
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Text introductiv</label>
                  <textarea name="intro_text" rows={6}
                    defaultValue={offer?.intro_text ?? profileDefaults?.offer_default_intro ?? ''}
                    placeholder="ex: Vă mulțumim pentru interesul acordat. Conform discuțiilor, vă prezentăm propunerea noastră..."
                    className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className={labelCls}>Termeni & Condiții</label>
                  <textarea name="terms_text" rows={6}
                    defaultValue={offer?.terms_text ?? profileDefaults?.offer_default_terms ?? ''}
                    placeholder="ex: Prețurile nu includ TVA. Avans 50% la semnare. Durata estimată..."
                    className={inputCls + ' resize-none'} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: col-span-1 ── */}
          <div className="xl:col-span-1 space-y-6">

            {/* Card 4 - Presentation & Brand */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Prezentare & Brand</h2>

              {/* Client avatar */}
              <div className="flex justify-center mb-5">
                {selectedClient ? (
                  selectedClient.logo_url ? (
                    <img src={selectedClient.logo_url} alt={selectedClient.name}
                      className="w-20 h-20 rounded-2xl object-contain border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center border border-violet-200 shadow-sm">
                      <span className="text-3xl font-black text-violet-500">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
              {selectedClient && (
                <div className="text-center mb-5">
                  <p className="text-sm font-bold text-slate-800">{selectedClient.name}</p>
                  {selectedClient.company && <p className="text-xs text-gray-400 mt-0.5">{selectedClient.company}</p>}
                </div>
              )}

              {/* Brand color */}
              <div>
                <label className={labelCls}>Culoare Brand</label>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {BRAND_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setBrandColor(c.value)} title={c.label}
                      className={`w-8 h-8 rounded-full transition-all ${brandColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c.value }} />
                  ))}
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-[12px] px-3 py-2 bg-gray-50">
                  <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                  <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                    className="flex-1 text-sm font-mono focus:outline-none bg-transparent text-gray-700" />
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
                </div>
              </div>
            </div>

            {/* Card 5 - Project Specifics */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Specificații Proiect</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Condiții de plată</label>
                  <input type="text"
                    value={paymentConditions}
                    onChange={e => setPaymentConditions(e.target.value)}
                    placeholder="ex: Avans 50% la semnare, rest la livrare..."
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data de start</label>
                  <input type="date"
                    value={projectStartDate}
                    onChange={e => setProjectStartDate(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Revizii incluse</label>
                  <input type="number" min="0"
                    value={revisionsIncluded}
                    onChange={e => setRevisionsIncluded(e.target.value)}
                    placeholder="ex: 3"
                    className={inputCls} />
                </div>

                {/* Auto-convert toggle */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Auto-convert EUR to RON</span>
                    <div className="group relative">
                      <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        Convertește automat prețul EUR în RON la cursul zilei în oferta publică.
                      </div>
                    </div>
                  </div>
                  <Toggle checked={autoConvertCurrency} onChange={setAutoConvertCurrency} />
                </div>
              </div>
            </div>

            {/* Card 6 - Sales & Urgency Settings */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Setări Urgență & Vânzări</h2>

              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-sm font-bold text-gray-700">Activează Discount Urgență</span>
                <Toggle checked={urgencyEnabled} onChange={setUrgencyEnabled} />
              </div>

              {urgencyEnabled && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  {/* Discount type toggle */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">Tip discount</label>
                    <div className="flex bg-gray-100 rounded-[12px] p-0.5">
                      <button type="button" onClick={() => setUrgencyDiscountType('percent')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-[10px] transition ${
                          urgencyDiscountType === 'percent' ? 'bg-[#acff55] text-black' : 'text-gray-600'
                        }`}>
                        Procent (%)
                      </button>
                      <button type="button" onClick={() => setUrgencyDiscountType('fixed')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-[10px] transition ${
                          urgencyDiscountType === 'fixed' ? 'bg-[#acff55] text-black' : 'text-gray-600'
                        }`}>
                        Sumă fixă
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">
                      Valoare discount {urgencyDiscountType === 'percent' ? '(%)' : `(${currency})`}
                    </label>
                    <input type="number" min="0"
                      value={urgencyDiscountValue}
                      onChange={e => setUrgencyDiscountValue(e.target.value)}
                      placeholder={urgencyDiscountType === 'percent' ? '10' : '500'}
                      className={inputCls} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-2 block">Zile valabilitate discount</label>
                    <input type="number" min="1"
                      value={urgencyDiscountDays}
                      onChange={e => setUrgencyDiscountDays(e.target.value)}
                      placeholder="7"
                      className={inputCls} />
                  </div>

                  <p className="text-xs text-gray-400 italic">
                    Când timerul expiră, prețul revine automat la cel original.
                  </p>
                </div>
              )}
            </div>

            {/* Card 7 - Internal Notes */}
            <div className={cardCls}>
              <h2 className={sectionHeaderCls}>Note Interne</h2>
              <textarea name="notes" rows={5}
                defaultValue={offer?.notes ?? profileDefaults?.offer_default_notes ?? ''}
                placeholder="Vizibile doar pentru tine, nu apar în oferta publică."
                className={inputCls + ' resize-none'} />
              <p className="text-xs text-gray-400 mt-2">Nu este vizibil clientului</p>
            </div>

            {/* Quick actions (edit mode only) */}
            {isEdit && offer && (
              <div className={cardCls}>
                <h2 className={sectionHeaderCls}>Acțiuni Rapide</h2>
                <div className="space-y-2">
                  <Link href={`/o/${offer.token}`} target="_blank"
                    className="flex items-center gap-2.5 w-full px-4 py-3 rounded-[12px] text-sm font-bold text-slate-700 border border-gray-200 hover:bg-gray-50 transition">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Previzualizare publică
                  </Link>
                  <Link href={`/offers/${offer.id}`}
                    className="flex items-center gap-2.5 w-full px-4 py-3 rounded-[12px] text-sm font-bold text-slate-700 border border-gray-200 hover:bg-gray-50 transition">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Deschide oferta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Bottom fixed bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg shadow-black/5">
        <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{items.filter(r => r.title).length}</span> servicii
            &nbsp;·&nbsp;
            Total: <span className="font-bold text-gray-900">{fmt(total)} {currency}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={cancelHref}
              className="text-sm font-bold text-gray-500 hover:text-gray-800 transition px-2">
              Anulează
            </Link>
            <button
              type="submit"
              form={formId ?? 'offer-form'}
              disabled={pending}
              className="bg-[#acff55] text-black rounded-full px-10 py-4 font-bold text-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2">
              {pending ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Se salvează...
                </>
              ) : isEdit ? 'Salvează Oferta' : 'Creează Oferta'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
