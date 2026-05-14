'use client'

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react'
import type { TimeEntry, TimeTag, ClientRate, TimeSettings } from '@/types/database'
import {
  startTimerAction, stopTimerAction,
  createTimeEntryAction, deleteTimeEntryAction, updateTimeEntryAction,
  createTagAction, deleteTagAction,
  saveClientRateAction, saveTimeSettingsAction,
} from '@/app/actions/time'
import { createReportShareAction } from '@/app/actions/report'

// ─── Utils ──────────────────────────────────────────────────────────────────

function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60), m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtElapsed(startedAt: string): string {
  const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function fmtMoney(n: number, currency = 'RON') {
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// ─── Period ──────────────────────────────────────────────────────────────────

type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth' | '30d' | '90d' | 'custom'

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Azi', week: 'Săptămâna', month: 'Luna aceasta',
  lastMonth: 'Luna trecută', '30d': '30 zile', '90d': '90 zile', custom: 'Personalizat',
}

function getPeriodRange(key: PeriodKey, customFrom?: string, customTo?: string): [Date, Date] {
  const now = new Date()
  const sod = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const eod = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  switch (key) {
    case 'today': return [sod(now), eod(now)]
    case 'week': {
      const d = new Date(now)
      const dow = d.getDay()
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
      return [sod(d), eod(now)]
    }
    case 'month': return [sod(new Date(now.getFullYear(), now.getMonth(), 1)), eod(now)]
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to   = new Date(now.getFullYear(), now.getMonth(), 0)
      return [sod(from), eod(to)]
    }
    case '30d': return [sod(new Date(Date.now() - 30 * 864e5)), eod(now)]
    case '90d': return [sod(new Date(Date.now() - 90 * 864e5)), eod(now)]
    case 'custom': return [
      customFrom ? sod(new Date(customFrom)) : sod(new Date(Date.now() - 30 * 864e5)),
      customTo   ? eod(new Date(customTo))   : eod(now),
    ]
  }
}

// ─── Chart ───────────────────────────────────────────────────────────────────

/** Data locală ca string YYYY-MM-DD (fără conversie UTC) */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Palette de culori pentru clienți
const CLIENT_PALETTE = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4']

type ChartBucket = {
  label: string
  mins: number
  billMins: number
  clientBreakdown: { clientId: string; clientName: string; mins: number }[]
}

function generateChart(
  entries: TimeEntry[],
  from: Date,
  to: Date,
): { buckets: ChartBucket[]; isWeekly: boolean } {
  const dayDiff = Math.round((to.getTime() - from.getTime()) / 864e5)
  const isWeekly = dayDiff > 31

  if (!isWeekly) {
    const byDay: Record<string, { mins: number; billMins: number; clients: Record<string, { name: string; mins: number }> }> = {}
    for (const e of entries) {
      const key = localDateKey(new Date(e.started_at))
      if (!byDay[key]) byDay[key] = { mins: 0, billMins: 0, clients: {} }
      const m = e.duration_minutes ?? 0
      byDay[key].mins += m
      if (e.is_billable) byDay[key].billMins += m
      const cid = e.client_id ?? '__none__'
      const cname = (e.client as { name: string } | null)?.name ?? 'Fără client'
      if (!byDay[key].clients[cid]) byDay[key].clients[cid] = { name: cname, mins: 0 }
      byDay[key].clients[cid].mins += m
    }
    const buckets: ChartBucket[] = []
    const cur = new Date(from); cur.setHours(0, 0, 0, 0)
    const end = new Date(to);   end.setHours(0, 0, 0, 0)
    while (cur <= end) {
      const key = localDateKey(cur)
      const day = byDay[key]
      buckets.push({
        label: cur.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
        mins: day?.mins ?? 0,
        billMins: day?.billMins ?? 0,
        clientBreakdown: day
          ? Object.entries(day.clients).map(([clientId, v]) => ({ clientId, clientName: v.name, mins: v.mins }))
          : [],
      })
      cur.setDate(cur.getDate() + 1)
    }
    return { buckets, isWeekly }
  }

  // Weekly
  const byWeek: Record<string, ChartBucket> = {}
  for (const e of entries) {
    const d = new Date(e.started_at)
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    mon.setHours(0, 0, 0, 0)
    const key = localDateKey(mon)
    if (!byWeek[key]) byWeek[key] = {
      label: mon.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
      mins: 0, billMins: 0, clientBreakdown: [],
    }
    const m = e.duration_minutes ?? 0
    byWeek[key].mins += m
    if (e.is_billable) byWeek[key].billMins += m
    const cid = e.client_id ?? '__none__'
    const cname = (e.client as { name: string } | null)?.name ?? 'Fără client'
    const seg = byWeek[key].clientBreakdown.find(x => x.clientId === cid)
    if (seg) seg.mins += m
    else byWeek[key].clientBreakdown.push({ clientId: cid, clientName: cname, mins: m })
  }
  const buckets = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  return { buckets, isWeekly }
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupEntries(entries: TimeEntry[], by: 'day' | 'client' | 'project'): Record<string, TimeEntry[]> {
  const g: Record<string, TimeEntry[]> = {}
  for (const e of entries) {
    let key: string
    if (by === 'day') {
      key = new Date(e.started_at).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } else if (by === 'client') {
      key = (e.client as { name: string } | null)?.name ?? 'Fără client'
    } else {
      key = (e.project as { name: string } | null)?.name ?? 'Fără proiect'
    }
    if (!g[key]) g[key] = []
    g[key].push(e)
  }
  return g
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(entries: TimeEntry[], tagMap: Record<string, TimeTag>, label: string) {
  const headers = ['Data','Descriere','Client','Proiect','Tag-uri','Start','Stop','Durata (min)','Tarif/h','Monedă','Valoare','Facturabil','Facturat']
  const rows = entries.map(e => [
    new Date(e.started_at).toLocaleDateString('ro-RO'),
    e.description ?? '',
    (e.client as { name: string } | null)?.name ?? '',
    (e.project as { name: string } | null)?.name ?? '',
    (e.tag_ids ?? []).map(id => tagMap[id]?.name ?? '').filter(Boolean).join('; '),
    new Date(e.started_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    e.ended_at ? new Date(e.ended_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '',
    e.duration_minutes ?? 0,
    e.hourly_rate,
    e.currency,
    ((e.duration_minutes ?? 0) / 60 * e.hourly_rate).toFixed(2),
    e.is_billable ? 'Da' : 'Nu',
    e.is_invoiced ? 'Da' : 'Nu',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pontaj-${label.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export PDF (jsPDF — auto-download) ─────────────────────────────────────

async function exportPDF(opts: {
  entries: TimeEntry[]
  periodLabel: string
  clientName: string | null
  stats: { totalMins: number; billMins: number; billValue: number; activeDays: number; avgMins: number; billRatio: number }
  byClient: { name: string; mins: number; billMins: number; value: number }[]
  byProject: { name: string; mins: number; value: number; clientName: string }[]
  defaultCurrency: string
}) {
  const { jsPDF } = await import('jspdf')
  const { entries, periodLabel, clientName, stats, byClient, byProject, defaultCurrency } = opts

  const fmt = (m: number | null | undefined) => {
    if (!m || m <= 0) return '0m'
    const h = Math.floor(m / 60), min = m % 60
    if (h === 0) return `${min}m`
    if (min === 0) return `${h}h`
    return `${h}h ${min}m`
  }
  const fmtMon = (n: number, cur = defaultCurrency) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 16
  let y = 0

  // ── Header gradient block ──────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229)  // indigo-600
  doc.rect(0, 0, W, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FREELIO', margin, 12)
  doc.setFontSize(18)
  doc.text('Raport Pontaj', margin, 22)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(199, 210, 254)
  doc.text(`Perioadă: ${periodLabel}${clientName ? '  ·  Client: ' + clientName : ''}`, margin, 30)
  doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 36)

  // Big total hours — right side
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  const totalStr = fmt(stats.totalMins)
  doc.text(totalStr, W - margin, 24, { align: 'right' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(199, 210, 254)
  doc.text('total ore', W - margin, 30, { align: 'right' })
  y = 50

  // ── Stat boxes ──────────────────────────────────────────────────────────────
  const boxW = (W - margin * 2 - 9) / 4
  const boxes = [
    { label: 'TOTAL ORE', value: fmt(stats.totalMins), sub: `${stats.activeDays} zile active`, color: [30, 41, 59] as [number,number,number], accent: false },
    { label: 'FACTURABILE', value: fmt(stats.billMins), sub: `${stats.billRatio.toFixed(0)}% din total`, color: [79, 70, 229] as [number,number,number], accent: true },
    { label: 'VENIT ESTIMAT', value: fmtMon(stats.billValue), sub: '', color: [5, 150, 105] as [number,number,number], accent: true },
    { label: 'MEDIE / ZI', value: fmt(Math.round(stats.avgMins)), sub: 'pe zile cu pontaj', color: [30, 41, 59] as [number,number,number], accent: false },
  ]
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, boxW, 22, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, y, boxW, 22, 2, 2, 'S')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(148, 163, 184)
    doc.text(b.label, x + 4, y + 6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...b.color)
    doc.text(b.value, x + 4, y + 14)
    if (b.sub) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(b.sub, x + 4, y + 19)
    }
  })
  y += 30

  // ── Billable ratio bar ─────────────────────────────────────────────────────
  const barW = W - margin * 2
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Rată de facturare', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(79, 70, 229)
  doc.text(`${stats.billRatio.toFixed(1)}%`, W - margin, y, { align: 'right' })
  y += 4
  doc.setFillColor(226, 232, 240)
  doc.roundedRect(margin, y, barW, 4, 1, 1, 'F')
  if (stats.billRatio > 0) {
    doc.setFillColor(79, 70, 229)
    doc.roundedRect(margin, y, barW * stats.billRatio / 100, 4, 1, 1, 'F')
  }
  y += 10

  // ── Per client ─────────────────────────────────────────────────────────────
  if (byClient.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Per client', margin, y)
    y += 5
    const maxClientMins = Math.max(...byClient.map(c => c.mins), 1)
    byClient.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = margin }
      const [r, g, b] = hexToRgb(CLIENT_PALETTE[i % CLIENT_PALETTE.length])
      // Dot
      doc.setFillColor(r, g, b)
      doc.circle(margin + 2, y - 1, 1.5, 'F')
      // Name
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(c.name, margin + 6, y)
      // Value
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(fmt(c.mins), W - margin - 40, y, { align: 'right' })
      if (c.value > 0) {
        doc.setTextColor(79, 70, 229)
        doc.setFont('helvetica', 'bold')
        doc.text(fmtMon(c.value), W - margin, y, { align: 'right' })
      }
      y += 4
      // Bar
      doc.setFillColor(226, 232, 240)
      doc.roundedRect(margin, y, barW, 3, 0.5, 0.5, 'F')
      doc.setFillColor(r, g, b)
      doc.roundedRect(margin, y, barW * (c.mins / maxClientMins), 3, 0.5, 0.5, 'F')
      y += 7
    })
    y += 2
  }

  // ── Per project ─────────────────────────────────────────────────────────────
  if (byProject.length > 0) {
    if (y > 240) { doc.addPage(); y = margin }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Per proiect', margin, y)
    y += 5
    const maxProjMins = Math.max(...byProject.map(p => p.mins), 1)
    byProject.forEach(p => {
      if (y > 270) { doc.addPage(); y = margin }
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(p.name, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(p.clientName, margin + doc.getTextWidth(p.name) + 2, y)
      doc.setTextColor(100, 116, 139)
      doc.text(fmt(p.mins), W - margin - 40, y, { align: 'right' })
      if (p.value > 0) {
        doc.setTextColor(124, 58, 237)
        doc.setFont('helvetica', 'bold')
        doc.text(fmtMon(p.value), W - margin, y, { align: 'right' })
      }
      y += 4
      doc.setFillColor(237, 233, 254)
      doc.roundedRect(margin, y, barW, 2.5, 0.5, 0.5, 'F')
      doc.setFillColor(139, 92, 246)
      doc.roundedRect(margin, y, barW * (p.mins / maxProjMins), 2.5, 0.5, 0.5, 'F')
      y += 6
    })
    y += 2
  }

  // ── Entries table ─────────────────────────────────────────────────────────
  if (entries.length > 0) {
    if (y > 220) { doc.addPage(); y = margin }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(`Înregistrări (${entries.length})`, margin, y)
    y += 5

    // Header row
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y, barW, 6, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    const cols = [
      { label: 'DATA',      x: margin + 1 },
      { label: 'DESCRIERE', x: margin + 20 },
      { label: 'CLIENT',    x: margin + 75 },
      { label: 'DURATĂ',    x: W - margin - 30, align: 'right' as const },
      { label: 'VALOARE',   x: W - margin - 1,  align: 'right' as const },
    ]
    cols.forEach(c => doc.text(c.label, c.x, y + 4, { align: c.align }))
    y += 7

    doc.setFont('helvetica', 'normal')
    entries.forEach((e, idx) => {
      if (y > 275) { doc.addPage(); y = margin }
      const value = (e.duration_minutes ?? 0) / 60 * e.hourly_rate
      const client = (e.client as { name: string } | null)?.name ?? ''
      const proj   = (e.project as { name: string } | null)?.name ?? ''

      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251)
        doc.rect(margin, y - 1, barW, 6.5, 'F')
      }

      doc.setFontSize(7)
      doc.setTextColor(51, 65, 85)
      doc.text(new Date(e.started_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }), margin + 1, y + 3.5)

      // Description (truncated)
      const descText = (e.description ?? '—').substring(0, 40)
      doc.text(descText, margin + 20, y + 3.5)

      doc.setTextColor(100, 116, 139)
      const clientText = client + (client && proj ? ' › ' : '') + proj
      doc.text(clientText.substring(0, 28), margin + 75, y + 3.5)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(fmt(e.duration_minutes), W - margin - 30, y + 3.5, { align: 'right' })

      if (value > 0) {
        doc.setTextColor(79, 70, 229)
        doc.text(fmtMon(value, e.currency), W - margin - 1, y + 3.5, { align: 'right' })
      }
      doc.setFont('helvetica', 'normal')
      y += 6.5
    })
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(`Freelio · Raport generat automat · ${new Date().toLocaleString('ro-RO')}`, margin, 290)
    doc.text(`${p} / ${pageCount}`, W - margin, 290, { align: 'right' })
  }

  // Auto-download
  const filename = `pontaj-${periodLabel.replace(/\s+/g, '-')}${clientName ? '-' + clientName.replace(/\s+/g, '-') : ''}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TagPill({ tag, selected, onClick }: { tag: TimeTag; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition border ${selected ? 'text-white border-transparent' : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300'}`}
      style={selected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selected ? 'rgba(255,255,255,0.7)' : tag.color }} />
      {tag.name}
    </button>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarChart({
  buckets, isWeekly, clientColorMap,
}: {
  buckets: ChartBucket[]
  isWeekly: boolean
  clientColorMap: Record<string, string>
}) {
  const maxMins = Math.max(...buckets.map(d => d.mins), 60)
  if (buckets.length === 0) return (
    <div className="h-48 flex items-center justify-center text-sm text-slate-400">Nicio activitate în perioadă</div>
  )

  // For many-day views, only show labels every N days to avoid overlap
  const labelEvery = buckets.length <= 14 ? 1
    : buckets.length <= 31 ? 2
    : buckets.length <= 62 ? 5
    : 7

  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end pb-7 relative gap-px"
        style={{ height: 200, minWidth: `${buckets.length * (isWeekly ? 28 : 16)}px` }}
      >
        <span className="absolute top-0 right-0 text-[10px] text-slate-300">{fmtDuration(maxMins)}</span>
        {buckets.map((d, i) => {
          const totalH = d.mins > 0 ? (d.mins / maxMins) * 160 : 0
          const showLabel = i % labelEvery === 0 || i === buckets.length - 1

          // Build stacked client segments (top to bottom = first to last client)
          const hasClientColors = d.clientBreakdown.length > 0 && Object.keys(clientColorMap).length > 0
          const segments = hasClientColors
            ? d.clientBreakdown.map(seg => ({
                heightPx: totalH > 0 ? (seg.mins / d.mins) * totalH : 0,
                color: clientColorMap[seg.clientId] ?? '#94a3b8',
                name: seg.clientName,
                mins: seg.mins,
              }))
            : []

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
              style={{ minWidth: isWeekly ? 24 : 12, maxWidth: isWeekly ? 40 : 20 }}
            >
              {/* Tooltip */}
              {d.mins > 0 && (
                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition z-20 pointer-events-none">
                  <div className="bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg text-center">
                    <div className="font-semibold mb-0.5">{d.label}</div>
                    <div>{fmtDuration(d.mins)} total</div>
                    {d.clientBreakdown.map(seg => (
                      <div key={seg.clientId} className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clientColorMap[seg.clientId] ?? '#94a3b8' }} />
                        <span className="text-slate-300">{seg.clientName}: {fmtDuration(seg.mins)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bar */}
              <div
                className="w-full rounded-t overflow-hidden"
                style={{ height: `${totalH}px` }}
              >
                {totalH > 0 && (
                  hasClientColors && segments.length > 0
                    ? <div className="w-full h-full flex flex-col">
                        {segments.map((seg, si) => (
                          <div key={si} className="w-full" style={{ height: `${seg.heightPx}px`, backgroundColor: seg.color }} />
                        ))}
                      </div>
                    : <div className="w-full h-full bg-indigo-500 rounded-t" />
                )}
                {totalH === 0 && <div className="w-full h-px bg-slate-100" />}
              </div>

              {/* Label */}
              {showLabel && (
                <span className="absolute -bottom-0.5 left-0 right-0 text-center text-[8px] text-slate-400 truncate px-0.5 leading-tight">
                  {d.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ProjectOption = { id: string; name: string; client_id: string | null }
type ClientOption  = { id: string; name: string }

// ─── Edit Entry Row ───────────────────────────────────────────────────────────

function EditEntryRow({
  entry, clients, projects, tags, onSave, onCancel, isPending,
}: {
  entry: TimeEntry; clients: ClientOption[]; projects: ProjectOption[]
  tags: TimeTag[]; onSave: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void; isPending: boolean
}) {
  const [editClientId, setEditClientId] = useState(entry.client_id ?? '')
  const [editTags, setEditTags]         = useState<string[]>(entry.tag_ids ?? [])
  const [editBillable, setEditBillable] = useState(entry.is_billable)
  const filteredProjects = editClientId ? projects.filter(p => p.client_id === editClientId) : projects

  return (
    <form onSubmit={onSave} className="px-5 py-4 bg-indigo-50 border-l-4 border-indigo-400 space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="is_billable" value={String(editBillable)} />
      <input name="description" type="text" defaultValue={entry.description ?? ''} placeholder="Descriere"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
          <input name="started_at" type="datetime-local" defaultValue={toDatetimeLocal(entry.started_at)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Stop</label>
          <input name="ended_at" type="datetime-local" defaultValue={entry.ended_at ? toDatetimeLocal(entry.ended_at) : ''}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tarif/h</label>
          <input name="hourly_rate" type="text" inputMode="decimal" defaultValue={String(entry.hourly_rate)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Monedă</label>
          <select name="currency" defaultValue={entry.currency}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {['RON','EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
          <select name="client_id" value={editClientId} onChange={e => setEditClientId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— Fără client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Proiect</label>
          <select name="project_id" defaultValue={entry.project_id ?? ''}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— Fără proiect —</option>
            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <button key={t.id} type="button"
              onClick={() => setEditTags(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition border ${editTags.includes(t.id) ? 'text-white border-transparent' : 'text-slate-600 bg-white border-slate-200'}`}
              style={editTags.includes(t.id) ? { backgroundColor: t.color, borderColor: t.color } : {}}>
              {t.name}
            </button>
          ))}
          {editTags.map(id => <input key={id} type="hidden" name="tag_ids" value={id} />)}
        </div>
      )}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={editBillable} onChange={e => setEditBillable(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Facturabil
        </label>
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-white transition">Anulează</button>
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60">
            {isPending ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  initialEntries: TimeEntry[]
  clients: ClientOption[]
  projects: ProjectOption[]
  tags: TimeTag[]
  clientRates: ClientRate[]
  settings: TimeSettings | null
  runningEntry: TimeEntry | null
}

export default function TimeTracker({
  initialEntries, clients, projects, tags: initialTags,
  clientRates: initialRates, settings, runningEntry,
}: Props) {
  const [tab, setTab]               = useState<'timer' | 'analytics' | 'settings'>('timer')
  const [tags, setTags]             = useState(initialTags)
  const [clientRates, setClientRates] = useState(initialRates)
  const [entries, setEntries]       = useState(initialEntries)
  const [running, setRunning]       = useState<TimeEntry | null>(runningEntry)
  const [elapsed, setElapsed]       = useState('00:00:00')
  const [isPending, startTransition] = useTransition()

  // Shared period
  const [period, setPeriod]         = useState<PeriodKey>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  // Timer state
  const [desc, setDesc]             = useState('')
  const [clientId, setClientId]     = useState('')
  const [projectId, setProjectId]   = useState('')
  const [rate, setRate]             = useState(settings?.default_rate ? String(settings.default_rate) : '')
  const [currency, setCurrency]     = useState(settings?.default_currency ?? 'RON')
  const [selTags, setSelTags]       = useState<string[]>([])
  const [isBillable, setIsBillable] = useState(true)

  // Filters (timer tab)
  const [filterSearch, setFilterSearch]     = useState('')
  const [filterClient, setFilterClient]     = useState('')
  const [filterProject, setFilterProject]   = useState('')
  const [filterTag, setFilterTag]           = useState('')
  const [filterBillable, setFilterBillable] = useState<'all' | 'yes' | 'no'>('all')
  const [groupBy, setGroupBy]               = useState<'day' | 'client' | 'project'>('day')

  // Analytics tab filter
  const [analyticsClientId, setAnalyticsClientId] = useState('')

  // UI
  const [showManual, setShowManual]   = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareUrl, setShareUrl]         = useState<string | null>(null)
  const [manualSelTags, setManualSelTags]   = useState<string[]>([])
  const [manualClientId, setManualClientId] = useState('')
  const [manualRate, setManualRate]         = useState('')
  const [manualCurrency, setManualCurrency] = useState(settings?.default_currency ?? 'RON')
  const [manualErr, setManualErr]           = useState<string | null>(null)

  // Timer tick
  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setElapsed(fmtElapsed(running.started_at)), 1000)
    setElapsed(fmtElapsed(running.started_at))
    return () => clearInterval(iv)
  }, [running])

  // Derived
  const finished = useMemo(() => entries.filter(e => e.ended_at), [entries])
  const tagMap   = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags])

  const [periodStart, periodEnd] = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  const periodEntries = useMemo(() =>
    finished.filter(e => {
      const d = new Date(e.started_at)
      return d >= periodStart && d <= periodEnd
    }), [finished, periodStart, periodEnd])

  const filteredEntries = useMemo(() =>
    periodEntries.filter(e => {
      if (filterSearch && !e.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterClient && e.client_id !== filterClient) return false
      if (filterProject && e.project_id !== filterProject) return false
      if (filterTag && !(e.tag_ids ?? []).includes(filterTag)) return false
      if (filterBillable === 'yes' && !e.is_billable) return false
      if (filterBillable === 'no' && e.is_billable) return false
      return true
    }), [periodEntries, filterSearch, filterClient, filterProject, filterTag, filterBillable])

  const stats = useMemo(() => {
    const totalMins = periodEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
    const billMins  = periodEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
    const billValue = periodEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes ?? 0) / 60 * e.hourly_rate, 0)
    const activeDays = new Set(periodEntries.map(e => localDateKey(new Date(e.started_at)))).size
    const avgMins    = activeDays > 0 ? totalMins / activeDays : 0
    const billRatio  = totalMins > 0 ? (billMins / totalMins) * 100 : 0
    return { totalMins, billMins, billValue, activeDays, avgMins, billRatio }
  }, [periodEntries])

  // periodEntries filtrate pe clientul selectat în analytics
  const analyticsEntries = useMemo(() =>
    analyticsClientId
      ? periodEntries.filter(e => e.client_id === analyticsClientId)
      : periodEntries,
    [periodEntries, analyticsClientId]
  )

  // Stats recalculate pt analytics (ține cont de filtrul pe client)
  const analyticsStats = useMemo(() => {
    const totalMins = analyticsEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
    const billMins  = analyticsEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
    const billValue = analyticsEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes ?? 0) / 60 * e.hourly_rate, 0)
    const activeDays = new Set(analyticsEntries.map(e => localDateKey(new Date(e.started_at)))).size
    const avgMins    = activeDays > 0 ? totalMins / activeDays : 0
    const billRatio  = totalMins > 0 ? (billMins / totalMins) * 100 : 0
    return { totalMins, billMins, billValue, activeDays, avgMins, billRatio }
  }, [analyticsEntries])

  const analytics = useMemo(() => {
    const byClient:  Record<string, { name: string; mins: number; billMins: number; value: number }> = {}
    const byProject: Record<string, { name: string; mins: number; value: number; clientName: string }> = {}
    const byTag:     Record<string, { name: string; color: string; mins: number }> = {}

    for (const e of analyticsEntries) {
      const clientName = (e.client as { name: string } | null)?.name ?? 'Fără client'
      const cKey = e.client_id ?? '__none__'
      if (!byClient[cKey]) byClient[cKey] = { name: clientName, mins: 0, billMins: 0, value: 0 }
      byClient[cKey].mins += e.duration_minutes ?? 0
      if (e.is_billable) {
        byClient[cKey].billMins += e.duration_minutes ?? 0
        byClient[cKey].value += (e.duration_minutes ?? 0) / 60 * e.hourly_rate
      }
      const projName = (e.project as { name: string } | null)?.name ?? 'Fără proiect'
      const pKey = e.project_id ?? '__none__'
      if (!byProject[pKey]) byProject[pKey] = { name: projName, mins: 0, value: 0, clientName }
      byProject[pKey].mins += e.duration_minutes ?? 0
      byProject[pKey].value += e.is_billable ? (e.duration_minutes ?? 0) / 60 * e.hourly_rate : 0

      for (const tagId of (e.tag_ids ?? [])) {
        const tag = tagMap[tagId]; if (!tag) continue
        if (!byTag[tagId]) byTag[tagId] = { name: tag.name, color: tag.color, mins: 0 }
        byTag[tagId].mins += e.duration_minutes ?? 0
      }
    }

    // Assign a color from the palette to each client (stable, by insertion order)
    const clientColorMap: Record<string, string> = {}
    Object.keys(byClient).forEach((cid, idx) => {
      clientColorMap[cid] = CLIENT_PALETTE[idx % CLIENT_PALETTE.length]
    })

    return {
      byClient:       Object.values(byClient).sort((a, b) => b.mins - a.mins),
      byClientKeys:   Object.keys(byClient),
      byProject:      Object.values(byProject).sort((a, b) => b.mins - a.mins),
      byTag:          Object.values(byTag).sort((a, b) => b.mins - a.mins),
      chart:          generateChart(analyticsEntries, periodStart, periodEnd),
      clientColorMap,
    }
  }, [analyticsEntries, tagMap, periodStart, periodEnd])

  const filteredProjects = clientId ? projects.filter(p => p.client_id === clientId) : projects
  const activeFilters = [filterSearch, filterClient, filterProject, filterTag, filterBillable !== 'all'].filter(Boolean).length
  const groups = useMemo(() => groupEntries(filteredEntries, groupBy), [filteredEntries, groupBy])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleClientChange = useCallback((cid: string) => {
    setClientId(cid); setProjectId('')
    if (cid) {
      const r = clientRates.find(cr => cr.client_id === cid)
      if (r) { setRate(String(r.hourly_rate)); setCurrency(r.currency) }
      else setRate(settings?.default_rate ? String(settings.default_rate) : '')
    } else {
      setRate(settings?.default_rate ? String(settings.default_rate) : '')
    }
  }, [clientRates, settings])

  async function handleStart() {
    const startedAt = new Date().toISOString()
    startTransition(async () => {
      const fd = new FormData()
      fd.set('description', desc); fd.set('project_id', projectId)
      fd.set('client_id', clientId); fd.set('hourly_rate', rate || '0')
      fd.set('currency', currency); fd.set('is_billable', String(isBillable))
      selTags.forEach(t => fd.append('tag_ids', t))
      const res = await startTimerAction(fd)
      if (!res?.error && res?.id) {
        // Folosim ID-ul REAL returnat de server — Stop va funcționa din prima
        const real: TimeEntry = {
          id: res.id, user_id: '', project_id: projectId||null, client_id: clientId||null,
          description: desc||null, started_at: startedAt, ended_at: null,
          duration_minutes: null, hourly_rate: parseFloat(rate)||0, currency, is_billable: isBillable,
          is_invoiced: false, tag_ids: selTags, created_at: startedAt, updated_at: startedAt,
        }
        setRunning(real); setDesc(''); setSelTags([])
      }
    })
  }

  async function handleStop() {
    if (!running) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', running.id); fd.set('started_at', running.started_at)
      const res = await stopTimerAction(fd)
      if (!res?.error) {
        // Adăugăm intrarea finalizată în lista locală fără reload
        const durationMinutes = Math.round((Date.now() - new Date(running.started_at).getTime()) / 60000)
        const finished: TimeEntry = { ...running, ended_at: new Date().toISOString(), duration_minutes: durationMinutes }
        setEntries(prev => [finished, ...prev.filter(e => e.id !== running.id)])
        setRunning(null)
      }
    })
  }

  async function handleResume(entry: TimeEntry) {
    const startedAt = new Date().toISOString()
    const fd = new FormData()
    fd.set('description', entry.description ?? ''); fd.set('project_id', entry.project_id ?? '')
    fd.set('client_id', entry.client_id ?? ''); fd.set('hourly_rate', String(entry.hourly_rate || 0))
    fd.set('currency', entry.currency); fd.set('is_billable', String(entry.is_billable))
    ;(entry.tag_ids ?? []).forEach(t => fd.append('tag_ids', t))
    startTransition(async () => {
      const res = await startTimerAction(fd)
      if (!res?.error && res?.id) {
        setDesc(entry.description ?? ''); setClientId(entry.client_id ?? '')
        setProjectId(entry.project_id ?? ''); setRate(String(entry.hourly_rate || ''))
        setCurrency(entry.currency); setSelTags(entry.tag_ids ?? []); setIsBillable(entry.is_billable)
        const real: TimeEntry = {
          id: res.id, user_id: '', project_id: entry.project_id, client_id: entry.client_id,
          description: entry.description, started_at: startedAt, ended_at: null,
          duration_minutes: null, hourly_rate: entry.hourly_rate, currency: entry.currency,
          is_billable: entry.is_billable, is_invoiced: false, tag_ids: entry.tag_ids ?? [],
          created_at: startedAt, updated_at: startedAt,
        }
        setRunning(real)
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi această înregistrare?')) return
    startTransition(async () => {
      const fd = new FormData(); fd.set('id', id)
      await deleteTimeEntryAction(fd)
      setEntries(prev => prev.filter(e => e.id !== id))
    })
  }

  async function handleUpdate(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    startTransition(async () => {
      const res = await updateTimeEntryAction(fd)
      if (!res?.error) { setEditingId(null); window.location.reload() }
    })
  }

  async function handleManualSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    manualSelTags.forEach(t => fd.append('tag_ids', t))
    const res = await createTimeEntryAction(undefined, fd)
    if (res?.error) setManualErr(res.error)
    else { setShowManual(false); window.location.reload() }
  }

  // ── Period Selector ───────────────────────────────────────────────────────

  const PeriodBar = () => (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map(pk => (
          <button key={pk} onClick={() => setPeriod(pk)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap ${period === pk ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {PERIOD_LABELS[pk]}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-slate-400 text-xs">→</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pontaj</h1>
          <p className="text-slate-500 text-sm mt-0.5">Urmărește orele lucrate și generează facturi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(periodEntries, tagMap, PERIOD_LABELS[period])}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button onClick={() => { setShowManual(v => !v); setTab('timer') }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adaugă manual
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {(['timer','analytics','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'timer' ? 'Timer' : t === 'analytics' ? 'Rapoarte' : 'Setări'}
          </button>
        ))}
      </div>

      {/* Period bar — shared for Timer + Rapoarte */}
      {tab !== 'settings' && <PeriodBar />}

      {/* ─── TIMER TAB ─────────────────────────────────────────────────── */}
      {tab === 'timer' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard label="Total ore" value={fmtDuration(stats.totalMins)} sub={`${stats.activeDays} zile active`} />
            <StatCard label="Ore facturabile" value={fmtDuration(stats.billMins)} accent="text-indigo-600" sub={`${stats.billRatio.toFixed(0)}% din total`} />
            <StatCard label="Venit estimat" value={fmtMoney(stats.billValue, settings?.default_currency ?? 'RON')} accent="text-emerald-600" />
            <StatCard label="Medie / zi activă" value={fmtDuration(Math.round(stats.avgMins))} sub="pe zilele cu pontaj" />
          </div>

          {/* Running timer */}
          <div className={`mb-5 rounded-xl border-2 p-5 ${running ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
            {running ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-3xl font-mono font-bold text-indigo-700 tabular-nums">{elapsed}</p>
                    {/* Descriere */}
                    {running.description && (
                      <p className="text-sm font-semibold text-indigo-800 mt-1 truncate">{running.description}</p>
                    )}
                    {/* Client › Proiect */}
                    {(running.client_id || running.project_id) && (
                      <p className="text-xs text-indigo-500 mt-0.5 flex items-center gap-1 truncate">
                        {running.client_id && (
                          <span>{clients.find(c => c.id === running.client_id)?.name ?? ''}</span>
                        )}
                        {running.client_id && running.project_id && <span>›</span>}
                        {running.project_id && (
                          <span>{projects.find(p => p.id === running.project_id)?.name ?? ''}</span>
                        )}
                      </p>
                    )}
                    {/* Taguri */}
                    {(running.tag_ids ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(running.tag_ids ?? []).map(tid => {
                          const t = tagMap[tid]; if (!t) return null
                          return (
                            <span key={tid}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: t.color }}>
                              {t.name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {/* Tarif */}
                    {running.hourly_rate > 0 && (
                      <p className="text-[11px] text-indigo-400 mt-1">
                        {running.hourly_rate} {running.currency}/h
                        {' · '}
                        {fmtMoney(
                          Math.round((Date.now() - new Date(running.started_at).getTime()) / 60000) / 60 * running.hourly_rate,
                          running.currency
                        )} acumulat
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={handleStop} disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <input value={desc} onChange={e => setDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
                    placeholder="Ce lucrezi acum?"
                    className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={handleStart} disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Start
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={clientId} onChange={e => handleClientChange(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Proiect</option>
                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input type="text" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="Tarif/h"
                      className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <select value={currency} onChange={e => setCurrency(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {['RON','EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setIsBillable(v => !v)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${isBillable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                    {isBillable ? '$ Billable' : '$ Non-bill.'}
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => <TagPill key={t.id} tag={t} selected={selTags.includes(t.id)} onClick={() => setSelTags(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} />)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual entry */}
          {showManual && (
            <div className="mb-5 bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Adaugă intrare manuală</h2>
              {manualErr && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{manualErr}</div>}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Start *</label>
                    <input name="started_at" type="datetime-local" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Stop</label>
                    <input name="ended_at" type="datetime-local" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                </div>
                <input name="description" type="text" placeholder="Descriere activitate"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
                    <select name="client_id" value={manualClientId} onChange={e => { setManualClientId(e.target.value); const r = clientRates.find(cr => cr.client_id === e.target.value); if (r) { setManualRate(String(r.hourly_rate)); setManualCurrency(r.currency) } }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Fără client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Proiect</label>
                    <select name="project_id" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">— Fără proiect —</option>
                      {(manualClientId ? projects.filter(p => p.client_id === manualClientId) : projects).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tarif/h</label>
                    <input name="hourly_rate" type="text" inputMode="decimal" value={manualRate} onChange={e => setManualRate(e.target.value)} placeholder="0"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Monedă</label>
                    <select name="currency" value={manualCurrency} onChange={e => setManualCurrency(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {['RON','EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                {tags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Tag-uri</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(t => <TagPill key={t.id} tag={t} selected={manualSelTags.includes(t.id)} onClick={() => setManualSelTags(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} />)}
                    </div>
                  </div>
                )}
                <input type="hidden" name="is_billable" value="true" />
                <div className="flex gap-3">
                  <button type="submit" disabled={isPending} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60">Salvează</button>
                  <button type="button" onClick={() => setShowManual(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Anulează</button>
                </div>
              </form>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className="relative flex-1 min-w-44">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Caută descriere..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setFilterProject('') }}
              className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filterClient ? 'border-indigo-400 text-indigo-700' : 'border-slate-200'}`}>
              <option value="">Toți clienții</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filterProject ? 'border-indigo-400 text-indigo-700' : 'border-slate-200'}`}>
              <option value="">Toate proiectele</option>
              {(filterClient ? projects.filter(p => p.client_id === filterClient) : projects).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {tags.length > 0 && (
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filterTag ? 'border-indigo-400 text-indigo-700' : 'border-slate-200'}`}>
                <option value="">Toate tag-urile</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <select value={filterBillable} onChange={e => setFilterBillable(e.target.value as 'all'|'yes'|'no')}
              className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filterBillable !== 'all' ? 'border-indigo-400 text-indigo-700' : 'border-slate-200'}`}>
              <option value="all">Facturabil: Toate</option>
              <option value="yes">Facturabile</option>
              <option value="no">Non-facturabile</option>
            </select>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as 'day'|'client'|'project')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="day">Grupare: Zi</option>
              <option value="client">Grupare: Client</option>
              <option value="project">Grupare: Proiect</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterSearch(''); setFilterClient(''); setFilterProject(''); setFilterTag(''); setFilterBillable('all') }}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition">
                Reset ({activeFilters})
              </button>
            )}
          </div>

          {/* Entries list */}
          {filteredEntries.length === 0 && !running ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Nicio înregistrare</h2>
              <p className="text-slate-500 text-sm">{activeFilters > 0 ? 'Niciun rezultat pentru filtrele selectate.' : 'Pornește timerul sau adaugă manual primele ore.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([groupLabel, groupEntries]) => {
                const groupMins  = groupEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0)
                const groupValue = groupEntries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes ?? 0) / 60 * e.hourly_rate, 0)
                return (
                  <div key={groupLabel}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-600 capitalize">{groupLabel}</h3>
                      <div className="flex items-center gap-3">
                        {groupValue > 0 && <span className="text-xs text-indigo-600 font-medium">{fmtMoney(groupValue, settings?.default_currency ?? 'RON')}</span>}
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{fmtDuration(groupMins)}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {groupEntries.map(entry => {
                        if (editingId === entry.id) {
                          return (
                            <EditEntryRow key={entry.id} entry={entry} clients={clients} projects={projects}
                              tags={tags} onSave={handleUpdate} onCancel={() => setEditingId(null)} isPending={isPending} />
                          )
                        }
                        const entryTags = (entry.tag_ids ?? []).map(id => tagMap[id]).filter(Boolean)
                        const client    = entry.client  as { name: string } | null
                        const proj      = entry.project as { name: string } | null
                        const value     = (entry.duration_minutes ?? 0) / 60 * entry.hourly_rate
                        return (
                          <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-50 transition">
                            <div className={`w-1 h-10 rounded-full shrink-0 ${entry.is_billable ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-slate-800">
                                  {entry.description ?? <span className="text-slate-400 italic">fără descriere</span>}
                                </span>
                                {entryTags.map(t => (
                                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.color }}>{t.name}</span>
                                ))}
                                {entry.is_invoiced && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">Facturat</span>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                                {client && <span>{client.name}</span>}
                                {client && proj && <span>›</span>}
                                {proj && <span>{proj.name}</span>}
                                {entry.hourly_rate > 0 && <><span>·</span><span>{entry.hourly_rate} {entry.currency}/h</span></>}
                                <span>·</span>
                                <span>{new Date(entry.started_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                                {entry.ended_at && (
                                  <><span>→</span><span>{new Date(entry.ended_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span></>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold text-slate-700 tabular-nums">{fmtDuration(entry.duration_minutes)}</div>
                              {value > 0 && <div className="text-xs text-indigo-600">{fmtMoney(value, entry.currency)}</div>}
                            </div>
                            {/* Actions */}
                            <button onClick={() => handleResume(entry)} disabled={isPending || !!running} title="Reia contorizarea"
                              className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </button>
                            <button onClick={() => setEditingId(entry.id)} title="Editează"
                              className="w-8 h-8 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition shrink-0 opacity-0 group-hover:opacity-100">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(entry.id)} title="Șterge"
                              className="w-8 h-8 rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition shrink-0 opacity-0 group-hover:opacity-100">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── ANALYTICS TAB ─────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Filtru client + butoane */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={analyticsClientId}
              onChange={e => setAnalyticsClientId(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${analyticsClientId ? 'border-indigo-400 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'}`}
            >
              <option value="">Toți clienții</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {analyticsClientId && (
              <button onClick={() => setAnalyticsClientId('')}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition">
                × Resetează
              </button>
            )}

            {/* Client color legend */}
            {analytics.byClient.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {analytics.byClient.slice(0, 5).map((c, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CLIENT_PALETTE[i % CLIENT_PALETTE.length] }} />
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Share Report */}
              {shareUrl ? (
                <div className="flex items-center gap-2">
                  <input
                    readOnly value={shareUrl}
                    onClick={e => (e.target as HTMLInputElement).select()}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 w-64 focus:outline-none"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); setShareUrl(null) }}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    Copiază
                  </button>
                  <button onClick={() => setShareUrl(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
              ) : (
                <button
                  disabled={shareLoading}
                  onClick={async () => {
                    setShareLoading(true)
                    const res = await createReportShareAction({
                      periodLabel: PERIOD_LABELS[period],
                      clientName: analyticsClientId ? (clients.find(c => c.id === analyticsClientId)?.name ?? null) : null,
                      data: {
                        stats: analyticsStats,
                        byClient: analytics.byClient,
                        byProject: analytics.byProject,
                        entries: analyticsEntries,
                        defaultCurrency: settings?.default_currency ?? 'RON',
                      },
                    })
                    setShareLoading(false)
                    if (res.token) {
                      const url = `${window.location.origin}/report/${res.token}`
                      setShareUrl(url)
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition disabled:opacity-50"
                >
                  {shareLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  )}
                  Share Raport
                </button>
              )}

              {/* Export PDF */}
              <button
                onClick={() => exportPDF({
                  entries: analyticsEntries,
                  periodLabel: PERIOD_LABELS[period],
                  clientName: analyticsClientId ? (clients.find(c => c.id === analyticsClientId)?.name ?? null) : null,
                  stats: analyticsStats,
                  byClient: analytics.byClient,
                  byProject: analytics.byProject,
                  defaultCurrency: settings?.default_currency ?? 'RON',
                })}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total ore" value={fmtDuration(analyticsStats.totalMins)} sub={`${analyticsStats.activeDays} zile active`} />
            <StatCard label="Ore facturabile" value={fmtDuration(analyticsStats.billMins)} accent="text-indigo-600" sub={`${analyticsStats.billRatio.toFixed(0)}% din total`} />
            <StatCard label="Venit estimat" value={fmtMoney(analyticsStats.billValue, settings?.default_currency ?? 'RON')} accent="text-emerald-600" />
            <StatCard label="Medie / zi activă" value={fmtDuration(Math.round(analyticsStats.avgMins))} />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Ore lucrate {analytics.chart.isWeekly ? 'pe săptămână' : 'pe zi'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {analytics.chart.isWeekly ? 'Grupare săptămânală pentru perioade lungi' : `${analytics.chart.buckets.length} zile`}
                </p>
              </div>
              {analytics.byClient.length > 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {analytics.byClient.slice(0, 5).map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: CLIENT_PALETTE[i % CLIENT_PALETTE.length] }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Facturabile
                  </span>
                </div>
              )}
            </div>
            <BarChart
              buckets={analytics.chart.buckets}
              isWeekly={analytics.chart.isWeekly}
              clientColorMap={analytics.clientColorMap}
            />
          </div>

          {/* Billable ratio */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Rată de facturare</h2>
              <span className="text-sm font-bold text-indigo-600">{analyticsStats.billRatio.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${analyticsStats.billRatio}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span className="text-indigo-600 font-medium">{fmtDuration(analyticsStats.billMins)} facturabile</span>
              <span>{fmtDuration(analyticsStats.totalMins - analyticsStats.billMins)} non-facturabile</span>
            </div>
          </div>

          {/* Per client */}
          {analytics.byClient.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Per client</h2>
              <div className="space-y-4">
                {analytics.byClient.map((c, i) => {
                  const clientId = analytics.byClientKeys[i]
                  const color    = analytics.clientColorMap[clientId] ?? CLIENT_PALETTE[i % CLIENT_PALETTE.length]
                  const pct      = analyticsStats.totalMins > 0 ? (c.mins / analyticsStats.totalMins) * 100 : 0
                  const billPct  = c.mins > 0 ? (c.billMins / c.mins) * 100 : 0
                  const maxMins  = Math.max(...analytics.byClient.map(x => x.mins), 1)
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          type="button"
                          onClick={() => setAnalyticsClientId(prev => prev === clientId ? '' : clientId)}
                          className="flex items-center gap-2 text-sm text-slate-800 font-medium hover:text-indigo-600 transition text-left"
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {c.name}
                        </button>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="hidden sm:inline">{billPct.toFixed(0)}% facturabil</span>
                          <span className="font-medium tabular-nums">{fmtDuration(c.mins)}</span>
                          {c.value > 0 && <span className="font-semibold" style={{ color }}>{fmtMoney(c.value, settings?.default_currency ?? 'RON')}</span>}
                          <span className="w-8 text-right text-slate-400">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(c.mins / maxMins) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Per project */}
          {analytics.byProject.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Per proiect</h2>
              <div className="space-y-4">
                {analytics.byProject.map((p, i) => {
                  const pct = analyticsStats.totalMins > 0 ? (p.mins / analyticsStats.totalMins) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm text-slate-800 font-medium">{p.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{p.clientName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="font-medium tabular-nums">{fmtDuration(p.mins)}</span>
                          {p.value > 0 && <span className="text-violet-600 font-semibold">{fmtMoney(p.value, settings?.default_currency ?? 'RON')}</span>}
                          <span className="w-8 text-right text-slate-400">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Per tag */}
          {analytics.byTag.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Per tag</h2>
              <div className="flex flex-wrap gap-2">
                {analytics.byTag.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: t.color }}>
                    {t.name}
                    <span className="opacity-75 text-xs bg-black/10 px-1.5 py-0.5 rounded-full">{fmtDuration(t.mins)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyticsEntries.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
              <p className="text-slate-400 text-sm">
                {analyticsClientId ? 'Nicio activitate pentru clientul selectat în această perioadă.' : 'Nicio activitate în perioada selectată.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── SETTINGS TAB ─────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <TimeSettingsPanel
          clients={clients} tags={tags} clientRates={clientRates} settings={settings}
          onTagsChange={setTags} onRatesChange={setClientRates}
        />
      )}
    </div>
  )
}

// ─── Settings Panel ────────────────────────────────────────────────────────

function TimeSettingsPanel({
  clients, tags, clientRates, settings, onTagsChange, onRatesChange,
}: {
  clients: ClientOption[]; tags: TimeTag[]; clientRates: ClientRate[]
  settings: TimeSettings | null
  onTagsChange: (t: TimeTag[]) => void; onRatesChange: (r: ClientRate[]) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg]                = useState<string | null>(null)
  const [defaultRate, setDefaultRate]         = useState(settings?.default_rate ? String(settings.default_rate) : '')
  const [defaultCurrency, setDefaultCurrency] = useState(settings?.default_currency ?? 'RON')

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('default_rate', defaultRate); fd.set('default_currency', defaultCurrency)
    startTransition(async () => {
      const res = await saveTimeSettingsAction(fd)
      if (res?.message) setMsg(res.message)
    })
  }

  const [rateStates, setRateStates] = useState<Record<string, { rate: string; currency: string }>>(() => {
    const m: Record<string, { rate: string; currency: string }> = {}
    for (const r of clientRates) m[r.client_id] = { rate: String(r.hourly_rate), currency: r.currency }
    return m
  })

  async function handleSaveClientRate(clientId: string) {
    const s = rateStates[clientId] ?? { rate: '0', currency: 'RON' }
    const fd = new FormData()
    fd.set('client_id', clientId); fd.set('hourly_rate', s.rate); fd.set('currency', s.currency)
    startTransition(async () => {
      const res = await saveClientRateAction(fd)
      if (res?.message) {
        setMsg(res.message)
        onRatesChange([...clientRates.filter(r => r.client_id !== clientId), {
          id: '', user_id: '', client_id: clientId,
          hourly_rate: parseFloat(s.rate) || 0, currency: s.currency, created_at: '',
        }])
      }
    })
  }

  const [newTagName, setNewTagName]   = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const TAG_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#64748b','#06b6d4','#f97316']

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) return
    const fd = new FormData()
    fd.set('name', newTagName.trim()); fd.set('color', newTagColor)
    startTransition(async () => {
      const res = await createTagAction(fd)
      if (res?.message) {
        setMsg(res.message); setNewTagName('')
        const fakeTag: TimeTag = { id: Date.now().toString(), user_id: '', name: newTagName.trim(), color: newTagColor, created_at: '' }
        onTagsChange([...tags, fakeTag])
      }
    })
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('Ștergi tag-ul?')) return
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => {
      await deleteTagAction(fd)
      onTagsChange(tags.filter(t => t.id !== id))
    })
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {msg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {msg}
        </div>
      )}

      {/* Default rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Tarif implicit</h2>
        <p className="text-xs text-slate-400 mb-4">Aplicat când nu e setat un tarif per client.</p>
        <form onSubmit={handleSaveSettings}>
          <div className="flex items-center gap-3">
            <input type="text" inputMode="decimal" value={defaultRate} onChange={e => setDefaultRate(e.target.value)} placeholder="ex: 100"
              className="w-32 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)}
              className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['RON','EUR','USD','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="text-sm text-slate-500">/ oră</span>
            <button type="submit" disabled={isPending}
              className="ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60">
              Salvează
            </button>
          </div>
        </form>
      </div>

      {/* Per client rates */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Tarife per client</h2>
        <p className="text-xs text-slate-400 mb-4">Se auto-completează la selectarea clientului în timer.</p>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nu ai clienți adăugați încă.</p>
        ) : (
          <div className="space-y-3">
            {clients.map(c => {
              const s = rateStates[c.id] ?? { rate: '', currency: defaultCurrency }
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">{c.name[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{c.name}</span>
                  <input type="text" inputMode="decimal" value={s.rate}
                    onChange={e => setRateStates(prev => ({ ...prev, [c.id]: { ...prev[c.id] ?? { currency: 'RON' }, rate: e.target.value } }))}
                    placeholder="Tarif/h"
                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <select value={s.currency ?? defaultCurrency}
                    onChange={e => setRateStates(prev => ({ ...prev, [c.id]: { ...prev[c.id] ?? { rate: '0' }, currency: e.target.value } }))}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['RON','EUR','USD','GBP'].map(cur => <option key={cur}>{cur}</option>)}
                  </select>
                  <button onClick={() => handleSaveClientRate(c.id)} disabled={isPending}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-60">
                    Salvează
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Tag-uri</h2>
        <p className="text-xs text-slate-400 mb-4">Etichetează înregistrările pentru rapoarte și filtrare.</p>
        <form onSubmit={handleAddTag} className="flex items-center gap-3 mb-5">
          <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nume tag (ex: Design, Dev, Meeting)"
            className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex items-center gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setNewTagColor(c)}
                className={`w-6 h-6 rounded-full transition ${newTagColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <button type="submit" disabled={isPending || !newTagName.trim()}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 shrink-0">
            Adaugă
          </button>
        </form>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Niciun tag creat.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <div key={t.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: t.color }}>
                {t.name}
                <button onClick={() => handleDeleteTag(t.id)} className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
