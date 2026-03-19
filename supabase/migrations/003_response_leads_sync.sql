-- =============================================
-- Add sync-matching columns to response_leads
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- New columns for email sync matching and priority elevation
alter table public.response_leads add column if not exists sender_email text;
alter table public.response_leads add column if not exists priority text not null default 'medium';
alter table public.response_leads add column if not exists source text not null default 'manual';

-- Fast lookup by sender email for existing-contact matching
create index if not exists idx_response_leads_sender_email
  on public.response_leads (user_id, sender_email)
  where sender_email is not null;

-- Fast lookup for high-priority leads
create index if not exists idx_response_leads_priority
  on public.response_leads (user_id, priority, updated_at desc)
  where priority = 'high';

-- Name + company lookup for contact matching
create index if not exists idx_response_leads_name_company
  on public.response_leads (user_id, platform, company_name);
