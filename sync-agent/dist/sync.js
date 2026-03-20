import { supabase, resolveUserId } from './supabaseAdmin.js';
import { fetchEmails } from './imapClient.js';
import { classifyEmail, buildApplicationKey } from './classifier/index.js';
import { config } from './config.js';
import { log } from './logger.js';
const PLATFORM_DISPLAY = {
    linkedin: 'LinkedIn',
    wellfound: 'Wellfound',
    mercor: 'Mercor',
    direct_email: 'Direct',
    other: 'Other',
};
// ========================================================
// RESET
// ========================================================
export async function resetSyncData() {
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
// SYNC STATE
// ========================================================
async function getOrCreateSyncState(userId) {
    const { data: existing } = await supabase
        .from('email_sync_state')
        .select('id, last_seen_uid, initial_backfill_completed')
        .eq('user_id', userId)
        .eq('provider', 'yahoo')
        .eq('email_address', config.yahoo.email)
        .maybeSingle();
    if (existing)
        return existing;
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
    if (error)
        throw error;
    return data;
}
async function updateCheckpoint(stateId, maxUid, backfillComplete) {
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
    if (error)
        throw error;
}
// ========================================================
// NOTIFICATION
// ========================================================
async function insertNotificationIfNew(userId, classified) {
    const { data: existing } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('fingerprint', classified.fingerprint)
        .maybeSingle();
    if (existing)
        return false;
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
        metadata: {
            role_title: classified.roleTitle,
            confidence: classified.classification.classification_confidence,
            job_interest_score: classified.classification.job_interest_score,
            reasoning_tags: classified.classification.reasoning_tags,
        },
    });
    if (error) {
        if (error.code === '23505')
            return false;
        log.warn('Notification insert error:', error.message);
        return false;
    }
    return true;
}
// ========================================================
// APPLICATION
// ========================================================
// Maps new category names to the DB application_status values
const CATEGORY_TO_APP_STATUS = {
    application_confirmation: 'active',
    application_update: 'active',
    recruiter_response: 'responded',
    inmail_message: 'responded',
    job_opportunity: 'responded',
    general_employment_interest: 'responded',
    interview: 'interviewing',
    assessment: 'interviewing',
    rejection: 'rejected',
};
const APP_STATUS_ORDER = ['active', 'unknown', 'responded', 'interviewing', 'rejected', 'archived'];
async function trackApplication(userId, classified) {
    // Use the classification's action flag
    if (!classified.classification.should_create_or_update_application)
        return false;
    const appKey = buildApplicationKey(classified.platform, classified.companyName, classified.roleTitle, classified.raw.subject);
    if (!appKey)
        return false;
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
        const updates = {
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
        if (error.code === '23505')
            return false;
        log.warn('Application insert error:', error.message);
        return false;
    }
    return true;
}
// ========================================================
// RESPONSE LEAD
// ========================================================
const CATEGORY_TO_LEAD_STATUS = {
    recruiter_response: 'Replied',
    inmail_message: 'Replied',
    job_opportunity: 'New',
    general_employment_interest: 'New',
    interview: 'Meeting Booked',
    assessment: 'Contacted',
};
const LEAD_STATUS_ORDER = ['New', 'Contacted', 'Replied', 'Follow Up', 'Positive', 'Meeting Booked'];
function isNoReply(email) {
    if (!email)
        return true;
    return /noreply|no-reply/i.test(email);
}
async function trackResponseLead(userId, classified) {
    // Use the classification's action flag (no longer hardcoded to LinkedIn-only)
    if (!classified.classification.should_create_or_update_response_lead)
        return false;
    const name = classified.contactName || classified.raw.from?.name || 'Unknown Contact';
    const companyName = classified.companyName || 'Unknown';
    const platform = PLATFORM_DISPLAY[classified.platform] || 'Other';
    const senderEmail = classified.raw.from?.address || null;
    const noReply = isNoReply(senderEmail);
    const newStatus = CATEGORY_TO_LEAD_STATUS[classified.category] || 'Replied';
    let existing = null;
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
        const updates = {
            priority: 'high',
            updated_at: new Date().toISOString(),
        };
        if (newIdx > currentIdx)
            updates.response_status = newStatus;
        if (senderEmail && !noReply)
            updates.sender_email = senderEmail;
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
// EXISTING APPLICATION / CONTACT MATCH
// ========================================================
const INTEREST_CATEGORIES = new Set([
    'recruiter_response', 'inmail_message', 'job_opportunity',
    'general_employment_interest', 'interview', 'assessment',
]);
async function checkExistingApplicationInterest(userId, classified) {
    if (!INTEREST_CATEGORIES.has(classified.category))
        return false;
    if (!classified.companyName)
        return false;
    const { data: app } = await supabase
        .from('tracked_applications')
        .select('id, application_status')
        .eq('user_id', userId)
        .eq('platform', classified.platform)
        .ilike('company_name', classified.companyName)
        .maybeSingle();
    if (!app)
        return false;
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
async function checkExistingContactMatch(userId, classified) {
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
async function elevateExistingLead(leadId, currentStatus) {
    const currentIdx = LEAD_STATUS_ORDER.indexOf(currentStatus);
    const positiveIdx = LEAD_STATUS_ORDER.indexOf('Positive');
    const updates = {
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
export async function runSyncOnce() {
    const stats = {
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
    let emails;
    if (needsBackfill) {
        log.info(`Running initial ${config.backfillDays}-day backfill`);
        const since = new Date();
        since.setDate(since.getDate() - config.backfillDays);
        emails = await fetchEmails({ since });
    }
    else {
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
        const cl = classified.classification;
        if (config.dryRun) {
            log.info(`[DRY] ${cl.platform} | ${cl.category} | ` +
                `pri=${cl.priority} conf=${cl.classification_confidence.toFixed(2)} | ` +
                `company=${cl.company_name || '?'} | ` +
                `notify=${cl.should_create_notification} app=${cl.should_create_or_update_application} ` +
                `lead=${cl.should_create_or_update_response_lead} suppress=${cl.should_suppress} | ` +
                `${raw.subject.slice(0, 60)}`);
            stats.notifications++;
            continue;
        }
        // A. Check existing application interest
        const isAppInterest = await checkExistingApplicationInterest(userId, classified);
        if (isAppInterest)
            stats.contactMatches++;
        // B. Check existing contact match
        if (!isAppInterest) {
            const isContactMatch = await checkExistingContactMatch(userId, classified);
            if (isContactMatch)
                stats.contactMatches++;
        }
        // C. Insert notification (skip if suppressed and not notification-worthy)
        if (cl.should_suppress && !cl.should_create_notification) {
            stats.skipped++;
        }
        else {
            const notifCreated = await insertNotificationIfNew(userId, classified);
            if (notifCreated) {
                stats.notifications++;
            }
            else {
                stats.skipped++;
            }
        }
        // D. Track application
        const appTracked = await trackApplication(userId, classified);
        if (appTracked)
            stats.applications++;
        if (classified.category === 'rejection' && appTracked)
            stats.rejections++;
        // E. Track response lead
        const leadTracked = await trackResponseLead(userId, classified);
        if (leadTracked)
            stats.responseLeads++;
        if (raw.uid > maxUid)
            maxUid = raw.uid;
    }
    if (!config.dryRun) {
        await updateCheckpoint(state.id, maxUid, true);
        log.info(needsBackfill
            ? 'Initial backfill complete — subsequent runs will be incremental'
            : `Checkpoint updated to UID ${maxUid}`);
    }
    return stats;
}
