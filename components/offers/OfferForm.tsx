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
  type: 'fix' | 'hourly'
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
      { type: 'fix', category: 'Social Media', title: 'Management lunar', description: '12 postări/lună, stories, engagement cu comunitatea', quantity: '1', unit_price: '1200' },
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
  { label: 'Indigo',   value: '#6366f1' },
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
                  cat === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{c}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {TEMPLATES.filter(t => t.category === cat).map(tpl => (
              <div key={tpl.id} onClick={() => setEditing({ tpl, items: tpl.items.map(i => ({ ...i })) })}
                className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition">{tpl.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tpl.items.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
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
                  className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="Descriere (opțional)"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-600" />
                <div className="flex items-center gap-3">
                  <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value as ItemRow['type'])}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600">
                    <option value="fix">Preț fix</option>
                    <option value="hourly">Per oră</option>
                  </select>
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
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
                Aplică template
              </button>
            </div>
          </div>
        </>)}
      </div>
    </div>
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
  const [brandColor, setBrandColor]       = useState(offer?.brand_color ?? profileDefaults?.offer_brand_color ?? '#6366f1')
  const [selectedClientId, setSelectedClientId] = useState(offer?.client_id ?? '')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTemplateGrid, setShowTemplateGrid] = useState(false)
  const [paymentConditions, setPaymentConditions] = useState(offer?.payment_conditions ?? '')
  const [projectStartDate, setProjectStartDate] = useState(offer?.project_start_date ?? '')
  const [revisionsIncluded, setRevisionsIncluded] = useState(offer?.revisions_included != null ? String(offer.revisions_included) : '')
  const [activeTemplCat, setActiveTemplCat] = useState<string>('__my__')
  const [templTab, setTemplTab] = useState<'mine' | 'preset'>(packages.length > 0 ? 'mine' : 'preset')

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

  const TYPE_LABELS: Record<ItemRow['type'], string> = {
    fix: 'Fix', hourly: 'Orar',
  }

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

        {state?.error && (
          <div ref={errorRef} className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Nu s-a putut salva oferta</p>
              <p className="text-red-600 mt-0.5">{state.error}</p>
            </div>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Main column ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* General info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Informații generale</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Titlu ofertă</label>
                <input name="title" type="text" defaultValue={offer?.title ?? ''}
                  placeholder="ex: Propunere website corporate, Pachet branding complet..."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Client</label>
                  <select name="client_id" value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition">
                    <option value="">— Fără client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Proiect</label>
                  <select name="project_id" defaultValue={offer?.project_id ?? ''}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition">
                    <option value="">— Fără proiect —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Monedă</label>
                  <select name="currency" value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition">
                    {['RON','EUR','USD','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valabilitate (zile)</label>
                  <input name="validity_days" type="number" min="1"
                    defaultValue={offer?.validity_days ?? profileDefaults?.offer_default_validity ?? 30}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Valabilă până la</label>
                  <input name="valid_until" type="date"
                    defaultValue={offer?.valid_until ?? defaultValidUntil}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Servicii & Pachete</h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowTemplateGrid(v => !v)}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${
                      showTemplateGrid
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Template-uri
                  </button>
                </div>
              </div>

              {/* Inline template grid */}
              {showTemplateGrid && (
                <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                  {/* Tabs: my packages vs presets */}
                  <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
                    {packages.length > 0 && (
                      <button type="button" onClick={() => setTemplTab('mine')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${templTab === 'mine' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Pachetele mele
                        <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{packages.length}</span>
                      </button>
                    )}
                    <button type="button" onClick={() => { setTemplTab('preset'); setActiveTemplCat(CATEGORIES[0]) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${templTab === 'preset' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      Template-uri presetate
                    </button>
                  </div>

                  {/* My packages */}
                  {templTab === 'mine' && (
                    <>
                      {packages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-400 mb-3">Nu ai pachete salvate încă.</p>
                          <Link href="/offers/packages" target="_blank"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
                            Creează primul pachet →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {packages.map(pkg => {
                            const total = pkg.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
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
                                className="text-left p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition group">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    {pkg.category && (
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 block mb-0.5">{pkg.category}</span>
                                    )}
                                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition">{pkg.name}</p>
                                    {pkg.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{pkg.description}</p>}
                                  </div>
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
                                    {total.toLocaleString('ro-RO')} RON
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
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <Link href="/offers/packages" target="_blank"
                          className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Gestionează pachete
                        </Link>
                      </div>
                    </>
                  )}

                  {/* Preset templates */}
                  {templTab === 'preset' && (
                    <>
                      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3">
                        {CATEGORIES.map(c => (
                          <button key={c} type="button" onClick={() => setActiveTemplCat(c)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                              activeTemplCat === c ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
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
                            className="text-left p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition group">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition">{tpl.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{tpl.description}</p>
                              </div>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
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
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <button type="button" onClick={() => { setShowTemplateGrid(false); setShowTemplates(true) }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Deschide cu personalizare
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Item cards */}
              <div className="divide-y divide-slate-100">
                {items.map((row, index) => (
                  <div key={index} className="p-5 group">
                    {/* Row 1: Category | Type | Controls */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <select
                        value={row.category}
                        onChange={e => updateItem(index, 'category', e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 max-w-36">
                        {ITEM_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c || '— Categorie —'}</option>
                        ))}
                      </select>
                      <input type="hidden" name="item_category" value={row.category} />
                      <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                        {(['fix', 'hourly'] as const).map(t => (
                          <button key={t} type="button" onClick={() => updateItem(index, 'type', t)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                              row.type === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                            {TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                      <input type="hidden" name="item_type" value={row.type} />
                      <div className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button type="button" onClick={() => removeItem(index)}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Title */}
                    <input name="item_title" type="text"
                      value={row.title} onChange={e => updateItem(index, 'title', e.target.value)}
                      placeholder="Titlu serviciu / pachet..."
                      className="w-full text-sm font-semibold border-0 border-b border-slate-200 pb-2 mb-3 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300 text-slate-900 bg-transparent transition" />

                    {/* Row 3: Description */}
                    <input name="item_description" type="text"
                      value={row.description} onChange={e => updateItem(index, 'description', e.target.value)}
                      placeholder="Descriere serviciu, ce include..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 text-slate-600 bg-white transition" />

                    {/* Row 4: Deliverables */}
                    <textarea name="item_deliverables" rows={2}
                      value={row.deliverables} onChange={e => updateItem(index, 'deliverables', e.target.value)}
                      placeholder="Livrabile: ce primește clientul (ex: 3 concepte logo, fișiere SVG/PNG, ghid brand)..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 text-slate-600 bg-white transition resize-none" />

                    {/* Row 5: Timeline + Price + Qty + Total */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white min-w-40 flex-1">
                        <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input name="item_timeline" type="text"
                          value={row.timeline} onChange={e => updateItem(index, 'timeline', e.target.value)}
                          placeholder="Timeline estimativ..."
                          className="flex-1 text-xs focus:outline-none placeholder:text-slate-300 text-slate-600 bg-transparent min-w-0" />
                      </div>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                        <span className="text-xs text-slate-400 shrink-0">Preț/u</span>
                        <input name="item_price" type="text" inputMode="decimal"
                          value={row.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)}
                          onFocus={e => e.target.select()} placeholder="0"
                          className="w-20 text-sm text-right focus:outline-none placeholder:text-slate-300 text-slate-900 bg-transparent" />
                        <span className="text-xs text-slate-400 shrink-0">{currency}</span>
                      </div>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                        <span className="text-xs text-slate-400 shrink-0">{row.type === 'hourly' ? 'Ore' : 'Cant.'}</span>
                        <input name="item_quantity" type="text" inputMode="decimal"
                          value={row.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                          onFocus={e => e.target.select()}
                          className="w-12 text-sm text-center focus:outline-none text-slate-900 bg-transparent" />
                      </div>
                      <div className="text-sm font-bold text-slate-800 text-right ml-auto shrink-0">
                        {fmt(rowTotal(row))} <span className="text-xs font-medium text-slate-400">{currency}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100">
                <button type="button" onClick={addItem}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Adaugă serviciu
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-3 bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{fmt(subtotal)} {currency}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Discount</span>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as typeof discountType)}
                      className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="none">Fără</option>
                      <option value="percent">Procent (%)</option>
                      <option value="fixed">Sumă fixă</option>
                    </select>
                    {discountType !== 'none' && (
                      <input type="text" inputMode="decimal"
                        value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-16 text-sm text-right border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" />
                    )}
                    {discountType === 'percent' && <span className="text-xs text-slate-400">%</span>}
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Reducere</span>
                      <span className="font-medium">-{fmt(discountAmount)} {currency}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm text-slate-600 items-center">
                  <div className="flex items-center gap-2">
                    <span>TVA</span>
                    <input type="text" inputMode="decimal"
                      value={taxRate} onChange={e => setTaxRate(e.target.value)} onFocus={e => e.target.select()}
                      className="w-12 text-sm text-center border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <span className="font-medium">{fmt(taxAmount)} {currency}</span>
                </div>

                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-3">
                  <span>TOTAL</span>
                  <span>{fmt(total)} {currency}</span>
                </div>
              </div>
            </div>

            {/* Submit bar (for new offer page — no sticky header) */}
            {!formId && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400">
                  {items.filter(r => r.title).length} servicii · Total: <span className="font-semibold text-slate-600">{fmt(total)} {currency}</span>
                </p>
                <div className="flex items-center gap-3">
                  <Link href={cancelHref}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                    Anulează
                  </Link>
                  <button type="submit" disabled={pending}
                    style={{ backgroundColor: brandColor }}
                    className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition hover:opacity-90 min-w-40">
                    {pending ? (
                      <span className="flex items-center gap-2 justify-center">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Se salvează...
                      </span>
                    ) : 'Creează oferta'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="xl:col-span-1 space-y-5">

            {/* Financial summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sumar Financiar & Detalii Proiect</h3>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Condiții de plată</label>
                <textarea
                  rows={2}
                  value={paymentConditions}
                  onChange={e => setPaymentConditions(e.target.value)}
                  placeholder="ex: Avans 50% la semnare, rest la livrare..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de start proiect</label>
                <input
                  type="date"
                  value={projectStartDate}
                  onChange={e => setProjectStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Revizii incluse</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={revisionsIncluded}
                    onChange={e => setRevisionsIncluded(e.target.value)}
                    placeholder="ex: 3"
                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                  <span className="text-xs text-slate-400">runde de revizii</span>
                </div>
              </div>
            </div>

            {/* Client card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Client</h3>
              {selectedClient ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  {selectedClient.logo_url ? (
                    <img src={selectedClient.logo_url} alt={selectedClient.name}
                      className="w-16 h-16 rounded-xl object-contain border border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center border border-violet-200">
                      <span className="text-2xl font-bold text-violet-500">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800">{selectedClient.name}</p>
                    {selectedClient.company && (
                      <p className="text-xs text-slate-400 mt-0.5">{selectedClient.company}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400 text-center">Niciun client selectat</p>
                </div>
              )}
            </div>

            {/* Brand color */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Culoare brand</h3>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {BRAND_COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setBrandColor(c.value)} title={c.label}
                    className={`w-7 h-7 rounded-full transition-all ${brandColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c.value }} />
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-xs text-slate-400">Custom</span>
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200" />
                </div>
              </div>
              <div className="rounded-lg py-2 px-3 text-xs font-semibold text-white text-center"
                style={{ backgroundColor: brandColor }}>
                {brandColor}
              </div>
            </div>

            {/* Text introductiv */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Texte ofertă</h3>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Text introductiv</label>
                <textarea name="intro_text" rows={3}
                  defaultValue={offer?.intro_text ?? profileDefaults?.offer_default_intro ?? ''}
                  placeholder="ex: Vă mulțumim pentru interesul acordat. Conform discuțiilor, vă prezentăm propunerea noastră..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Termeni & condiții</label>
                <textarea name="terms_text" rows={3}
                  defaultValue={offer?.terms_text ?? profileDefaults?.offer_default_terms ?? ''}
                  placeholder="ex: Prețurile nu includ TVA. Avans 50% la semnare. Durata estimată..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none" />
              </div>
            </div>

            {/* Note interne */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Note interne</label>
              <textarea name="notes" rows={3}
                defaultValue={offer?.notes ?? profileDefaults?.offer_default_notes ?? ''}
                placeholder="Vizibile doar pentru tine, nu apar în oferta publică."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none" />
            </div>

            {/* Quick actions (edit mode only) */}
            {isEdit && offer && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acțiuni rapide</h3>
                <div className="space-y-2">
                  <Link href={`/o/${offer.token}`} target="_blank"
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Previzualizare publică
                  </Link>
                  <Link href={`/offers/${offer.id}`}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    </>
  )
}
