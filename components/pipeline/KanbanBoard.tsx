'use client'

import { useState, useTransition, useRef } from 'react'
import { updatePipelineItemStageAction } from '@/app/actions/pipeline'
import type { PipelineItem, PipelineStage } from '@/app/pipeline/page'
import type { Client } from '@/types/database'
import AddItemModal from './AddItemModal'
import EditItemModal from './EditItemModal'

interface KanbanBoardProps {
  items: PipelineItem[]
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
}

const COLUMNS: { id: PipelineStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contactat' },
  { id: 'proposal', label: 'Propunere' },
  { id: 'negotiation', label: 'Negociere' },
  { id: 'won', label: 'Câștigat' },
  { id: 'lost', label: 'Pierdut' },
]

function columnAccent(stage: PipelineStage) {
  switch (stage) {
    case 'won': return {
      header: 'bg-emerald-50 border-emerald-200',
      title: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      addBtn: 'text-emerald-600 hover:bg-emerald-100',
      column: 'border-emerald-200',
      dot: 'bg-emerald-500',
    }
    case 'lost': return {
      header: 'bg-slate-50 border-slate-200',
      title: 'text-slate-500',
      badge: 'bg-slate-100 text-slate-500',
      addBtn: 'text-slate-500 hover:bg-slate-100',
      column: 'border-slate-200',
      dot: 'bg-slate-400',
    }
    default: return {
      header: 'bg-indigo-50 border-indigo-100',
      title: 'text-indigo-700',
      badge: 'bg-indigo-100 text-indigo-700',
      addBtn: 'text-indigo-600 hover:bg-indigo-100',
      column: 'border-slate-200',
      dot: 'bg-indigo-500',
    }
  }
}

function probabilityColor(prob: number | null) {
  if (prob === null) return 'bg-slate-100 text-slate-500'
  if (prob >= 70) return 'bg-emerald-100 text-emerald-700'
  if (prob >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

function formatValue(value: number | null, currency: string) {
  if (value === null) return null
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function columnTotal(items: PipelineItem[]) {
  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0)
  if (total === 0) return null
  // Group by currency — if all same, show formatted; else just count
  const currencies = [...new Set(items.filter(i => i.value).map(i => i.currency))]
  if (currencies.length === 1) {
    return formatValue(total, currencies[0])
  }
  return `${total.toLocaleString('ro-RO')} (mix)`
}

interface KanbanCardProps {
  item: PipelineItem
  onDragStart: (e: React.DragEvent, itemId: string) => void
  onClick: (item: PipelineItem) => void
  isDragging: boolean
}

function KanbanCard({ item, onDragStart, onClick, isDragging }: KanbanCardProps) {
  const clientName = item.client?.name ?? null

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={() => onClick(item)}
      className={`bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer select-none transition-all
        hover:shadow-md hover:border-slate-300 active:scale-95
        ${isDragging ? 'opacity-40 shadow-lg scale-95' : ''}`}
    >
      {/* Title */}
      <p className="text-sm font-semibold text-slate-900 leading-snug mb-2">{item.title}</p>

      {/* Client */}
      {clientName && (
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {clientName}
        </p>
      )}

      {/* Value */}
      {item.value !== null && (
        <p className="text-sm font-bold text-slate-800 mb-2">
          {formatValue(item.value, item.currency)}
        </p>
      )}

      {/* Footer: probability + date */}
      <div className="flex items-center justify-between gap-2 mt-1">
        {item.probability !== null ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${probabilityColor(item.probability)}`}>
            {item.probability}%
          </span>
        ) : <span />}

        {item.expected_close && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(item.expected_close)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ items, clients }: KanbanBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<PipelineStage | null>(null)
  const [addModal, setAddModal] = useState<PipelineStage | null>(null)
  const [editItem, setEditItem] = useState<PipelineItem | null>(null)

  // Optimistic items for instant drag-drop feedback
  const [optimisticItems, setOptimisticItems] = useState<PipelineItem[]>(items)

  // Sync with server when items prop changes (after revalidation)
  const prevItemsRef = useRef(items)
  if (prevItemsRef.current !== items) {
    prevItemsRef.current = items
    setOptimisticItems(items)
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(stage)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault()
    setDragOverColumn(null)

    const itemId = e.dataTransfer.getData('text/plain') || draggedId
    if (!itemId) return

    const draggedItem = optimisticItems.find((i) => i.id === itemId)
    if (!draggedItem || draggedItem.stage === targetStage) {
      setDraggedId(null)
      return
    }

    // Optimistic update
    setOptimisticItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, stage: targetStage } : i)
    )
    setDraggedId(null)

    // Server action via form
    const formData = new FormData()
    formData.set('id', itemId)
    formData.set('stage', targetStage)

    startTransition(async () => {
      await updatePipelineItemStageAction(formData)
    })
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverColumn(null)
  }

  return (
    <>
      <div className="flex gap-4 h-full" style={{ minHeight: '60vh' }}>
        {COLUMNS.map((col) => {
          const colItems = optimisticItems.filter((i) => i.stage === col.id)
          const accent = columnAccent(col.id)
          const total = columnTotal(colItems)
          const isDragTarget = dragOverColumn === col.id

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border bg-slate-50 transition-colors shrink-0
                ${isDragTarget ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-200' : accent.column}
              `}
              style={{ minWidth: '232px', width: '232px' }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-3.5 py-3 rounded-t-xl border-b ${accent.header}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                  <span className={`text-sm font-semibold ${accent.title}`}>{col.label}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${accent.badge}`}>
                    {colItems.length}
                  </span>
                </div>
                <button
                  onClick={() => setAddModal(col.id)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition text-lg font-light leading-none ${accent.addBtn}`}
                  title={`Adaugă în ${col.label}`}
                >
                  +
                </button>
              </div>

              {/* Total value */}
              {total && (
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">{total}</p>
                </div>
              )}

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {colItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-xs text-slate-400">Nicio oportunitate</p>
                  </div>
                )}
                {colItems.map((item) => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    onDragStart={handleDragStart}
                    onClick={setEditItem}
                    isDragging={draggedId === item.id}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {addModal && (
        <AddItemModal
          stage={addModal}
          clients={clients}
          onClose={() => setAddModal(null)}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem}
          clients={clients}
          onClose={() => setEditItem(null)}
        />
      )}
    </>
  )
}
