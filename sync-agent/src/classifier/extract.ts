import type { NormalizedEmail, Platform, LeadType } from './types.js';

// ── Company name extraction ─────────────────────────────────

export function extractCompany(
  email: NormalizedEmail,
  platform: Platform,
): string | null {
  const sub = email.subject;
  const body = email.body.slice(0, 1500);

  // Wellfound: "Application to [Role] at [Company] successfully submitted"
  if (platform === 'wellfound') {
    const wfMatch = sub.match(
      /application to\s+.+?\s+at\s+(.+?)(?:\s+successfully|\s*$)/i,
    );
    if (wfMatch) return wfMatch[1].trim();

    const wfSimple = sub.match(
      /application to\s+(.+?)(?:\s+submitted|\s+received|\s*$)/i,
    );
    if (wfSimple) return wfSimple[1].trim();

    // "An update from [Company]"
    const updateMatch = sub.match(/an update from\s+(.+?)$/i);
    if (updateMatch) return updateMatch[1].trim();
  }

  // Mercor: company is Mercor itself for applications unless another employer is named
  if (platform === 'mercor') {
    // Try to find a named employer in body first
    const employerMatch = body.match(
      /(?:company|employer|client)[:\s]+([A-Za-z][A-Za-z0-9\s&.'-]{1,40})/i,
    );
    if (employerMatch) return employerMatch[1].trim();
    // Default to Mercor
    return 'Mercor';
  }

  // "Your application was sent to [Company]"
  const sentTo = sub.match(/application was sent to\s+(.+?)$/i);
  if (sentTo) return sentTo[1].trim();

  // " at [Company]" in subject
  const atMatch = sub.match(
    /\bat\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,!]|\s*$)/i,
  );
  if (atMatch) return atMatch[1].trim();

  // "[Name] from [Company]"
  const fromMatch = sub.match(
    /\bfrom\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s+sent|\s+is|\s*[-–|,]|\s*$)/i,
  );
  if (fromMatch) return fromMatch[1].trim();

  // "applied to [Role] at [Company]"
  const appliedAt = sub.match(
    /applied to .+? at\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,.]|\s*$)/i,
  );
  if (appliedAt) return appliedAt[1].trim();

  // Body fallbacks
  const bodyCompany = body.match(
    /company(?:\s*name)?[:\s]+([A-Za-z][A-Za-z0-9\s&.'-]{1,40})/i,
  );
  if (bodyCompany) return bodyCompany[1].trim();

  const bodyAt = body.match(
    /\bat\s+([A-Z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,!.]|\s*\n)/,
  );
  if (bodyAt) return bodyAt[1].trim();

  // For direct email, try domain-based company name
  if (platform === 'direct_email' && email.senderAddress) {
    const domain = email.senderAddress.split('@')[1];
    if (domain && !/(gmail|yahoo|hotmail|outlook|icloud|aol|proton)/i.test(domain)) {
      const name = domain.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  return null;
}

// ── Role title extraction ───────────────────────────────────

export function extractRole(
  email: NormalizedEmail,
  platform: Platform,
): string | null {
  const sub = email.subject;
  const body = email.body.slice(0, 1500);

  // Wellfound: "Application to [Role] at [Company]"
  if (platform === 'wellfound') {
    const wfMatch = sub.match(/application to\s+(.+?)\s+at\s+/i);
    if (wfMatch) return wfMatch[1].trim();
  }

  // Mercor: role is often in subject like "Application Submitted - [Role] on Mercor"
  if (platform === 'mercor') {
    const mercorMatch = sub.match(
      /application submitted\s*[-–:]\s*(.+?)\s+on mercor/i,
    );
    if (mercorMatch) return mercorMatch[1].trim();

    const dashMatch = sub.match(/[-–:]\s*(.+?)\s+(?:on|at)\s+mercor/i);
    if (dashMatch) return dashMatch[1].trim();
  }

  // "applied to/for [Role] at"
  const appliedMatch = sub.match(/applied (?:to|for)\s+(.+?)\s+at\s+/i);
  if (appliedMatch) return appliedMatch[1].trim();

  // "application for [Role]"
  const forMatch = sub.match(
    /application\s+for\s+(.+?)(?:\s+at\s+|\s*[-–|,.]|\s*$)/i,
  );
  if (forMatch) return forMatch[1].trim();

  // "submitted: [Role] at"
  const submittedMatch = sub.match(/submitted[:\s]+(.+?)\s+at\s+/i);
  if (submittedMatch) return submittedMatch[1].trim();

  // Body fallbacks
  const bodyRole = body.match(
    /(?:role|position|job\s*title)[:\s]+([A-Za-z][^\n]{2,50})/i,
  );
  if (bodyRole) return bodyRole[1].trim();

  return null;
}

// ── Contact name extraction ─────────────────────────────────

const SKIP_SENDER_NAMES = new Set([
  'linkedin', 'wellfound', 'angellist', 'notifications', 'jobs',
  'no-reply', 'noreply', 'team', 'mercor', 'support', 'info',
  'careers', 'talent', 'hiring',
]);

export function extractContact(email: NormalizedEmail): string | null {
  const sub = email.subject;

  // "[Name] sent you" / "[Name] just messaged you"
  const sentMatch = sub.match(/^(.+?)\s+(?:sent you|just messaged)/i);
  if (sentMatch && sentMatch[1].length < 50) return sentMatch[1].trim();

  // "[Name] from [Company]"
  const fromMatch = sub.match(/^(.+?)\s+from\s+/i);
  if (fromMatch && fromMatch[1].length < 40) return fromMatch[1].trim();

  // Sender name (skip platforms and generic senders)
  if (email.senderName) {
    const normalized = email.senderName.toLowerCase().replace(/[^a-z]/g, '');
    if (!SKIP_SENDER_NAMES.has(normalized) && email.senderName.length < 50) {
      return email.senderName;
    }
  }

  return null;
}

// ── Location extraction ─────────────────────────────────────

export function extractLocation(email: NormalizedEmail): string | null {
  const body = email.body.slice(0, 2000);

  const locMatch = body.match(
    /(?:location|based in|remote|on-?site|hybrid)[:\s]+([A-Za-z][^\n]{2,40})/i,
  );
  if (locMatch) return locMatch[1].trim();

  return null;
}

// ── Applied date extraction ─────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

export function extractAppliedDate(email: NormalizedEmail): string | null {
  const c = `${email.subject}\n${email.body.slice(0, 1500)}`;

  // "Applied on March 18, 2026" or "Applied on 2026-03-18"
  const longMatch = c.match(
    /applied\s+on\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (longMatch) {
    const month = MONTH_MAP[longMatch[1].toLowerCase()];
    if (month) {
      const day = longMatch[2].padStart(2, '0');
      return `${longMatch[3]}-${month}-${day}`;
    }
  }

  const isoMatch = c.match(/applied\s+on\s+(\d{4}-\d{2}-\d{2})/i);
  if (isoMatch) return isoMatch[1];

  // "You applied today" — use email date
  if (/you applied today/i.test(c) && email.raw.date) {
    return email.raw.date.toISOString().slice(0, 10);
  }

  return null;
}

// ── Lead type detection ─────────────────────────────────────

export function detectLeadType(email: NormalizedEmail, platform: Platform): LeadType {
  const c = email.combined;
  const name = email.senderName.toLowerCase();

  // Content-based types take priority over sender-address heuristics
  if (/founder|co-?founder/i.test(c) || /founder|co-?founder/i.test(name)) {
    return 'founder';
  }

  if (/staffing|recruiting agency|placement|consulting.*firm|we partner with/i.test(c)) {
    return 'staffing_agency';
  }

  if (/hiring manager|head of engineering|team lead|engineering manager|vp of/i.test(c)) {
    return 'hiring_manager';
  }

  if (/recruiter|talent acquisition|recruiting/i.test(c)) {
    return 'recruiter';
  }

  if (platform === 'linkedin' || platform === 'wellfound' || platform === 'mercor') {
    return 'platform_system';
  }

  return 'unknown';
}
