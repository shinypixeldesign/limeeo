'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  gmailEmail: string | null
  outlookEmail: string | null
}

function GmailIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
    </svg>
  )
}

function OutlookIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#0078D4"/>
      <path d="M4 8l8 5 8-5v8.5c0 .828-.672 1.5-1.5 1.5h-13A1.5 1.5 0 014 16.5V8z" fill="white" fillOpacity=".9"/>
      <path d="M4 8l8 5 8-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

interface IntegrationCardProps {
  name: string
  icon: React.ReactNode
  connectedEmail: string | null
  connectHref: string
  disconnectAction: string
  description: string
}

function IntegrationCard({
  name,
  icon,
  connectedEmail,
  connectHref,
  disconnectAction,
  description,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false)

  async function handleDisconnect() {
    setLoading(true)
    await fetch(disconnectAction, { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            {connectedEmail && (
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Conectat ca: {connectedEmail}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {connectedEmail ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Conectat
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Se deconectează...' : 'Deconectează'}
              </button>
            </div>
          ) : (
            <a
              href={connectHref}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors inline-block"
            >
              Conectează
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailIntegrations({ gmailEmail, outlookEmail }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm text-amber-700 font-medium">Necesită configurare prealabilă</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Trebuie să creezi aplicații OAuth în Google Cloud Console / Azure AD și să adaugi credențialele în .env.local.{' '}
            <Link href="/settings/setup-guide" className="underline font-medium">
              Vezi instrucțiunile complete
            </Link>
          </p>
        </div>
      </div>

      <IntegrationCard
        name="Gmail"
        icon={<GmailIcon />}
        connectedEmail={gmailEmail}
        connectHref="/api/auth/gmail/connect"
        disconnectAction="/api/auth/gmail/disconnect"
        description="Trimite emailuri din contul tău Gmail personal sau de business."
      />

      <IntegrationCard
        name="Outlook / Microsoft 365"
        icon={<OutlookIcon />}
        connectedEmail={outlookEmail}
        connectHref="/api/auth/outlook/connect"
        disconnectAction="/api/auth/outlook/disconnect"
        description="Trimite emailuri din contul tău Outlook sau Microsoft 365."
      />
    </div>
  )
}
