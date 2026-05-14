import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, Client, Project, Profile } from '@/types/database'
import InvoicePreview from '@/components/financials/InvoicePreview'

type FullInvoice = Invoice & { client: Client | null; project: Project | null }

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [invoiceRes, profileRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, client:clients(id,name,company,email,phone), project:projects(id,name)')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single(),
  ])

  if (!invoiceRes.data) notFound()

  return (
    <InvoicePreview
      invoice={invoiceRes.data as FullInvoice}
      profile={profileRes.data as Profile}
    />
  )
}
