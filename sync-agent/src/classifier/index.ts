import type { RawEmail } from '../imapClient.js';
import type {
  Platform,
  Category,
  Priority,
  ApplicationStatus,
  Classification,
  ClassifiedEmail,
  NormalizedEmail,
} from './types.js';
import { normalize } from './normalize.js';
import { detectPlatform, detectCategory } from './rules.js';
import {
  extractCompany,
  extractRole,
  extractContact,
  extractLocation,
  extractAppliedDate,
  detectLeadType,
} from './extract.js';
import {
  scoreJobInterest,
  scoreConfidence,
  needsReview,
} from './scoring.js';

// Re-export types for consumers
export type { Platform, Category, Priority, Classification, ClassifiedEmail };
export type { ApplicationStatus } from './types.js';

// ── Priority map ────────────────────────────────────────────

const PRIORITY_MAP: Record<Category, Priority> = {
  interview: 'high',
  assessment: 'high',
  recruiter_response: 'high',
  inmail_message: 'high',
  job_opportunity: 'high',
  general_employment_interest: 'medium',
  rejection: 'medium',
  application_update: 'medium',
  application_confirmation: 'low',
  connection_acceptance: 'low',
  digest: 'low',
  promo: 'low',
  noise: 'low',
  unknown: 'low',
};

// ── Action flags ────────────────────────────────────────────

const NOTIFY_CATEGORIES = new Set<Category>([
  'recruiter_response',
  'inmail_message',
  'job_opportunity',
  'general_employment_interest',
  'interview',
  'assessment',
  'rejection',
  'application_update',
]);

const APP_CATEGORIES = new Set<Category>([
  'application_confirmation',
  'application_update',
  'rejection',
  'interview',
  'assessment',
]);

const LEAD_CATEGORIES = new Set<Category>([
  'recruiter_response',
  'inmail_message',
  'job_opportunity',
  'general_employment_interest',
  'interview',
  'assessment',
]);

const SUPPRESS_CATEGORIES = new Set<Category>([
  'application_confirmation',
  'connection_acceptance',
  'digest',
  'promo',
  'noise',
]);

// ── Application status mapping ──────────────────────────────

function resolveAppStatus(category: Category): ApplicationStatus {
  switch (category) {
    case 'application_confirmation': return 'applied';
    case 'application_update': return 'in_review';
    case 'interview': return 'interview';
    case 'assessment': return 'assessment';
    case 'rejection': return 'rejected';
    default: return null;
  }
}

// ── Mercor stale rule ───────────────────────────────────────

function resolveMercorStaleRule(
  platform: Platform,
  category: Category,
): { applies: boolean; expire_if_no_update_after_days: number | null } {
  if (platform === 'mercor' && category === 'application_confirmation') {
    return { applies: true, expire_if_no_update_after_days: 30 };
  }
  return { applies: false, expire_if_no_update_after_days: null };
}

// ── Response lead eligibility ───────────────────────────────
// Conservative: no leads from generic platform confirmations, rejections,
// Wellfound system emails, or Mercor confirmations

function shouldCreateLead(
  category: Category,
  platform: Platform,
  leadType: string | null,
): boolean {
  if (!LEAD_CATEGORIES.has(category)) return false;

  // Don't create leads from platform system emails for these categories
  if (leadType === 'platform_system') {
    // Exception: platform system inmail alerts still warrant a lead
    if (category === 'inmail_message') return true;
    return false;
  }

  // Wellfound: only create lead if clearly human outreach
  if (platform === 'wellfound' && category !== 'recruiter_response') return false;

  return true;
}

// ── Snippet and summary ─────────────────────────────────────

function buildSnippet(
  email: NormalizedEmail,
  contactName: string | null,
  companyName: string | null,
  category: Category,
  platform: Platform,
): string | null {
  const contact = contactName || email.senderName || null;
  const company = companyName;

  switch (category) {
    case 'inmail_message':
      return contact
        ? `${contact}${company ? ` from ${company}` : ''} sent you a ${platform === 'linkedin' ? 'LinkedIn ' : ''}message.`
        : null;
    case 'application_confirmation':
      return company
        ? `Your ${company} application was submitted.`
        : null;
    case 'rejection':
      return company
        ? `${company} did not move forward with your application.`
        : null;
    case 'interview':
      return company
        ? `Interview opportunity from ${company}.`
        : null;
    case 'assessment':
      return company
        ? `Assessment request from ${company}.`
        : null;
    case 'recruiter_response':
      return contact
        ? `${contact}${company ? ` from ${company}` : ''} is reaching out about an opportunity.`
        : null;
    default:
      return null;
  }
}

function buildSummary(
  email: NormalizedEmail,
  category: Category,
  platform: Platform,
  companyName: string | null,
  roleTitle: string | null,
  contactName: string | null,
): string {
  const platformLabel =
    platform === 'linkedin' ? 'LinkedIn' :
    platform === 'wellfound' ? 'Wellfound' :
    platform === 'mercor' ? 'Mercor' :
    platform === 'direct_email' ? 'Direct email' : 'Email';

  const role = roleTitle ? ` for ${roleTitle}` : '';
  const company = companyName ? ` at ${companyName}` : '';
  const contact = contactName ? ` from ${contactName}` : '';

  switch (category) {
    case 'application_confirmation':
      return `${platformLabel} confirmed a submitted application${role}${company}.`;
    case 'rejection':
      return `${platformLabel} rejection${role}${company}.`;
    case 'interview':
      return `${platformLabel} interview request${role}${company}.`;
    case 'assessment':
      return `${platformLabel} assessment request${role}${company}.`;
    case 'recruiter_response':
      return `${platformLabel} recruiter message${contact}${company} requires follow-up.`;
    case 'inmail_message':
      return `${platformLabel} message${contact}${company} requires follow-up.`;
    case 'job_opportunity':
      return `${platformLabel} job opportunity${role}${company}.`;
    case 'general_employment_interest':
      return `${platformLabel} employment interest${contact}${company}.`;
    case 'application_update':
      return `${platformLabel} application update${role}${company}.`;
    case 'connection_acceptance':
      return `${platformLabel} connection accepted${contact}.`;
    default:
      return `${platformLabel} ${category}${company}.`;
  }
}

// ── Reasoning tags ──────────────────────────────────────────

function buildReasoningTags(
  platform: Platform,
  category: Category,
  jobInterestDetected: boolean,
  suppress: boolean,
): string[] {
  const tags: string[] = [platform, category];
  if (jobInterestDetected) tags.push('job_interest');
  if (suppress) tags.push('suppressed');
  return tags;
}

// ── Fingerprint ─────────────────────────────────────────────

function buildFingerprint(
  raw: RawEmail,
  platform: Platform,
  category: Category,
): string {
  if (raw.messageId) return `msgid::${raw.messageId}`;
  const dateKey = raw.date ? raw.date.toISOString().slice(0, 13) : 'nodate';
  const normalizedSubject = (raw.subject || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80);
  return `${platform}::${category}::${normalizedSubject}::${dateKey}`;
}

// ── Main classifier ─────────────────────────────────────────

export function classifyEmail(raw: RawEmail): ClassifiedEmail {
  const email = normalize(raw);

  const platform = detectPlatform(email);
  let category = detectCategory(email, platform);

  // Extraction
  const companyName = extractCompany(email, platform);
  const roleTitle = extractRole(email, platform);
  const contactName = extractContact(email);
  const location = extractLocation(email);
  const appliedDate = extractAppliedDate(email);
  const leadType = detectLeadType(email, platform);

  // Job interest scoring (for direct/unknown emails, or to enrich unknown category)
  const jobInterest = scoreJobInterest(email);

  // Upgrade unknown to general_employment_interest if job interest is high enough
  if (
    category === 'unknown' &&
    jobInterest.detected &&
    (platform === 'direct_email' || platform === 'other' || platform === 'email')
  ) {
    category = 'general_employment_interest';
  }

  // Mercor: if both confirmation + stronger signal, prefer stronger
  if (
    platform === 'mercor' &&
    category === 'application_confirmation'
  ) {
    const c = email.combined;
    if (/assessment|coding challenge|technical assessment/i.test(c)) category = 'assessment';
    else if (/schedule.{0,20}interview|book a time/i.test(c)) category = 'interview';
  }

  // Derive all fields
  const priority = PRIORITY_MAP[category];
  const actionRequired =
    category === 'interview' ||
    category === 'assessment' ||
    category === 'recruiter_response' ||
    category === 'inmail_message' ||
    category === 'job_opportunity' ||
    category === 'general_employment_interest';

  const shouldSuppress = SUPPRESS_CATEGORIES.has(category);
  const shouldNotify = NOTIFY_CATEGORIES.has(category);
  const shouldApp = APP_CATEGORIES.has(category);
  const shouldLead = shouldCreateLead(category, platform, leadType);

  const appStatus = resolveAppStatus(category);
  const mercorStale = resolveMercorStaleRule(platform, category);

  const confidence = scoreConfidence(
    email, platform, category, companyName, roleTitle, contactName,
  );
  const review = needsReview(
    confidence, category, platform, companyName, roleTitle, jobInterest.strength,
  );

  const snippet = buildSnippet(email, contactName, companyName, category, platform);
  const summary = buildSummary(email, category, platform, companyName, roleTitle, contactName);
  const tags = buildReasoningTags(platform, category, jobInterest.detected, shouldSuppress);
  const fingerprint = buildFingerprint(raw, platform, category);

  const classification: Classification = {
    platform,
    category,
    priority,
    action_required: actionRequired,
    should_create_notification: shouldNotify,
    should_create_or_update_application: shouldApp,
    should_create_or_update_response_lead: shouldLead,
    should_suppress: shouldSuppress,
    company_name: companyName,
    role_title: roleTitle,
    contact_name: contactName,
    sender_name: email.senderName || null,
    sender_email: email.senderAddress || null,
    location,
    applied_date: appliedDate,
    application_status: appStatus,
    lead_type: leadType,
    job_interest_detected: jobInterest.detected,
    job_interest_strength: jobInterest.strength,
    job_interest_score: jobInterest.score,
    job_interest_reason: jobInterest.reason,
    message_snippet: snippet,
    summary,
    reasoning_tags: tags,
    classification_confidence: confidence,
    needs_review: review,
    mercor_stale_rule: mercorStale,
    fingerprint,
  };

  // Return backward-compatible ClassifiedEmail wrapper
  return {
    raw,
    platform,
    category,
    priority,
    actionRequired: actionRequired,
    companyName,
    contactName,
    roleTitle,
    snippet: snippet || email.body.slice(0, 200),
    fingerprint,
    classification,
  };
}

// ── Application key builder (preserved from original) ───────

export function buildApplicationKey(
  platform: Platform,
  companyName: string | null,
  roleTitle: string | null,
  fallbackSubject?: string,
): string | null {
  if (companyName) {
    const normCompany = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const normRole = roleTitle
      ? roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : 'unknown';
    return `${platform}|${normCompany}|${normRole}`;
  }
  if (fallbackSubject) {
    const normSubject = fallbackSubject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60);
    return `${platform}|unmatched|${normSubject}`;
  }
  return null;
}
