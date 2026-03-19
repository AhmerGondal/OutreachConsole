import type { RawEmail } from './imapClient.js';

export type Platform = 'linkedin' | 'wellfound' | 'other';

export type Category =
  | 'application_confirmation'
  | 'recruiter_response'
  | 'recruiter_follow_up'
  | 'interview_invite'
  | 'rejection'
  | 'reminder'
  | 'digest'
  | 'marketing'
  | 'unknown_relevant';

export type Priority = 'high' | 'medium' | 'low';

export interface ClassifiedEmail {
  raw: RawEmail;
  platform: Platform;
  category: Category;
  priority: Priority;
  actionRequired: boolean;
  companyName: string | null;
  contactName: string | null;
  roleTitle: string | null;
  snippet: string;
  fingerprint: string;
}

// --------------- Platform detection ---------------

function detectPlatform(email: RawEmail): Platform {
  const sender = (email.from?.address || '').toLowerCase();
  if (sender.includes('linkedin.com')) return 'linkedin';
  if (sender.includes('wellfound.com') || sender.includes('angel.co')) return 'wellfound';
  return 'other';
}

// --------------- Category detection ---------------

const LINKEDIN_PATTERNS: Array<[RegExp, Category]> = [
  // High priority — human responses
  [/sent you a message/i, 'recruiter_response'],
  [/you have a new message/i, 'recruiter_response'],
  [/inmail from/i, 'recruiter_response'],
  [/wants to connect/i, 'recruiter_response'],
  [/replied to your/i, 'recruiter_follow_up'],
  [/following up/i, 'recruiter_follow_up'],
  [/follow up/i, 'recruiter_follow_up'],
  [/interview/i, 'interview_invite'],
  [/next steps/i, 'interview_invite'],
  [/schedule.*call/i, 'interview_invite'],

  // Application tracking
  [/application was sent/i, 'application_confirmation'],
  [/you applied to/i, 'application_confirmation'],
  [/application submitted/i, 'application_confirmation'],
  [/applied for/i, 'application_confirmation'],

  // Rejection
  [/we('ve| have) (decided to )?(move|go) forward with other/i, 'rejection'],
  [/unfortunately.*application/i, 'rejection'],
  [/not (moving|proceeding) forward/i, 'rejection'],
  [/update on your application/i, 'rejection'],
  [/position has been filled/i, 'rejection'],

  // Low value
  [/jobs you might/i, 'digest'],
  [/recommended for you/i, 'digest'],
  [/your weekly/i, 'digest'],
  [/people you may know/i, 'digest'],
  [/linkedin news/i, 'marketing'],
  [/linkedin premium/i, 'marketing'],
  [/try linkedin/i, 'marketing'],
  [/is hiring/i, 'reminder'],
  [/new job/i, 'reminder'],
];

const WELLFOUND_PATTERNS: Array<[RegExp, Category]> = [
  [/sent you a message/i, 'recruiter_response'],
  [/wants to connect/i, 'recruiter_response'],
  [/replied/i, 'recruiter_follow_up'],
  [/interview/i, 'interview_invite'],
  [/next steps/i, 'interview_invite'],
  [/application.*received/i, 'application_confirmation'],
  [/you applied/i, 'application_confirmation'],
  [/application.*submitted/i, 'application_confirmation'],
  [/not moving forward/i, 'rejection'],
  [/unfortunately/i, 'rejection'],
  [/new jobs/i, 'digest'],
  [/weekly digest/i, 'digest'],
  [/trending/i, 'marketing'],
];

function detectCategory(email: RawEmail, platform: Platform): Category {
  const text = `${email.subject}\n${email.text.slice(0, 500)}`;
  const patterns = platform === 'linkedin' ? LINKEDIN_PATTERNS
    : platform === 'wellfound' ? WELLFOUND_PATTERNS
    : [];

  for (const [regex, category] of patterns) {
    if (regex.test(text)) return category;
  }

  return 'unknown_relevant';
}

// --------------- Priority / Action ---------------

const PRIORITY_MAP: Record<Category, Priority> = {
  interview_invite: 'high',
  recruiter_response: 'high',
  recruiter_follow_up: 'high',
  rejection: 'medium',
  application_confirmation: 'medium',
  reminder: 'low',
  unknown_relevant: 'low',
  digest: 'low',
  marketing: 'low',
};

const ACTION_CATEGORIES = new Set<Category>([
  'interview_invite',
  'recruiter_response',
  'recruiter_follow_up',
]);

// --------------- Extraction ---------------

function extractCompany(email: RawEmail): string | null {
  const sub = email.subject;

  // "at CompanyName" pattern
  const atMatch = sub.match(/at\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[-–|,]|\s*$)/);
  if (atMatch) return atMatch[1].trim();

  // "from CompanyName sent you" pattern
  const fromMatch = sub.match(/from\s+([A-Z][A-Za-z0-9\s&.'-]+?)\s+sent/i);
  if (fromMatch) return fromMatch[1].trim();

  // "CompanyName is hiring"
  const hiringMatch = sub.match(/^([A-Z][A-Za-z0-9\s&.'-]+?)\s+is\s+hiring/i);
  if (hiringMatch) return hiringMatch[1].trim();

  // "to CompanyName" pattern
  const toMatch = sub.match(/(?:sent to|applied to .+? at)\s+([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[-–|,.]|\s*$)/i);
  if (toMatch) return toMatch[1].trim();

  return null;
}

function extractRole(email: RawEmail): string | null {
  const sub = email.subject;

  // "You applied to RoleTitle at Company"
  const appliedMatch = sub.match(/applied to\s+(.+?)\s+at\s+/i);
  if (appliedMatch) return appliedMatch[1].trim();

  // "Application submitted: RoleTitle at Company"
  const submittedMatch = sub.match(/:\s*(.+?)\s+at\s+/i);
  if (submittedMatch) return submittedMatch[1].trim();

  return null;
}

function extractContact(email: RawEmail): string | null {
  // "PersonName sent you a message"
  const sentMatch = email.subject.match(/^(.+?)\s+sent you/i);
  if (sentMatch) return sentMatch[1].trim();

  // "PersonName from Company"
  const fromMatch = email.subject.match(/^(.+?)\s+from\s+/i);
  if (fromMatch && fromMatch[1].length < 40) return fromMatch[1].trim();

  // Fall back to sender name
  if (email.from?.name && email.from.name.toLowerCase() !== 'linkedin') {
    return email.from.name;
  }

  return null;
}

function buildSnippet(email: RawEmail): string {
  // Use subject as primary snippet, truncated
  const text = email.text.replace(/\s+/g, ' ').trim();
  return text.slice(0, 200);
}

function buildFingerprint(email: RawEmail, platform: Platform, category: Category): string {
  const dateKey = email.date
    ? email.date.toISOString().slice(0, 13)
    : 'nodate';
  const normalizedSubject = email.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80);
  return `${platform}::${category}::${normalizedSubject}::${dateKey}`;
}

// --------------- Main classifier ---------------

export function classifyEmail(email: RawEmail): ClassifiedEmail {
  const platform = detectPlatform(email);
  const category = detectCategory(email, platform);
  const priority = PRIORITY_MAP[category];
  const actionRequired = ACTION_CATEGORIES.has(category);

  return {
    raw: email,
    platform,
    category,
    priority,
    actionRequired,
    companyName: extractCompany(email),
    contactName: extractContact(email),
    roleTitle: extractRole(email),
    snippet: buildSnippet(email),
    fingerprint: buildFingerprint(email, platform, category),
  };
}

export function buildApplicationKey(
  platform: Platform,
  companyName: string | null,
  roleTitle: string | null,
): string | null {
  if (!companyName) return null;
  const normCompany = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const normRole = roleTitle
    ? roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : 'unknown';
  return `${platform}::${normCompany}::${normRole}`;
}
