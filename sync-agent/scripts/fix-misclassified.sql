-- =============================================
-- Fix historically misclassified notifications
-- Run in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Reclassify connection acceptances that were stored as recruiter_response
update public.email_notifications
set category = 'connection_acceptance',
    priority = 'low',
    action_required = false,
    updated_at = now()
where category = 'recruiter_response'
  and (subject ilike '%accepted your invitation%'
    or subject ilike '%accepted your connection%'
    or subject ilike '%accepted your request%'
    or subject ilike '%explore their network%'
    or subject ilike '%wants to connect%'
    or subject ilike '%endorsed you%'
    or subject ilike '%congratulate%');

-- 2. Reclassify "wants to connect" stored as recruiter_response
update public.email_notifications
set category = 'connection_acceptance',
    priority = 'low',
    action_required = false,
    updated_at = now()
where category = 'recruiter_response'
  and subject ilike '%wants to connect%';

-- 3. Fix application confirmations that were stored as interview_invite
update public.email_notifications
set category = 'application_confirmation',
    priority = 'low',
    action_required = false,
    updated_at = now()
where category = 'interview_invite'
  and (subject ilike '%application%submitted%'
    or subject ilike '%application%sent%'
    or subject ilike '%you applied%'
    or subject ilike '%thanks for applying%'
    or subject ilike '%application to%successfully%');

-- 4. Downgrade application_confirmation action_required to false
update public.email_notifications
set action_required = false,
    priority = 'low',
    updated_at = now()
where category = 'application_confirmation'
  and (action_required = true or priority != 'low');

-- 5. Reclassify LinkedIn messages that were misclassified as unknown_relevant or digest
update public.email_notifications
set category = 'recruiter_response',
    priority = 'high',
    action_required = true,
    updated_at = now()
where platform = 'linkedin'
  and category in ('unknown_relevant', 'digest', 'reminder')
  and (subject ilike '%messaged you%'
    or subject ilike '%sent you a message%'
    or subject ilike '%new message awaits%'
    or subject ilike '%you have a new message%');

-- Verify
select category, priority, action_required, count(*)
from public.email_notifications
group by category, priority, action_required
order by category, priority;
