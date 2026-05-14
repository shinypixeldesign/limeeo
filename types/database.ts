// Tipuri pentru baza de date Limeeo
// Actualizat automat după aplicarea migrărilor Supabase

export type UserPlan = 'free' | 'solo' | 'pro' | 'team'
export type ClientStatus = 'active' | 'inactive' | 'prospect'
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceType = 'invoice' | 'offer'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: UserPlan
  ai_messages_used: number
  ai_messages_reset_at: string
  // Date companie/freelancer
  company_name: string | null
  company_cui: string | null       // CUI / CIF fiscal
  company_j: string | null         // Nr. Reg. Comertului
  company_address: string | null
  company_city: string | null
  company_county: string | null
  company_iban: string | null
  company_bank: string | null
  company_phone: string | null
  company_email: string | null
  company_website: string | null
  logo_url: string | null
  // Stripe billing
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  // Offer defaults
  offer_series_prefix: string
  offer_default_intro: string | null
  offer_default_terms: string | null
  offer_default_notes: string | null
  offer_default_validity: number
  offer_brand_color: string
  // Gmail integration
  gmail_access_token: string | null
  gmail_refresh_token: string | null
  gmail_token_expiry: number | null
  gmail_email: string | null
  // Outlook integration
  outlook_access_token: string | null
  outlook_refresh_token: string | null
  outlook_token_expiry: number | null
  outlook_email: string | null
  created_at: string
  updated_at: string
}

export type AutomationTriggerType =
  | 'offer_not_viewed'
  | 'offer_viewed_no_reply'
  | 'invoice_overdue'
  | 'invoice_due_soon'
  | 'project_deadline'

export interface AutomationRule {
  id: string
  user_id: string
  name: string
  trigger_type: AutomationTriggerType
  trigger_days: number
  email_subject: string | null
  email_body: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AutomationLog {
  id: string
  rule_id: string
  user_id: string
  resource_id: string
  resource_type: string
  sent_at: string
  recipient_email: string | null
  status: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export type NotificationType = 'offer_accepted' | 'offer_rejected' | 'offer_viewed' | 'invoice_paid' | 'system' | 'reminder' | 'automation'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  resource_href: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  website: string | null
  status: ClientStatus
  health_score: number // 0-100
  notes: string | null
  logo_url: string | null
  // Date fiscale
  cui: string | null
  reg_com: string | null
  address: string | null
  city: string | null
  county: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  budget: number | null
  currency: string
  start_date: string | null
  deadline: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Relații (join)
  client?: Client
}

export type ProjectMemberRole = 'viewer' | 'editor'
export type ProjectMemberStatus = 'pending' | 'accepted' | 'declined'

export interface ProjectMember {
  id: string
  project_id: string
  owner_user_id: string
  invited_email: string
  member_user_id: string | null
  role: ProjectMemberRole
  status: ProjectMemberStatus
  invite_token: string
  invited_at: string
  accepted_at: string | null
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  type: InvoiceType
  number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  items: InvoiceItem[]
  subtotal: number
  discount_type: 'none' | 'percent' | 'fixed'
  discount_value: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
  // Relații (join)
  client?: Client
  project?: Project
}

export interface InvoiceItem {
  description: string
  quantity: number
  um: string
  unit_price: number
  total: number
}

export interface Note {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface AiMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context_type: 'briefing' | 'chat' | 'draft' | 'analysis' | null
  created_at: string
}

export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
export type OfferItemType = 'fix' | 'hourly' | 'rate_card'
export type DiscountType = 'none' | 'percent' | 'fixed'

export interface Offer {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  number: string
  title: string | null
  status: OfferStatus
  token: string
  brand_color: string
  intro_text: string | null
  terms_text: string | null
  notes: string | null
  currency: string
  validity_days: number
  valid_until: string | null
  discount_type: DiscountType
  discount_value: number
  tax_rate: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  refusal_reason: string | null
  created_at: string
  updated_at: string
  // Financial & project details
  payment_conditions: string | null
  project_start_date: string | null
  revisions_included: number | null
  // Relații (join)
  client?: Client
  project?: Project
  offer_items?: OfferItem[]
}

export interface OfferItem {
  id: string
  offer_id: string
  position: number
  type: OfferItemType
  category: string | null
  title: string
  description: string | null
  deliverables: string | null
  timeline: string | null
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

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
  // Relații (join)
  client?: Client
}

export interface TimeEntry {
  id: string
  user_id: string
  project_id: string | null
  client_id: string | null
  description: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  hourly_rate: number
  currency: string
  is_billable: boolean
  is_invoiced: boolean
  tag_ids: string[]
  created_at: string
  updated_at: string
  // Relații (join)
  project?: Project
  client?: Client
}

export interface TimeTag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface ClientRate {
  id: string
  user_id: string
  client_id: string
  hourly_rate: number
  currency: string
  created_at: string
}

export interface TimeSettings {
  user_id: string
  default_rate: number
  default_currency: string
  updated_at: string
}

export interface ProjectTask {
  id: string
  project_id: string
  user_id: string
  parent_task_id: string | null
  title: string
  is_completed: boolean
  position: number
  assignee_email: string | null
  deadline: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ServiceTemplate {
  id: string
  user_id: string
  category: string
  title: string
  description: string | null
  type: OfferItemType
  unit_price: number
  created_at: string
}

export interface OfferPackageItem {
  type: OfferItemType
  category: string
  title: string
  description: string
  deliverables: string
  timeline: string
  quantity: string
  unit_price: string
}

export interface OfferPackage {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string
  items: OfferPackageItem[]
  created_at: string
  updated_at: string
}
