'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Search, LayoutGrid, List, MoreVertical } from 'lucide-react'
import type { Client } from '@/types/database'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-blue-200 to-blue-300',
  'from-purple-200 to-purple-300',
  'from-green-200 to-green-300',
  'from-orange-200 to-orange-300',
  'from-pink-200 to-pink-300',
  'from-teal-200 to-teal-300',
  'from-yellow-200 to-yellow-300',
  'from-red-200 to-red-300',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function statusCfg(status: Client['status']) {
  const map = {
    active:   { label: 'Activ',    cls: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
    prospect: { label: 'Prospect', cls: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
    inactive: { label: 'Inactiv',  cls: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400'  },
  }
  return map[status] ?? map.active
}

function healthColor(score: number) {
  if (score >= 80) return 'from-[#acff55] to-green-500'
  if (score >= 60) return 'from-yellow-400 to-orange-400'
  return 'from-orange-500 to-red-500'
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function DonutChart({ value }: { value: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="-rotate-90 w-20 h-20">
        <circle cx="40" cy="40" r={r} stroke="#f3f4f6" strokeWidth="8" fill="none" />
        <circle
          cx="40" cy="40" r={r}
          stroke="#acff55" strokeWidth="8" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{value}%</span>
      </div>
    </div>
  )
}

// ─── Card client (grid) ───────────────────────────────────────────────────────

function ClientCard({ client }: { client: Client }) {
  const st = statusCfg(client.status)
  const color = avatarColor(client.name)
  const score = client.health_score ?? 0

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/8 transition-all relative group">
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <MoreVertical size={15} className="text-gray-500" />
        </button>
      </div>

      <Link href={`/clients/${client.id}`} className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className={`w-20 h-20 rounded-[20px] bg-gradient-to-br ${color} flex items-center justify-center mb-4 overflow-hidden`}>
          {client.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo_url} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-2xl font-bold text-gray-700">{initials(client.name)}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-gray-900 text-base mb-2 truncate w-full">{client.name}</h3>
        {client.company && (
          <p className="text-xs text-gray-400 -mt-1.5 mb-2 truncate w-full">{client.company}</p>
        )}

        {/* Status */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-xs font-semibold ${st.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </div>

        {/* Health score */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Health Score</span>
            <span className="text-xs font-bold text-gray-900">{score}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${healthColor(score)} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── Row client (list) ────────────────────────────────────────────────────────

function ClientRow({ client }: { client: Client }) {
  const st = statusCfg(client.status)
  const color = avatarColor(client.name)
  const score = client.health_score ?? 0

  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
    >
      <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${color} flex items-center justify-center shrink-0 overflow-hidden`}>
        {client.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
        ) : (
          <span className="text-sm font-bold text-gray-700">{initials(client.name)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 truncate">{client.name}</p>
        <p className="text-xs text-gray-400 truncate">{client.company ?? client.email ?? ''}</p>
      </div>

      <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.cls} shrink-0`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
        {st.label}
      </div>

      <div className="hidden md:flex items-center gap-2 shrink-0 w-32">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${healthColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{score}%</span>
      </div>

      <span className="text-xs font-semibold text-gray-300 group-hover:text-gray-500 transition-colors shrink-0">
        →
      </span>
    </Link>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  clients: Client[]
  plan: string
}

export default function ClientsView({ clients, plan }: Props) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const atFreeLimit = plan === 'free' && clients.length >= 3

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(query.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const activeCount   = clients.filter(c => c.status === 'active').length
  const inactiveCount = clients.filter(c => c.status !== 'active').length
  const avgHealth = clients.length === 0
    ? 0
    : Math.round(clients.reduce((s, c) => s + (c.health_score ?? 0), 0) / clients.length)

  const healthLabel = avgHealth >= 80 ? 'Excelent' : avgHealth >= 60 ? 'Bun' : avgHealth >= 40 ? 'Mediu' : 'Slab'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clienți</h1>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Caută clienți..."
              className="pl-11 pr-4 py-2.5 w-72 border border-gray-200 rounded-full bg-white focus:border-[#acff55] focus:outline-none focus:ring-2 focus:ring-[#acff55]/20 transition-all shadow-sm text-sm font-medium"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white rounded-full border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-full transition-all ${view === 'grid' ? 'bg-[#acff55] text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-full transition-all ${view === 'list' ? 'bg-[#acff55] text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={17} />
            </button>
          </div>

          {/* Add button */}
          {atFreeLimit ? (
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-full transition-all shadow-lg shadow-amber-400/20 text-sm"
            >
              Upgrade la Solo
            </Link>
          ) : (
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#acff55] hover:bg-[#9fee44] text-black font-bold rounded-full transition-all shadow-lg shadow-[#acff55]/20 hover:shadow-xl hover:shadow-[#acff55]/30 text-sm"
            >
              <Plus size={18} />
              Adaugă client
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      {clients.length > 0 && (
        <div className="grid grid-cols-3 gap-5 mb-8">
          {/* Total */}
          <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total clienți</p>
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900">{clients.length}</p>
            {plan === 'free' && (
              <p className="text-xs text-amber-600 font-semibold mt-1">{clients.length}/3 plan Free</p>
            )}
          </div>

          {/* Status */}
          <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Status clienți</p>
            <div className="flex items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500">Activi</span>
                  <span className="text-lg font-bold text-green-600">{activeCount}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: clients.length ? `${(activeCount / clients.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500">Inactivi</span>
                  <span className="text-lg font-bold text-gray-400">{inactiveCount}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-300 rounded-full"
                    style={{ width: clients.length ? `${(inactiveCount / clients.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Avg health */}
          <div className="bg-white rounded-[24px] p-6 shadow-lg shadow-black/5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Health Score mediu</p>
            <div className="flex items-center gap-5">
              <DonutChart value={avgHealth} />
              <div>
                <p className="text-xl font-bold text-gray-900 mb-0.5">{healthLabel}</p>
                <p className="text-xs text-gray-400 font-medium">satisfacție generală</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="bg-white rounded-[28px] p-16 text-center shadow-lg shadow-black/5">
          <div className="w-16 h-16 rounded-[20px] bg-[#acff55]/20 flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Niciun client încă</h2>
          <p className="text-gray-400 text-sm mb-7 font-medium">Adaugă primul tău client pentru a începe.</p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#acff55] px-6 py-3 text-sm font-bold text-black hover:bg-[#9fee44] transition-all shadow-lg shadow-[#acff55]/30"
          >
            <Plus size={18} />
            Adaugă primul client
          </Link>
        </div>
      )}

      {/* No results for search */}
      {clients.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-[24px] p-12 text-center shadow-lg shadow-black/5">
          <p className="text-gray-400 font-medium">Niciun client găsit pentru &quot;{query}&quot;</p>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === 'list' && (
        <div className="bg-white rounded-[24px] overflow-hidden shadow-lg shadow-black/5">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-50">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Client</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest w-20 text-center">Status</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest w-32 text-center">Health</span>
            <span className="w-4" />
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(client => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
