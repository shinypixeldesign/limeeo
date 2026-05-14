import Link from 'next/link'
import ClientForm from '@/components/clients/ClientForm'
import { createClientAction } from '@/app/actions/clients'

export default function NewClientPage() {
  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/clients"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client nou</h1>
          <p className="text-slate-500 text-sm mt-0.5">Completează datele clientului</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ClientForm action={createClientAction} cancelHref="/clients" />
      </div>
    </div>
  )
}
