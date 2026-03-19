-- =============================================
-- Reset all sync-derived data for testing
-- Run in Supabase Dashboard > SQL Editor
-- =============================================

-- Wipe sync checkpoint state (forces fresh backfill)
delete from public.email_sync_state;

-- Wipe all notifications
delete from public.email_notifications;

-- Wipe all tracked applications
delete from public.tracked_applications;

-- Wipe only sync-created response leads (preserves manual ones)
delete from public.response_leads where source = 'email_sync';

-- Verify
select 'email_sync_state' as tbl, count(*) from email_sync_state
union all select 'email_notifications', count(*) from email_notifications
union all select 'tracked_applications', count(*) from tracked_applications
union all select 'response_leads (sync)', count(*) from response_leads where source = 'email_sync';
