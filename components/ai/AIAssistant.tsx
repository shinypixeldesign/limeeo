'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DBMessage {
  id: string
  role: string
  content: string
  context_type: string
  created_at: string
}

interface Session {
  id: string
  date: Date
  preview: string
  isBriefing: boolean
  messageCount: number
  messages: Message[]
}

interface AIAssistantProps {
  plan: string
  hasAccess: boolean
  remaining: number
  limit: number
  dbMessages: DBMessage[]
}

// ── Quick actions ──────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: '📧',
    label: 'Follow-up email',
    prompt: 'Scrie un email de follow-up profesional pentru un client care nu a răspuns de o săptămână la oferta trimisă. Tonul să fie cald, dar să creeze un sentiment de urgență subtil.',
  },
  {
    icon: '💰',
    label: 'Recuperare creanță',
    prompt: 'Scrie un mesaj diplomatic dar ferm pentru recuperarea unei creanțe restante de 30 de zile. Clientul a primit lucrarea și e mulțumit, dar întârzie cu plata.',
  },
  {
    icon: '📋',
    label: 'Propunere proiect',
    prompt: 'Ajută-mă să redactez o propunere comercială convingătoare pentru un proiect nou. Include: rezumat executiv, ce oferi tu specific, valoarea pentru client, pași următori și CTA.',
  },
  {
    icon: '💼',
    label: 'Calcul tarif',
    prompt: 'Cum îmi calculez corect tariful orar ca freelancer român? Ia în calcul: cheltuieli lunare, zile lucrătoare efective, impozite (PFA/SRL), concediu și marja de profit dorită.',
  },
  {
    icon: '📱',
    label: 'Post LinkedIn',
    prompt: 'Scrie un post LinkedIn autentic și captivant pentru un freelancer care vrea să atragă clienți noi. Include un insight din practica reală, un hook puternic și CTA natural.',
  },
  {
    icon: '😤',
    label: 'Răspuns nemulțumire',
    prompt: 'Un client nu e mulțumit de livrabil și e agresiv în ton. Ajută-mă să redactez un răspuns empatic, profesional, care dezamorsează situația și propune o soluție concretă.',
  },
  {
    icon: '📄',
    label: 'Clauze contract',
    prompt: 'Ce clauze esențiale trebuie să includă un contract de prestări servicii pentru un freelancer român? Include: plată, livrabile, drepturi IP, limitare răspundere, clauze de reziliere.',
  },
  {
    icon: '🎯',
    label: 'Pitch 30 secunde',
    prompt: 'Ajută-mă să creez un pitch de 30 de secunde (elevator pitch) pentru serviciile mele de freelancing. Trebuie să fie memorabil, clar și să atragă exact clienții potriviți.',
  },
]

// ── Session grouping ───────────────────────────────────────────────────────────

function groupIntoSessions(dbMessages: DBMessage[]): Session[] {
  if (dbMessages.length === 0) return []

  const valid = dbMessages.filter(m => m.role === 'user' || m.role === 'assistant')
  if (valid.length === 0) return []

  const groups: DBMessage[][] = []
  let current: DBMessage[] = [valid[0]]

  for (let i = 1; i < valid.length; i++) {
    const prevMs = new Date(valid[i - 1].created_at).getTime()
    const currMs = new Date(valid[i].created_at).getTime()
    if (currMs - prevMs > 3 * 60 * 60 * 1000) {
      groups.push(current)
      current = [valid[i]]
    } else {
      current.push(valid[i])
    }
  }
  groups.push(current)

  return groups.reverse().map(msgs => {
    const firstUser = msgs.find(m => m.role === 'user')
    const isBriefing = firstUser?.content === 'Generează briefing zilnic'
    const raw = isBriefing ? 'Briefing zilnic' : (firstUser?.content ?? 'Conversație')
    const preview = raw.length > 52 ? raw.slice(0, 50) + '…' : raw

    return {
      id: msgs[0].id,
      date: new Date(msgs[0].created_at),
      preview,
      isBriefing,
      messageCount: msgs.length,
      messages: msgs.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }
  })
}

function sessionDateLabel(date: Date): string {
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Azi'
  if (diffDays === 1) return 'Ieri'
  if (diffDays < 7) return date.toLocaleDateString('ro-RO', { weekday: 'long' })
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-p:leading-relaxed prose-ul:my-1 prose-li:my-0">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copiază răspunsul"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AIAssistant({ plan, hasAccess, remaining, limit, dbMessages }: AIAssistantProps) {
  const sessions = useMemo(() => groupIntoSessions(dbMessages), [dbMessages])

  const todaySession = sessions.find(s => sessionDateLabel(s.date) === 'Azi')

  const [messages, setMessages] = useState<Message[]>(todaySession?.messages ?? [])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(todaySession?.id ?? null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isUnlimited = limit === -1
  const [localRemaining, setLocalRemaining] = useState(remaining)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function loadSession(session: Session) {
    setMessages(session.messages)
    setActiveSessionId(session.id)
    setError(null)
  }

  function newConversation() {
    setMessages([])
    setActiveSessionId(null)
    setError(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function generateBriefing() {
    setError(null)
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/ai/briefing', { method: 'POST' })
      let data: { error?: string; content?: string; messagesUsed?: number; limit?: number }
      try { data = await res.json() }
      catch { setError(`Răspuns invalid (status ${res.status}).`); return }
      if (!res.ok) { setError(data.error ?? 'Eroare necunoscută.'); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? '' }])
      setActiveSessionId(null)
      if (!isUnlimited && data.limit !== undefined && data.messagesUsed !== undefined) {
        setLocalRemaining(data.limit - data.messagesUsed)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare de rețea.')
    } finally {
      setBriefingLoading(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      })
      let data: { error?: string; content?: string; messagesUsed?: number; limit?: number }
      try { data = await res.json() }
      catch { setError(`Răspuns invalid (status ${res.status}).`); return }
      if (!res.ok) { setError(data.error ?? 'Eroare necunoscută.'); return }
      setMessages([...newMessages, { role: 'assistant', content: data.content ?? '' }])
      if (!isUnlimited && data.limit !== undefined && data.messagesUsed !== undefined) {
        setLocalRemaining(data.limit - data.messagesUsed)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare conexiune.')
    } finally {
      setLoading(false)
    }
  }

  // ── Upgrade wall ─────────────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Assistant</h2>
        <p className="text-slate-500 max-w-md mb-2">
          Briefing zilnic, redactare mesaje profesionale, analiză business și chat liber cu Claude.
        </p>
        <p className="text-sm text-slate-400 mb-8">Disponibil din planul <strong className="text-slate-600">Solo</strong> (€9/lună)</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {[
            { plan: 'Solo', price: '€9/lună', features: ['100 mesaje AI/lună', 'Briefing zilnic', 'Redactare mesaje', 'Clienți nelimitați'] },
            { plan: 'Pro', price: '€19/lună', features: ['Mesaje nelimitate', 'Analiză lunară', 'Template-uri avansate', 'Export date'] },
          ].map(p => (
            <div key={p.plan} className="bg-white rounded-xl border border-slate-200 p-6 text-left w-64">
              <p className="font-bold text-slate-900">{p.plan}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1 mb-4">{p.price}</p>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/upgrade" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          Fă upgrade acum
        </Link>
      </div>
    )
  }

  // ── Sidebar session groups ────────────────────────────────────────────────────

  const sessionsByDate = useMemo(() => {
    const groups = new Map<string, Session[]>()
    for (const s of sessions) {
      const label = sessionDateLabel(s.date)
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label)!.push(s)
    }
    return groups
  }, [sessions])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className={`hidden md:flex flex-col border-r border-slate-200 bg-slate-50 shrink-0 transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={newConversation}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Conversație nouă
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-5">
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10 px-3">
              Nicio conversație anterioară. Începe una acum!
            </p>
          ) : (
            Array.from(sessionsByDate.entries()).map(([dateLabel, sessList]) => (
              <div key={dateLabel}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">
                  {dateLabel}
                </p>
                <div className="space-y-0.5">
                  {sessList.map(session => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition ${
                        activeSessionId === session.id
                          ? 'bg-violet-100 text-violet-800'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm leading-none">{session.isBriefing ? '✨' : '💬'}</span>
                        <span className="text-[10px] text-slate-400">
                          {session.date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{Math.ceil(session.messageCount / 2)} schimburi
                        </span>
                      </div>
                      <p className="text-xs leading-snug truncate">{session.preview}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title={sidebarOpen ? 'Ascunde istoricul' : 'Arată istoricul'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">AI Assistant</h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                <span className="capitalize font-medium text-slate-700">{plan}</span>
                {isUnlimited
                  ? <span className="ml-1.5 text-violet-600 font-medium">· mesaje nelimitate</span>
                  : (
                    <span className={`ml-1.5 ${localRemaining <= 10 ? 'text-amber-600 font-semibold' : ''}`}>
                      · {localRemaining} din {limit} rămase
                    </span>
                  )
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={newConversation}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Conversație nouă
              </button>
            )}
            <button
              onClick={generateBriefing}
              disabled={briefingLoading || (!isUnlimited && localRemaining === 0)}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {briefingLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="hidden sm:inline">Generez…</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.95 5.05l-.707.707" />
                  </svg>
                  <span>Briefing zilnic</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-slate-50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-full text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 text-lg mb-1">Bună! Sunt asistentul tău AI.</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-8">
                Generează un briefing zilnic cu datele din contul tău, sau alege una din acțiunile rapide de mai jos.
              </p>

              {/* Quick actions grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl w-full text-left mb-6">
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => {
                      setInput(qa.prompt)
                      setTimeout(() => textareaRef.current?.focus(), 50)
                    }}
                    className="flex flex-col gap-2 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition text-left group"
                  >
                    <span className="text-xl leading-none">{qa.icon}</span>
                    <span className="text-xs font-medium text-slate-700 group-hover:text-violet-700 leading-snug">
                      {qa.label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={generateBriefing}
                disabled={briefingLoading || (!isUnlimited && localRemaining === 0)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.02 12.02l.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.95 5.05l-.707.707" />
                </svg>
                {briefingLoading ? 'Generez briefing…' : 'Generează briefing zilnic'}
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mr-3 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              <div className={`relative max-w-2xl rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownMessage content={msg.content} />
                    <div className="flex justify-end mt-1.5 -mb-0.5">
                      <CopyButton text={msg.content} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick action chips (when conversation has messages) */}
        {messages.length > 0 && (
          <div className="px-5 pt-3 pb-1 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1.5" style={{ scrollbarWidth: 'none' }}>
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.label}
                  onClick={() => {
                    setInput(qa.prompt)
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition whitespace-nowrap"
                >
                  <span>{qa.icon}</span>
                  <span>{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white shrink-0">
          {!isUnlimited && localRemaining === 0 ? (
            <div className="text-center py-2">
              <p className="text-sm text-slate-500 mb-3">Ai epuizat mesajele AI pentru această lună.</p>
              <Link
                href="/upgrade"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition"
              >
                Fă upgrade la Pro — mesaje nelimitate
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
                placeholder="Scrie un mesaj… (Enter = trimite, Shift+Enter = linie nouă)"
                rows={1}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                style={{ minHeight: '44px', maxHeight: '140px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="rounded-xl bg-indigo-600 p-3 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
