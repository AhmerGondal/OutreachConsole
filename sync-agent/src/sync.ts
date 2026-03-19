import { supabase, resolveUserId } from './supabaseAdmin.js';
import { fetchEmails, type RawEmail } from './imapClient.js';
import { classifyEmail, buildApplicationKey, type ClassifiedEmail } from './classifier.js';
import { config } from './config.js';
import { log } from './logger.js';

interface SyncState {
  id: string;
  last_seen_uid: number | null;
  last_seen_at: string | null;
  initial_backfill_completed: boolean;
}

interface SyncStats {
  fetched: number;
  notifications: number;
  applications: number;
  skipped: number;
}

// --------------- Sync state management ---------------

async function getSyncState(userId: string): Promise<SyncState | null> {
  const { data, error } = await supabase
    .from('email_sync_state')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'yahoo')
    .eq('email_address', config.yahoo.email)
    .maybeSingle();

  if (error) throw error;
  return data as SyncState | null;
}

async function createSyncState(userId: string): Promise<SyncState> {
  const { data, error } = await supabase
    .from('email_sync_state')
    .insert({
      user_id: userId,
      provider: 'yahoo',
      email_address: config.yahoo.email,
    })
    .select()
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

// --------------- Notification upsert ---------------

async function upsertNotification(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  const row = {
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
  };

  // Dedupe on fingerprint (always populated, matches table UNIQUE constraint)
  const { error } = await supabase
    .from('email_notifications')
    .upsert(row, {
      onConflict: 'user_id,fingerprint',
      ignoreDuplicates: true,
    });

  if (error) {
    // Unique constraint violation = already exists
    if (error.code === '23505') return false;
    log.warn('Notification upsert error:', error.message);
    return false;
  }

  return true;
}

// --------------- Application tracking ---------------

const APP_SEED_CATEGORIES = new Set([
  'application_confirmation',
]);

const APP_UPDATE_CATEGORIES = new Set([
  'recruiter_response',
  'recruiter_follow_up',
  'interview_invite',
  'rejection',
]);

const CATEGORY_TO_APP_STATUS: Record<string, string> = {
  recruiter_response: 'responded',
  recruiter_follow_up: 'responded',
  interview_invite: 'interviewing',
  rejection: 'rejected',
};

async function upsertApplication(
  userId: string,
  classified: ClassifiedEmail,
): Promise<boolean> {
  const appKey = buildApplicationKey(
    classified.platform,
    classified.companyName,
    classified.roleTitle,
  );

  if (!appKey) return false;

  if (APP_SEED_CATEGORIES.has(classified.category)) {
    // Create new application record
    const { error } = await supabase
      .from('tracked_applications')
      .upsert(
        {
          user_id: userId,
          platform: classified.platform,
          company_name: classified.companyName,
          role_title: classified.roleTitle,
          application_key: appKey,
          applied_at: classified.raw.date?.toISOString() || null,
          latest_email_at: classified.raw.date?.toISOString() || null,
          source_message_id: classified.raw.messageId || null,
          application_status: 'active',
        },
        { onConflict: 'user_id,application_key', ignoreDuplicates: true }
      );

    if (error && error.code !== '23505') {
      log.warn('Application insert error:', error.message);
      return false;
    }
    return true;
  }

  if (APP_UPDATE_CATEGORIES.has(classified.category)) {
    // Try to update existing application
    const newStatus = CATEGORY_TO_APP_STATUS[classified.category] || 'active';
    const emailDate = classified.raw.date?.toISOString() || new Date().toISOString();

    // Find existing application for this company/platform
    const { data: existing } = await supabase
      .from('tracked_applications')
      .select('id, application_status')
      .eq('user_id', userId)
      .eq('platform', classified.platform)
      .ilike('company_name', classified.companyName || '')
      .maybeSingle();

    if (existing) {
      // Only update status if it's a progression (not downgrade)
      const statusOrder = ['active', 'unknown', 'responded', 'interviewing', 'rejected', 'archived'];
      const currentIdx = statusOrder.indexOf(existing.application_status);
      const newIdx = statusOrder.indexOf(newStatus);

      if (newIdx >= currentIdx) {
        await supabase
          .from('tracked_applications')
          .update({
            application_status: newStatus,
            latest_email_at: emailDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Still update latest email timestamp
        await supabase
          .from('tracked_applications')
          .update({
            latest_email_at: emailDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
      return true;
    }

    // No existing app — create one from the response
    const { error } = await supabase
      .from('tracked_applications')
      .upsert(
        {
          user_id: userId,
          platform: classified.platform,
          company_name: classified.companyName,
          role_title: classified.roleTitle,
          application_key: appKey,
          latest_email_at: emailDate,
          application_status: newStatus,
        },
        { onConflict: 'user_id,application_key', ignoreDuplicates: false }
      );

    if (error) {
      log.warn('Application upsert error:', error.message);
      return false;
    }
    return true;
  }

  return false;
}

// --------------- Main sync ---------------

export async function runSyncOnce(): Promise<SyncStats> {
  const stats: SyncStats = { fetched: 0, notifications: 0, applications: 0, skipped: 0 };

  // 1. Resolve user
  const userId = await resolveUserId();
  log.info(`Syncing for user ${userId}`);

  // 2. Get or create sync state
  let state = await getSyncState(userId);
  if (!state) {
    state = await createSyncState(userId);
    log.info('Created new sync state');
  }

  // 3. Determine fetch mode
  const isBackfill = !state.initial_backfill_completed;
  let emails: RawEmail[];

  if (isBackfill) {
    log.info(`Running ${config.backfillDays}-day backfill`);
    const since = new Date();
    since.setDate(since.getDate() - config.backfillDays);
    emails = await fetchEmails({ since });
  } else {
    log.info(`Incremental scan from UID ${state.last_seen_uid}`);
    emails = await fetchEmails({
      afterUid: state.last_seen_uid || undefined,
    });
  }

  stats.fetched = emails.length;

  if (emails.length === 0) {
    log.info('No new emails to process');
    // Update scan timestamp even if nothing new
    await updateCheckpoint(state.id, state.last_seen_uid || 0, state.initial_backfill_completed || isBackfill);
    return stats;
  }

  // 4. Process each email
  let maxUid = state.last_seen_uid || 0;

  for (const raw of emails) {
    const classified = classifyEmail(raw);

    if (config.dryRun) {
      log.info(
        `[DRY RUN] ${classified.platform} | ${classified.category} | ${classified.priority} | ` +
        `${classified.companyName || '?'} | ${raw.subject.slice(0, 60)}`
      );
      stats.notifications++;
      continue;
    }

    // Upsert notification
    const created = await upsertNotification(userId, classified);
    if (created) {
      stats.notifications++;
    } else {
      stats.skipped++;
    }

    // Track application if applicable
    const appTracked = await upsertApplication(userId, classified);
    if (appTracked) stats.applications++;

    // Track max UID
    if (raw.uid > maxUid) maxUid = raw.uid;
  }

  // 5. Update checkpoint
  if (!config.dryRun) {
    await updateCheckpoint(state.id, maxUid, true);
  }

  return stats;
}
