import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientForm from '@/components/clients/ClientForm'
import { updateClientAction } from '@/app/actions/clients'
import type { Client } from '@/types/database'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!data) notFound()

  const client = data as Client

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-10">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Înapoi la {client.name}</span>
        </Link>
        <h1 className="text-4xl font-bold text-gray-900">Editează Profilul Companiei</h1>
      </div>

      <ClientForm
        action={updateClientAction}
        client={client}
        cancelHref={`/clients/${client.id}`}
      />
    </div>
  )
}
