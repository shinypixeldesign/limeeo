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
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/clients/${client.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs text-slate-400 font-medium">{client.name}</p>
          <h1 className="text-2xl font-bold text-slate-900">Editează client</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ClientForm
          action={updateClientAction}
          client={client}
          cancelHref={`/clients/${client.id}`}
        />
      </div>
    </div>
  )
}
