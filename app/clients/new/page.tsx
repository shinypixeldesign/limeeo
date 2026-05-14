import Link from 'next/link'
import ClientForm from '@/components/clients/ClientForm'
import { createClientAction } from '@/app/actions/clients'

export default function NewClientPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Înapoi la clienți</span>
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Client Nou</h1>
        <p className="text-gray-500 mt-1">Completează datele clientului</p>
      </div>

      <ClientForm action={createClientAction} cancelHref="/clients" />
    </div>
  )
}
