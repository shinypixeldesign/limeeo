import Link from 'next/link'

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 pb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
        <div className="text-sm text-slate-600 space-y-2">{children}</div>
      </div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="block bg-slate-900 text-emerald-400 rounded-lg px-4 py-3 text-xs font-mono whitespace-pre-wrap">
      {children}
    </code>
  )
}

export default function SetupGuidePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Înapoi la Setări
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Ghid configurare integrări email</h1>
        <p className="text-sm text-slate-500 mt-1">
          Instrucțiuni pas-cu-pas pentru conectarea Gmail și Outlook.
        </p>
      </div>

      {/* ── GMAIL ── */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Gmail — Google Cloud Console</h2>
        </div>

        <div className="border-l-2 border-slate-200 ml-4 pl-2 space-y-0">
          <Step number={1} title="Creează un proiect în Google Cloud Console">
            <p>Mergi la <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">console.cloud.google.com</a> și creează un proiect nou (sau selectează unul existent).</p>
          </Step>

          <Step number={2} title="Activează Gmail API">
            <p>Mergi la <strong>APIs & Services → Library</strong> și caută <strong>Gmail API</strong>. Click <strong>Enable</strong>.</p>
          </Step>

          <Step number={3} title="Configurează OAuth Consent Screen">
            <p>Mergi la <strong>APIs & Services → OAuth consent screen</strong>.</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Selectează <strong>External</strong> (sau Internal dacă ai Google Workspace)</li>
              <li>Completează App name, User support email, Developer contact email</li>
              <li>La <strong>Scopes</strong>, adaugă: <code className="bg-slate-100 px-1 rounded text-xs">gmail.send</code>, <code className="bg-slate-100 px-1 rounded text-xs">userinfo.email</code>, <code className="bg-slate-100 px-1 rounded text-xs">userinfo.profile</code></li>
              <li>La <strong>Test users</strong>, adaugă email-ul tău</li>
            </ul>
          </Step>

          <Step number={4} title="Creează credențiale OAuth 2.0">
            <p>Mergi la <strong>APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID</strong>.</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Application type: <strong>Web application</strong></li>
              <li>Authorized redirect URIs — adaugă exact:</li>
            </ul>
            <CodeBlock>{`${appUrl}/api/auth/gmail/callback`}</CodeBlock>
          </Step>

          <Step number={5} title="Adaugă credențialele în .env.local">
            <CodeBlock>{`GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here`}</CodeBlock>
          </Step>
        </div>
      </section>

      {/* ── OUTLOOK ── */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="4" fill="#0078D4"/>
              <path d="M4 8l8 5 8-5v8.5c0 .828-.672 1.5-1.5 1.5h-13A1.5 1.5 0 014 16.5V8z" fill="white" fillOpacity=".9"/>
              <path d="M4 8l8 5 8-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Outlook — Azure AD (Microsoft Entra)</h2>
        </div>

        <div className="border-l-2 border-slate-200 ml-4 pl-2 space-y-0">
          <Step number={1} title="Mergi la Azure Portal">
            <p>Deschide <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">portal.azure.com</a> și autentifică-te cu contul Microsoft.</p>
          </Step>

          <Step number={2} title="Înregistrează o aplicație nouă">
            <p>Mergi la <strong>Microsoft Entra ID → App registrations → New registration</strong>.</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Name: orice (ex: Freelio)</li>
              <li>Supported account types: <strong>Accounts in any organizational directory and personal Microsoft accounts</strong></li>
              <li>Redirect URI (Web):</li>
            </ul>
            <CodeBlock>{`${appUrl}/api/auth/outlook/callback`}</CodeBlock>
          </Step>

          <Step number={3} title="Adaugă permisiunile necesare">
            <p>Mergi la <strong>API permissions → Add a permission → Microsoft Graph → Delegated permissions</strong> și adaugă:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><code className="bg-slate-100 px-1 rounded text-xs">Mail.Send</code></li>
              <li><code className="bg-slate-100 px-1 rounded text-xs">User.Read</code></li>
              <li><code className="bg-slate-100 px-1 rounded text-xs">offline_access</code></li>
            </ul>
          </Step>

          <Step number={4} title="Creează un Client Secret">
            <p>Mergi la <strong>Certificates & secrets → New client secret</strong>. Copiază valoarea imediat — nu va mai fi afișată.</p>
          </Step>

          <Step number={5} title="Adaugă credențialele în .env.local">
            <p>Găsești Application (client) ID și Directory (tenant) ID în Overview.</p>
            <CodeBlock>{`OUTLOOK_CLIENT_ID=your_application_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret_value
OUTLOOK_TENANT_ID=common`}</CodeBlock>
            <p className="text-xs text-slate-500 mt-1">
              Setează <code className="bg-slate-100 px-1 rounded">OUTLOOK_TENANT_ID=common</code> pentru conturi personale, sau ID-ul specific al tenant-ului dacă e un cont organizație.
            </p>
          </Step>
        </div>
      </section>

      {/* ENV summary */}
      <section className="bg-slate-900 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-3">Toate variabilele de environment necesare</h2>
        <CodeBlock>{`# Google / Gmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft / Outlook
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=common

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@domeniultau.ro

# Cron (securizează endpoint-ul)
CRON_SECRET=un_secret_random_lung

# Aplicație
NEXT_PUBLIC_APP_URL=https://app.ta.ro`}</CodeBlock>
      </section>
    </div>
  )
}
