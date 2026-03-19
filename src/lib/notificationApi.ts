import { supabase } from './supabase';
import type {
  EmailNotification,
  TrackedApplication,
  NotificationSummary,
  NotificationPlatform,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  ApplicationStatus,
} from '../types/notifications';

// --------------- Row mappings ---------------

interface NotifRow {
  id: string;
  platform: string;
  category: string;
  priority: string;
  action_required: boolean;
  status: string;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  company_name: string | null;
  contact_name: string | null;
  occurred_at: string | null;
  received_at: string;
  snippet: string | null;
  created_at: string;
}

interface AppRow {
  id: string;
  platform: string;
  company_name: string | null;
  role_title: string | null;
  first_detected_at: string;
  applied_at: string | null;
  latest_email_at: string | null;
  application_status: string;
  created_at: string;
  updated_at: string;
}

function rowToNotification(row: NotifRow): EmailNotification {
  return {
    id: row.id,
    platform: row.platform as NotificationPlatform,
    category: row.category as NotificationCategory,
    priority: row.priority as NotificationPriority,
    actionRequired: row.action_required,
    status: row.status as NotificationStatus,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
    subject: row.subject,
    companyName: row.company_name,
    contactName: row.contact_name,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    snippet: row.snippet,
    createdAt: row.created_at,
  };
}

function rowToApplication(row: AppRow): TrackedApplication {
  return {
    id: row.id,
    platform: row.platform as NotificationPlatform,
    companyName: row.company_name,
    roleTitle: row.role_title,
    firstDetectedAt: row.first_detected_at,
    appliedAt: row.applied_at,
    latestEmailAt: row.latest_email_at,
    applicationStatus: row.application_status as ApplicationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --------------- Notifications ---------------

// Categories excluded from Notices display and badge counts
const SUPPRESSED_CATEGORIES = [
  'digest',
  'marketing',
  'connection_acceptance',
  'reminder',
  'unknown_relevant',
];

// Categories excluded from Notices badge counts (but may still show in list if not suppressed)
const NON_ACTIONABLE_CATEGORIES = [
  ...SUPPRESSED_CATEGORIES,
  'application_confirmation',
];

export async function fetchNotifications(opts?: {
  statusFilter?: NotificationStatus;
  includeSuppressed?: boolean;
  limit?: number;
}): Promise<EmailNotification[]> {
  let query = supabase
    .from('email_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.statusFilter) {
    query = query.eq('status', opts.statusFilter);
  }

  if (!opts?.includeSuppressed) {
    for (const cat of SUPPRESSED_CATEGORIES) {
      query = query.neq('category', cat);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as NotifRow[]).map(rowToNotification);
}

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const { data, error } = await supabase
    .from('email_notifications')
    .select('status, action_required, platform, category')
    .eq('status', 'unread');

  if (error) throw error;

  const rows = data as Array<{
    status: string;
    action_required: boolean;
    platform: string;
    category: string;
  }>;

  // Exclude suppressed from all counts
  const relevant = rows.filter((r) => !SUPPRESSED_CATEGORIES.includes(r.category));
  // Exclude non-actionable from action count
  const actionable = relevant.filter(
    (r) => r.action_required && !NON_ACTIONABLE_CATEGORIES.includes(r.category)
  );

  const byPlatform: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const r of relevant) {
    byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  return {
    totalUnread: relevant.length,
    actionRequired: actionable.length,
    byPlatform,
    byCategory,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_notifications')
    .update({ status: 'read', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function dismissNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_notifications')
    .update({ status: 'dismissed', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('email_notifications')
    .update({ status: 'read', updated_at: new Date().toISOString() })
    .eq('status', 'unread');
  if (error) throw error;
}

// --------------- Active Leads / Responses ---------------

// STRICT: only true human interactions and application responses
const ACTIVE_LEAD_CATEGORIES = [
  'recruiter_response',
  'recruiter_follow_up',
  'interview_invite',
  'rejection',
];

export async function fetchActiveLeads(): Promise<EmailNotification[]> {
  const { data, error } = await supabase
    .from('email_notifications')
    .select('*')
    .in('category', ACTIVE_LEAD_CATEGORIES)
    .in('status', ['unread', 'read'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data as NotifRow[]).map(rowToNotification);
}

// --------------- Tracked Applications ---------------

export async function fetchTrackedApplications(opts?: {
  statusFilter?: ApplicationStatus;
}): Promise<TrackedApplication[]> {
  let query = supabase
    .from('tracked_applications')
    .select('*')
    .order('latest_email_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (opts?.statusFilter) {
    query = query.eq('application_status', opts.statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as AppRow[]).map(rowToApplication);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('tracked_applications')
    .update({ application_status: status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
