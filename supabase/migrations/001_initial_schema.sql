-- ============================================================
-- LIMEEO — Schema inițială (Faza 1 MVP)
-- Rulează în Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensii necesare
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (date utilizator, legat de auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'solo', 'pro', 'team')),
  ai_messages_used integer not null default 0,
  ai_messages_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company text,
  website text,
  status text not null default 'active' check (status in ('active', 'inactive', 'prospect')),
  health_score integer not null default 100 check (health_score >= 0 and health_score <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  budget numeric(12, 2),
  currency text not null default 'RON',
  start_date date,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INVOICES (facturi + oferte)
-- ============================================================
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  type text not null default 'invoice' check (type in ('invoice', 'offer')),
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date not null default current_date,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 19,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'RON',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NOTES (note pe clienți sau proiecte)
-- ============================================================
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- AI MESSAGES (istoricul conversațiilor AI)
-- ============================================================
create table public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  context_type text check (context_type in ('briefing', 'chat', 'draft', 'analysis')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCȚIE: updated_at automat
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.clients
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.notes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FUNCȚIE: creare profil automat la înregistrare
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Fiecare user vede DOAR datele lui
-- ============================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.notes enable row level security;
alter table public.ai_messages enable row level security;

-- Policies: profiles
create policy "Utilizatorii îsi pot vedea propriul profil"
  on public.profiles for select using (auth.uid() = id);
create policy "Utilizatorii îsi pot actualiza propriul profil"
  on public.profiles for update using (auth.uid() = id);

-- Policies: clients
create policy "CRUD clienți proprii"
  on public.clients for all using (auth.uid() = user_id);

-- Policies: projects
create policy "CRUD proiecte proprii"
  on public.projects for all using (auth.uid() = user_id);

-- Policies: invoices
create policy "CRUD facturi proprii"
  on public.invoices for all using (auth.uid() = user_id);

-- Policies: notes
create policy "CRUD note proprii"
  on public.notes for all using (auth.uid() = user_id);

-- Policies: ai_messages
create policy "CRUD mesaje AI proprii"
  on public.ai_messages for all using (auth.uid() = user_id);

-- ============================================================
-- INDECȘI pentru performanță
-- ============================================================
create index idx_clients_user_id on public.clients(user_id);
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_client_id on public.projects(client_id);
create index idx_invoices_user_id on public.invoices(user_id);
create index idx_invoices_client_id on public.invoices(client_id);
create index idx_notes_user_id on public.notes(user_id);
create index idx_notes_client_id on public.notes(client_id);
create index idx_notes_project_id on public.notes(project_id);
create index idx_ai_messages_user_id on public.ai_messages(user_id);
