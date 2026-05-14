'use client'

import { useActionState, useState, useTransition } from 'react'
import { createPackageAction, updatePackageAction, deletePackageAction } from '@/app/actions/packages'
import type { OfferPackage, OfferPackageItem } from '@/types/database'
import type { PackageState } from '@/app/actions/packages'

const PACKAGE_CATEGORIES = ['', 'Web Design', 'Branding', 'Programare', 'Marketing Digital', 'Social Media', 'Video & Foto', 'Consultanță', 'Copywriting', 'SEO', 'Print', 'Altele']
const ITEM_CATEGORIES    = ['', 'Web Design', 'Branding', 'Programare', 'Marketing Digital', 'Social Media', 'Video & Foto', 'Consultanță', 'Copywriting', 'SEO', 'Print', 'Altele']

const EMPTY_ITEM: OfferPackageItem = { type: 'fix', category: '', title: '', description: '', deliverables: '', timeline: '', quantity: '1', unit_price: '' }

function pkgTotal(items: OfferPackageItem[]) {
  return items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
}

/* ─── Item editor row ─────────────────────────────────────────── */
function ItemRow({
  item, index, total,
  onChange, onRemove, onMove,
}: {
  item: OfferPackageItem; index: number; total: number
  onChange: (i: number, field: keyof OfferPackageItem, val: string) => void
  onRemove: (i: number) => void
  onMove: (i: number, dir: -1 | 1) => void
}) {
  const TYPE_LABELS = { fix: 'Fix', hourly: 'Orar', rate_card: 'Rate Card' }
  const rowAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white group">
      {/* Row 1: category | type toggle | controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={item.category} onChange={e => onChange(index, 'category', e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 max-w-36">
          {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c || '— Categorie —'}</option>)}
        </select>
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['fix', 'hourly', 'rate_card'] as const).map(t => (
            <button key={t} type="button" onClick={() => onChange(index, 'type', t)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${item.type === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
          </button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-slate-500 disabled:opacity-0 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button type="button" onClick={() => onRemove(index)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      {/* Title */}
      <input type="text" value={item.title} onChange={e => onChange(index, 'title', e.target.value)}
        placeholder="Titlu serviciu *"
        className="w-full text-sm font-medium border-0 border-b border-slate-200 pb-1.5 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300 bg-transparent" />
      {/* Description */}
      <input type="text" value={item.description} onChange={e => onChange(index, 'description', e.target.value)}
        placeholder="Descriere serviciu..."
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 text-slate-600 bg-white transition" />
      {/* Deliverables */}
      <textarea rows={2} value={item.deliverables} onChange={e => onChange(index, 'deliverables', e.target.value)}
        placeholder="Livrabile incluse (ex: 3 concepte logo, fișiere SVG/PNG)..."
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 text-slate-600 bg-white transition resize-none" />
      {/* Timeline + Price + Qty */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 min-w-32">
          <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input type="text" value={item.timeline} onChange={e => onChange(index, 'timeline', e.target.value)}
            placeholder="Timeline..."
            className="flex-1 text-xs focus:outline-none placeholder:text-slate-300 text-slate-600 bg-transparent min-w-0" />
        </div>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
          <span className="text-xs text-slate-400">Preț</span>
          <input type="text" inputMode="decimal" value={item.unit_price}
            onChange={e => onChange(index, 'unit_price', e.target.value)}
            onFocus={e => e.target.select()} placeholder="0"
            className="w-16 text-sm text-right focus:outline-none placeholder:text-slate-300 bg-transparent" />
          <span className="text-xs text-slate-400">RON</span>
        </div>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
          <span className="text-xs text-slate-400">{item.type === 'hourly' ? 'Ore' : 'Cant.'}</span>
          <input type="text" inputMode="decimal" value={item.quantity}
            onChange={e => onChange(index, 'quantity', e.target.value)}
            onFocus={e => e.target.select()}
            className="w-10 text-sm text-center focus:outline-none bg-transparent" />
        </div>
        <div className="text-sm font-bold text-slate-700 text-right ml-auto">
          {rowAmt.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
        </div>
      </div>
    </div>
  )
}

/* ─── Package editor form ─────────────────────────────────────── */
function PackageEditor({
  pkg, onCancel,
}: {
  pkg: OfferPackage | null
  onCancel: () => void
}) {
  const isEdit = !!pkg
  const action = isEdit ? updatePackageAction : createPackageAction
  const [state, formAction, pending] = useActionState<PackageState, FormData>(action, undefined)
  const [items, setItems] = useState<OfferPackageItem[]>(
    pkg?.items?.length ? pkg.items : [{ ...EMPTY_ITEM }]
  )

  function updateItem(i: number, field: keyof OfferPackageItem, val: string) {
    setItems(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function removeItem(i: number) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }
  function moveItem(i: number, dir: -1 | 1) {
    const next = i + dir
    if (next < 0 || next >= items.length) return
    setItems(prev => {
      const arr = [...prev];
      [arr[i], arr[next]] = [arr[next], arr[i]]
      return arr
    })
  }

  const total = pkgTotal(items)

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/40">
        <h3 className="text-sm font-semibold text-slate-800">
          {isEdit ? `Editează: ${pkg.name}` : 'Pachet nou'}
        </h3>
        <button type="button" onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form action={formAction} className="p-6 space-y-5">
        {pkg && <input type="hidden" name="id" value={pkg.id} />}
        <input type="hidden" name="items_json" value={JSON.stringify(items)} />

        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{state.error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nume pachet *</label>
            <input name="name" type="text" defaultValue={pkg?.name ?? ''}
              placeholder="ex: Website Prezentare, Brand Identity Complet..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categorie</label>
            <select name="category" defaultValue={pkg?.category ?? ''}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              {PACKAGE_CATEGORIES.map(c => <option key={c} value={c}>{c || '— Alege —'}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descriere scurtă</label>
          <input name="description" type="text" defaultValue={pkg?.description ?? ''}
            placeholder="Scurtă descriere a pachetului..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Servicii incluse</label>
            <span className="text-xs text-slate-400">{items.filter(i => i.title).length} servicii · {total.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RON</span>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <ItemRow key={i} item={item} index={i} total={items.length}
                onChange={updateItem} onRemove={removeItem} onMove={moveItem} />
            ))}
          </div>
          <button type="button"
            onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Adaugă serviciu
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-sm text-slate-500">
            Total pachet: <span className="font-bold text-slate-800">{total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
              Anulează
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition">
              {pending ? 'Se salvează...' : isEdit ? 'Salvează modificările' : 'Creează pachetul'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────────── */
export default function PackagesManager({ packages }: { packages: OfferPackage[] }) {
  const [editing, setEditing] = useState<OfferPackage | null | 'new'>(null)
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(packages.map(p => p.category || 'Altele')))]
  const filtered = activeCategory === 'all' ? packages : packages.filter(p => (p.category || 'Altele') === activeCategory)

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deletePackageAction(fd)
      setDeletingId(null)
    })
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pachete oferte</h1>
          <p className="text-slate-500 text-sm mt-0.5">Salvează și reutilizează grupuri de servicii în orice ofertă</p>
        </div>
        {editing !== 'new' && (
          <button type="button" onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Pachet nou
          </button>
        )}
      </div>

      {/* New package editor */}
      {editing === 'new' && (
        <PackageEditor pkg={null} onCancel={() => setEditing(null)} />
      )}

      {/* Category filter */}
      {packages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}>
              {cat === 'all' ? `Toate (${packages.length})` : cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {packages.length === 0 && editing !== 'new' && (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Niciun pachet salvat</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Creează pachete cu serviciile tale obișnuite și adaugă-le rapid în orice ofertă cu un singur click.
          </p>
          <button type="button" onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Creează primul pachet
          </button>
        </div>
      )}

      {/* Packages grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(pkg => {
            if (editing && editing !== 'new' && editing.id === pkg.id) {
              return (
                <div key={pkg.id} className="md:col-span-2">
                  <PackageEditor pkg={pkg} onCancel={() => setEditing(null)} />
                </div>
              )
            }
            const total = pkgTotal(pkg.items)
            return (
              <div key={pkg.id} className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition overflow-hidden group">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      {pkg.category && (
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                          {pkg.category}
                        </span>
                      )}
                      <h3 className="font-semibold text-slate-900 text-sm">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{pkg.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-slate-800">{total.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RON</div>
                      <div className="text-xs text-slate-400">{pkg.items.length} servicii</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {pkg.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'hourly' ? 'bg-amber-400' : item.type === 'rate_card' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                          <span className="text-slate-600 truncate">{item.title}</span>
                        </div>
                        <span className="text-slate-400 shrink-0 ml-2">
                          {item.type === 'hourly' ? `${item.quantity}h × ${item.unit_price}` : `${parseFloat(item.unit_price).toLocaleString('ro-RO')} RON`}
                        </span>
                      </div>
                    ))}
                    {pkg.items.length > 3 && (
                      <p className="text-xs text-slate-400">+{pkg.items.length - 3} servicii...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                  <span className="text-xs text-slate-400">
                    Actualizat {new Date(pkg.updated_at).toLocaleDateString('ro-RO')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(pkg)}
                      className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition px-2 py-1 rounded hover:bg-indigo-50">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Editează
                    </button>
                    <button type="button"
                      disabled={deletingId === pkg.id}
                      onClick={() => handleDelete(pkg.id)}
                      className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1 transition px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      {deletingId === pkg.id ? 'Se șterge...' : 'Șterge'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && packages.length > 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Niciun pachet în categoria selectată.
        </div>
      )}
    </div>
  )
}
