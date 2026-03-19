  -- =============================================
  -- Email Sync — Notifications, Applications, Sync State
  -- Run this in Supabase Dashboard > SQL Editor
  -- =============================================

  -- 1. Email Notifications
  create table if not exists public.email_notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    platform text not null,
    category text not null,
    priority text not null default 'medium',
    action_required boolean not null default false,
    status text not null default 'unread',
    source_message_id text,
    source_thread_id text,
    sender_email text,
    sender_name text,
    subject text,
    company_name text,
    contact_name text,
    occurred_at timestamptz,
    received_at timestamptz not null default now(),
    snippet text,
    metadata jsonb not null default '{}'::jsonb,
    fingerprint text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Dedupe: one notification per user per fingerprint
    unique(user_id, fingerprint)
  );

  alter table public.email_notifications enable row level security;

  create policy "Users can read own notifications"
    on public.email_notifications for select using (auth.uid() = user_id);
  create policy "Users can update own notifications"
    on public.email_notifications for update using (auth.uid() = user_id);
  create policy "Users can delete own notifications"
    on public.email_notifications for delete using (auth.uid() = user_id);
  create policy "Service can insert notifications"
    on public.email_notifications for insert with check (true);

  -- Fast queries
  create index if not exists idx_notif_unread
    on public.email_notifications (user_id, status, priority, created_at desc);

  create index if not exists idx_notif_action
    on public.email_notifications (user_id, action_required, created_at desc)
    where action_required = true;

  create index if not exists idx_notif_message_id
    on public.email_notifications (user_id, source_message_id)
    where source_message_id is not null;


  -- 2. Tracked Applications
  create table if not exists public.tracked_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    platform text not null,
    company_name text,
    role_title text,
    application_key text not null,
    first_detected_at timestamptz not null default now(),
    applied_at timestamptz,
    latest_email_at timestamptz,
    application_status text not null default 'active',
    source_message_id text,
    source_thread_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Dedupe: one application per user per application_key
    unique(user_id, application_key)
  );

  alter table public.tracked_applications enable row level security;

  create policy "Users can read own applications"
    on public.tracked_applications for select using (auth.uid() = user_id);
  create policy "Users can update own applications"
    on public.tracked_applications for update using (auth.uid() = user_id);
  create policy "Users can delete own applications"
    on public.tracked_applications for delete using (auth.uid() = user_id);
  create policy "Service can insert applications"
    on public.tracked_applications for insert with check (true);

  create index if not exists idx_app_status
    on public.tracked_applications (user_id, application_status, latest_email_at desc);


  -- 3. Email Sync State
  create table if not exists public.email_sync_state (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null,
    email_address text not null,
    last_seen_uid bigint,
    last_seen_at timestamptz,
    last_scan_at timestamptz,
    initial_backfill_completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, provider, email_address)
  );

  alter table public.email_sync_state enable row level security;

  create policy "Users can read own sync state"
    on public.email_sync_state for select using (auth.uid() = user_id);
  -- sync_state is written by service role only (sync agent)
