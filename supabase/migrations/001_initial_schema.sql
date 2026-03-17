-- =============================================
-- Outreach Console — Initial Schema + RLS
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Profiles (auto-populated on signup)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- 2. Daily outreach counts
create table if not exists public.daily_outreach_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracked_date date not null,
  outreach_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, tracked_date)
);

alter table public.daily_outreach_counts enable row level security;

create policy "Users can read own counts"
  on public.daily_outreach_counts for select
  using (auth.uid() = user_id);

create policy "Users can insert own counts"
  on public.daily_outreach_counts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own counts"
  on public.daily_outreach_counts for update
  using (auth.uid() = user_id);

create policy "Users can delete own counts"
  on public.daily_outreach_counts for delete
  using (auth.uid() = user_id);


-- 3. Response leads
create table if not exists public.response_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null,
  profile_url text default '',
  company_name text not null,
  response_status text not null default 'New',
  note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.response_leads enable row level security;

create policy "Users can read own leads"
  on public.response_leads for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on public.response_leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on public.response_leads for update
  using (auth.uid() = user_id);

create policy "Users can delete own leads"
  on public.response_leads for delete
  using (auth.uid() = user_id);


-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
