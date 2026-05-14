import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/types/database'
import KanbanBoard from '@/components/pipeline/KanbanBoard'

export type PipelineStage = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface PipelineItem {
  id: string
  user_id: string
  client_id: string | null
  title: string
  stage: PipelineStage
  value: number | null
  currency: string
  probability: number | null
  expected_close: string | null
  notes: string | null
  position: number
  created_at: string
  updated_at: string
  client?: Client
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [itemsRes, clientsRes] = await Promise.all([
    supabase
      .from('pipeline_items')
      .select('*, client:clients(id, name, company)')
      .eq('user_id', user!.id)
      .order('position', { ascending: true }),
    supabase
      .from('clients')
      .select('id, name, company')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  const items = (itemsRes.data ?? []) as PipelineItem[]
  const clients = (clientsRes.data ?? []) as Pick<Client, 'id' | 'name' | 'company'>[]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {items.length} {items.length === 1 ? 'oportunitate' : 'oportunități'} în pipeline
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-6">
        <KanbanBoard items={items} clients={clients} />
      </div>
    </div>
  )
}
