import { supabase, resolveUserId } from './supabaseAdmin.js';
import { fetchEmails, type RawEmail } from './imapClient.js';
import { classifyEmail, buildApplicationKey, type ClassifiedEmail } from './classifier.js';
import { config } from './config.js';
import { log } from './logger.js';

interface SyncState {
  id: string;
  last_seen_uid: number | null;
  initial_backfill_completed: boolean;
}

interface SyncStats {
  fetched: number;
  notifications: number;
  applications: number;
  responseLeads: number;
  contactMatches: number;
  rejections: number;
  skipped: number;
}

const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin: 'LinkedIn',
  wellfound: 'Wellfound',
  other: 'Other',
};

// ========================================================
// RESET
// ========================================================

export async function resetSyncData(): Promise<void> {
  const userId = await resolveUserId();
  log.info(`Resetting all sync data for user ${userId}`);

  for (const table of ['email_sync_state', 'email_notifications', 'tracked_applications']) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    log.info(error ? `Failed to clear ${table}: ${error.message}` : `Cleared ${table}`);
  }

  const { error } = await supabase
    .from('response_leads')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'email_sync');
  log.info(error ? `Failed to clear sync response_leads: ${error.message}` : 'Cleared sync-created response_leads');
  log.info('Reset complete');
}

// ========================================================
// SYNC STATE — reads initial_backfill_completed
// ========================================================

async function getOrCreateSyncState(userId: string): Promise<SyncState> {
  const { data: existing } = await supabase
    .from('email_sync_state')
    .select('id, last_seen_uid, initial_backfill_completed')
    .eq('user_id', userId)
    .eq('provider', 'yahoo')
    .eq('email_address', config.yahoo.email)
    .maybeSingle();

  if (existing) return existing as SyncState;

  const { data, error } = await supabase
    .from('email_sync_state')
    .insert({
      user_id: userId,
      provider: 'yahoo',
      email_address: config.yahoo.email,
      initial_backfill_completed: false,
    })
    .select('id, last_seen_uid, initial_backfill_completed')
    .single();

  if (error) throw error;
  return data as SyncState;
}

async function updateCheckpoint(
  stateId: string,
  maxUid: number,
  backfillComplete: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('email_sync_state')
    .update({
      last_seen_uid: maxUid,
      last_seen_at: new Date().toISOString(),
      last_scan_at: new Date().toISOString(),
      initial_backfill_completed: backfillComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stateId);

  if (error) throw error;
}

// ========================================================
// NOTIFICATION
// ========================================================

async function insertNotificationIfNew(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('email_notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('fingerprint', classified.fingerprint)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabase
    .from('email_notifications')
    .insert({
      user_id: userId,
      platform: classified.platform,
      category: classified.category,
      priority: classified.priority,
      action_required: classified.actionRequired,
      status: 'unread',
      source_message_id: classified.raw.messageId || null,
      sender_email: classified.raw.from?.address || null,
      sender_name: classified.raw.from?.name || null,
      subject: classified.raw.subject,
      company_name: classified.companyName,
      contact_name: classified.contactName,
      occurred_at: classified.raw.date?.toISOString() || null,
      received_at: classified.raw.date?.toISOString() || new Date().toISOString(),
      snippet: classified.snippet,
      fingerprint: classified.fingerprint,
    });

  if (error) {
    if (error.code === '23505') return false;
    log.warn('Notification insert error:', error.message);
    return false;
  }
  return true;
}

// ========================================================
// APPLICATION
// ========================================================

const APP_CATEGORIES = new Set([
  'application_confirmation',
  'recruiter_response',
  'recruiter_follow_up',
  'interview_invite',
  'rejection',
]);

const CATEGORY_TO_APP_STATUS: Record<string, string> = {
  application_confirmation: 'active',
  recruiter_response: 'responded',
  recruiter_follow_up: 'responded',
  interview_invite: 'interviewing',
  rejection: 'rejected',
};

const APP_STATUS_ORDER = ['active', 'unknown', 'responded', 'interviewing', 'rejected', 'archived'];

async function trackApplication(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  if (!APP_CATEGORIES.has(classified.category)) return false;

  const appKey = buildApplicationKey(
    classified.platform,
    classified.companyName,
    classified.roleTitle,
    classified.raw.subject,
  );
  if (!appKey) return false;

  const emailDate = classified.raw.date?.toISOString() || new Date().toISOString();
  const newStatus = CATEGORY_TO_APP_STATUS[classified.category] || 'active';

  // Look up by application_key
  const { data: byKey } = await supabase
    .from('tracked_applications')
    .select('id, application_status')
    .eq('user_id', userId)
    .eq('application_key', appKey)
    .maybeSingle();

  // Fallback: company + platform
  let existing = byKey;
  if (!existing && classified.companyName) {
    const { data } = await supabase
      .from('tracked_applications')
      .select('id, application_status')
      .eq('user_id', userId)
      .eq('platform', classified.platform)
      .ilike('company_name', classified.companyName)
      .maybeSingle();
    existing = data;
  }

  if (existing) {
    const currentIdx = APP_STATUS_ORDER.indexOf(existing.application_status);
    const newIdx = APP_STATUS_ORDER.indexOf(newStatus);
    const updates: Record<string, unknown> = {
      latest_email_at: emailDate,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'rejected' || newIdx > currentIdx) {
      updates.application_status = newStatus;
    }
    await supabase.from('tracked_applications').update(updates).eq('id', existing.id);
    return true;
  }

  // Insert new
  const { error } = await supabase
    .from('tracked_applications')
    .insert({
      user_id: userId,
      platform: classified.platform,
      company_name: classified.companyName || 'Unknown',
      role_title: classified.roleTitle,
      application_key: appKey,
      applied_at: classified.category === 'application_confirmation' ? emailDate : null,
      latest_email_at: emailDate,
      source_message_id: classified.raw.messageId || null,
      application_status: newStatus,
    });

  if (error) {
    if (error.code === '23505') return false;
    log.warn('Application insert error:', error.message);
    return false;
  }
  return true;
}

// ========================================================
// RESPONSE LEAD — LinkedIn human signals only
// ========================================================

const RESPONSE_LEAD_CATEGORIES = new Set([
  'recruiter_response',
  'recruiter_follow_up',
  'interview_invite',
]);

const CATEGORY_TO_LEAD_STATUS: Record<string, string> = {
  recruiter_response: 'Replied',
  recruiter_follow_up: 'Follow Up',
  interview_invite: 'Meeting Booked',
};

const LEAD_STATUS_ORDER = ['New', 'Contacted', 'Replied', 'Follow Up', 'Positive', 'Meeting Booked'];

function isNoReply(email: string | null | undefined): boolean {
  if (!email) return true;
  return /noreply|no-reply/i.test(email);
}

async function trackResponseLead(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  if (classified.platform !== 'linkedin') return false;
  if (!RESPONSE_LEAD_CATEGORIES.has(classified.category)) return false;

  const name = classified.contactName || classified.raw.from?.name || 'Unknown Contact';
  const companyName = classified.companyName || 'Unknown';
  const platform = 'LinkedIn';
  const senderEmail = classified.raw.from?.address || null;
  const noReply = isNoReply(senderEmail);
  const newStatus = CATEGORY_TO_LEAD_STATUS[classified.category] || 'Replied';

  let existing: { id: string; response_status: string } | null = null;

  if (senderEmail && !noReply) {
    const { data } = await supabase
      .from('response_leads')
      .select('id, response_status')
      .eq('user_id', userId)
      .eq('sender_email', senderEmail)
      .maybeSingle();
    existing = data;
  }

  if (!existing && name !== 'Unknown Contact') {
    const { data } = await supabase
      .from('response_leads')
      .select('id, response_status')
      .eq('user_id', userId)
      .eq('platform', platform)
      .ilike('name', name)
      .maybeSingle();
    existing = data;
  }

  if (existing) {
    const currentIdx = LEAD_STATUS_ORDER.indexOf(existing.response_status);
    const newIdx = LEAD_STATUS_ORDER.indexOf(newStatus);
    const updates: Record<string, unknown> = {
      priority: 'high',
      updated_at: new Date().toISOString(),
    };
    if (newIdx > currentIdx) updates.response_status = newStatus;
    if (senderEmail && !noReply) updates.sender_email = senderEmail;
    await supabase.from('response_leads').update(updates).eq('id', existing.id);
    return true;
  }

  const { error } = await supabase
    .from('response_leads')
    .insert({
      user_id: userId,
      name,
      platform,
      company_name: companyName,
      response_status: newStatus,
      sender_email: (senderEmail && !noReply) ? senderEmail : null,
      priority: 'high',
      source: 'email_sync',
      note: classified.raw.subject.slice(0, 200),
    });

  if (error) {
    log.warn('Response lead insert error:', error.message);
    return false;
  }
  return true;
}

// ========================================================
// EXISTING COMPANY INTEREST
// ========================================================

async function checkExistingApplicationInterest(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  const interestCategories = new Set(['recruiter_response', 'recruiter_follow_up', 'interview_invite']);
  if (!interestCategories.has(classified.category)) return false;
  if (!classified.companyName) return false;

  const { data: app } = await supabase
    .from('tracked_applications')
    .select('id, application_status')
    .eq('user_id', userId)
    .eq('platform', classified.platform)
    .ilike('company_name', classified.companyName)
    .maybeSingle();

  if (!app) return false;

  const newStatus = CATEGORY_TO_APP_STATUS[classified.category] || 'responded';
  const currentIdx = APP_STATUS_ORDER.indexOf(app.application_status);
  const newIdx = APP_STATUS_ORDER.indexOf(newStatus);

  if (newIdx > currentIdx || app.application_status === 'active') {
    await supabase
      .from('tracked_applications')
      .update({
        application_status: newStatus,
        latest_email_at: classified.raw.date?.toISOString() || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', app.id);
  }

  classified.priority = 'high';
  classified.actionRequired = true;
  log.info(`EXISTING APPLICATION INTEREST: ${classified.companyName} → ${newStatus}`);
  return true;
}

// ========================================================
// EXISTING CONTACT MATCH
// ========================================================

async function checkExistingContactMatch(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  if (classified.platform !== 'linkedin') return false;

  const senderEmail = classified.raw.from?.address?.toLowerCase();
  const noReply = isNoReply(senderEmail);

  if (senderEmail && !noReply) {
    const { data } = await supabase
      .from('response_leads')
      .select('id, name, response_status')
      .eq('user_id', userId)
      .eq('sender_email', senderEmail)
      .maybeSingle();

    if (data) {
      await elevateExistingLead(data.id, data.response_status);
      classified.priority = 'high';
      classified.actionRequired = true;
      log.info(`EXISTING CONTACT MATCH (email): ${data.name}`);
      return true;
    }
  }

  if (classified.contactName && classified.contactName !== 'Unknown Contact') {
    const { data } = await supabase
      .from('response_leads')
      .select('id, name, response_status')
      .eq('user_id', userId)
      .ilike('name', classified.contactName)
      .maybeSingle();

    if (data) {
      await elevateExistingLead(data.id, data.response_status);
      classified.priority = 'high';
      classified.actionRequired = true;
      log.info(`EXISTING CONTACT MATCH (name): ${data.name}`);
      return true;
    }
  }

  return false;
}

async function elevateExistingLead(leadId: string, currentStatus: string): Promise<void> {
  const currentIdx = LEAD_STATUS_ORDER.indexOf(currentStatus);
  const positiveIdx = LEAD_STATUS_ORDER.indexOf('Positive');

  const updates: Record<string, unknown> = {
    priority: 'high',
    updated_at: new Date().toISOString(),
  };
  if (currentIdx >= 0 && currentIdx < positiveIdx) {
    updates.response_status = 'Positive';
  }
  await supabase.from('response_leads').update(updates).eq('id', leadId);
}

// ========================================================
// MAIN SYNC
// ========================================================

export async function runSyncOnce(): Promise<SyncStats> {
  const stats: SyncStats = {
    fetched: 0,
    notifications: 0,
    applications: 0,
    responseLeads: 0,
    contactMatches: 0,
    rejections: 0,
    skipped: 0,
  };

  const userId = await resolveUserId();
  log.info(`Syncing for user ${userId}`);

  const state = await getOrCreateSyncState(userId);
  const needsBackfill = !state.initial_backfill_completed;

  let emails: RawEmail[];

  if (needsBackfill) {
    // FIRST RUN: scan last 7 days
    log.info(`Running initial ${config.backfillDays}-day backfill`);
    const since = new Date();
    since.setDate(since.getDate() - config.backfillDays);
    emails = await fetchEmails({ since });
  } else {
    // SUBSEQUENT RUNS: incremental from checkpoint
    log.info(`Incremental sync from UID ${state.last_seen_uid ?? 'none'}`);
    emails = await fetchEmails({
      afterUid: state.last_seen_uid || undefined,
    });
  }

  stats.fetched = emails.length;

  if (emails.length === 0) {
    log.info('No new emails to process');
    await updateCheckpoint(state.id, state.last_seen_uid || 0, true);
    return stats;
  }

  let maxUid = state.last_seen_uid || 0;

  for (const raw of emails) {
    const classified = classifyEmail(raw);

    if (config.dryRun) {
      log.info(
        `[DRY] ${classified.platform} | ${classified.category} | ` +
        `company=${classified.companyName || '?'} | ${raw.subject.slice(0, 60)}`
      );
      stats.notifications++;
      continue;
    }

    // A. Check existing application interest (any platform)
    const isAppInterest = await checkExistingApplicationInterest(userId, classified);
    if (isAppInterest) stats.contactMatches++;

    // B. Check existing contact match (LinkedIn only)
    if (!isAppInterest) {
      const isContactMatch = await checkExistingContactMatch(userId, classified);
      if (isContactMatch) stats.contactMatches++;
    }

    // C. Insert notification
    const notifCreated = await insertNotificationIfNew(userId, classified);
    if (notifCreated) {
      stats.notifications++;
    } else {
      stats.skipped++;
    }

    // D. Track application
    const appTracked = await trackApplication(userId, classified);
    if (appTracked) stats.applications++;
    if (classified.category === 'rejection' && appTracked) stats.rejections++;

    // E. Track response lead (LinkedIn only)
    const leadTracked = await trackResponseLead(userId, classified);
    if (leadTracked) stats.responseLeads++;

    if (raw.uid > maxUid) maxUid = raw.uid;
  }

  if (!config.dryRun) {
    await updateCheckpoint(state.id, maxUid, true);
    log.info(needsBackfill
      ? 'Initial backfill complete — subsequent runs will be incremental'
      : `Checkpoint updated to UID ${maxUid}`
    );
  }

  return stats;
}
