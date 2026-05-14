'use client'

import { useState } from 'react'

export interface TemplateItem {
  description: string
  quantity: string
  unit_price: string
}

export interface OfferTemplate {
  id: string
  name: string
  badge: string
  badgeColor: string
  description: string
  items: TemplateItem[]
  icon: React.ReactNode
}

const templates: OfferTemplate[] = [
  {
    id: 'basic',
    name: 'Pachet Basic',
    badge: 'BASIC',
    badgeColor: 'bg-slate-100 text-slate-600 ring-slate-200',
    description: 'Ideal pentru proiecte simple sau clienți noi. Include elementele esențiale.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    items: [
      { description: 'Design concept (1 variantă)', quantity: '1', unit_price: '' },
      { description: 'Implementare și livrare fișiere sursă', quantity: '1', unit_price: '' },
      { description: 'O rundă de revizuiri', quantity: '1', unit_price: '' },
    ],
  },
  {
    id: 'standard',
    name: 'Pachet Standard',
    badge: 'STANDARD',
    badgeColor: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    description: 'Cea mai populară opțiune. Echilibru între preț și valoare.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    items: [
      { description: 'Design concept (2 variante)', quantity: '1', unit_price: '' },
      { description: 'Implementare completă', quantity: '1', unit_price: '' },
      { description: 'Trei runde de revizuiri', quantity: '1', unit_price: '' },
      { description: 'Livrare fișiere sursă editabile', quantity: '1', unit_price: '' },
      { description: 'Suport post-livrare (30 zile)', quantity: '1', unit_price: '' },
    ],
  },
  {
    id: 'premium',
    name: 'Pachet Premium',
    badge: 'PREMIUM',
    badgeColor: 'bg-amber-50 text-amber-700 ring-amber-200',
    description: 'Soluție completă pentru proiecte complexe. Include tot ce e necesar.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    items: [
      { description: 'Consultanță și strategie (sesiune dedicată)', quantity: '1', unit_price: '' },
      { description: 'Design concept (3 variante + moodboard)', quantity: '1', unit_price: '' },
      { description: 'Implementare completă', quantity: '1', unit_price: '' },
      { description: 'Revizuiri nelimitate', quantity: '1', unit_price: '' },
      { description: 'Livrare toate fișierele sursă + ghid brand', quantity: '1', unit_price: '' },
      { description: 'Suport prioritar (90 zile)', quantity: '1', unit_price: '' },
    ],
  },
  {
    id: 'hourly',
    name: 'Tarif orar',
    badge: 'ORAR',
    badgeColor: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    description: 'Facturare pe oră. Ideal pentru consultanță, mentenanță sau proiecte flexibile.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      { description: 'Ore de lucru (tarif orar)', quantity: '', unit_price: '' },
    ],
  },
  {
    id: 'blank',
    name: 'Ofertă personalizată',
    badge: 'CUSTOM',
    badgeColor: 'bg-violet-50 text-violet-700 ring-violet-200',
    description: 'Pornești de la zero. Adaugi tu serviciile și prețurile dorite.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    items: [
      { description: '', quantity: '1', unit_price: '' },
    ],
  },
]

interface OfferTemplatesProps {
  onSelect: (items: TemplateItem[]) => void
  onClose: () => void
}

export default function OfferTemplates({ onSelect, onClose }: OfferTemplatesProps) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(template: OfferTemplate) {
    setSelected(template.id)
    onSelect(template.items)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Template ofertă</h2>
            <p className="text-sm text-slate-500 mt-0.5">Alege un pachet și personalizează prețurile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid template-uri */}
        <div className="p-6 grid grid-cols-1 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              className={`w-full text-left rounded-xl border-2 p-4 transition group ${
                selected === template.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  template.id === 'premium' ? 'bg-amber-100 text-amber-600' :
                  template.id === 'standard' ? 'bg-indigo-100 text-indigo-600' :
                  template.id === 'hourly' ? 'bg-emerald-100 text-emerald-600' :
                  template.id === 'blank' ? 'bg-violet-100 text-violet-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{template.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${template.badgeColor}`}>
                      {template.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{template.description}</p>
                  {template.items.length > 1 && (
                    <ul className="space-y-0.5">
                      {template.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {item.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 shrink-0 mt-0.5 transition ${
                  selected === template.id ? 'text-indigo-500' : 'text-slate-200 group-hover:text-indigo-300'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
