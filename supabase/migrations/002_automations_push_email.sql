-- ============================================================
-- LIMEEO — Migrare 002: Automations, Push Subscriptions, Email Integration
-- ============================================================

-- ============================================================
-- AUTOMATION_RULES
-- ============================================================
create table if not exists public.automation_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'offer_not_viewed',
    'offer_viewed_no_reply',
    'invoice_overdue',
    'invoice_due_soon',
    'project_deadline'
  )),
  trigger_days integer not null default 3,
  email_subject text,
  email_body text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_rules enable row level security;

create policy "Users manage own automation rules"
  on public.automation_rules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- AUTOMATION_LOGS
-- ============================================================
create table if not exists public.automation_logs (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references public.automation_rules(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  resource_id uuid not null,
  resource_type text not null,
  sent_at timestamptz not null default now(),
  recipient_email text,
  status text not null default 'sent'
);

alter table public.automation_logs enable row level security;

create policy "Users view own automation logs"
  on public.automation_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PUSH_SUBSCRIPTIONS
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PROFILES — adaugă coloane Gmail/Outlook (dacă nu există deja)
-- ============================================================
alter table public.profiles
  add column if not exists gmail_access_token text,
  add column if not exists gmail_refresh_token text,
  add column if not exists gmail_token_expiry bigint,
  add column if not exists gmail_email text,
  add column if not exists outlook_access_token text,
  add column if not exists outlook_refresh_token text,
  add column if not exists outlook_token_expiry bigint,
  add column if not exists outlook_email text;

-- Coloane companie care pot lipsi din schema inițială
alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_cui text,
  add column if not exists company_j text,
  add column if not exists company_address text,
  add column if not exists company_city text,
  add column if not exists company_county text,
  add column if not exists company_iban text,
  add column if not exists company_bank text,
  add column if not exists company_phone text,
  add column if not exists company_email text,
  add column if not exists company_website text,
  add column if not exists logo_url text;
