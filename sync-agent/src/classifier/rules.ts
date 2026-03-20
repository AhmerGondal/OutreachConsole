import type { NormalizedEmail } from './types.js';
import type { Platform, Category } from './types.js';

// ── Platform detection ──────────────────────────────────────

export function detectPlatform(email: NormalizedEmail): Platform {
  const addr = email.senderAddress;
  const c = email.combined;

  if (addr.includes('linkedin.com') || c.includes('linkedin'))
    return 'linkedin';

  if (addr.includes('wellfound.com') || addr.includes('angel.co') || c.includes('wellfound'))
    return 'wellfound';

  if (
    addr.includes('mercor') ||
    c.includes('on mercor') ||
    c.includes('the mercor team') ||
    (c.includes('mercor') && /application\s+submitted/i.test(email.combined))
  )
    return 'mercor';

  // Direct human email: not a platform sender, has a name, not noreply
  if (
    email.senderName &&
    !/(noreply|no-reply|notifications|mailer|donotreply)/i.test(addr) &&
    addr.includes('@')
  )
    return 'direct_email';

  return 'other';
}

// ── Helpers ─────────────────────────────────────────────────

function s(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

// ── Category detection — ordered by precedence ──────────────

export function detectCategory(
  email: NormalizedEmail,
  platform: Platform,
): Category {
  const sub = email.subjectLower;
  const body = email.bodyLower;
  const c = email.combined;

  // 1. INTERVIEW (highest precedence)
  if (s(c, /schedule.{0,20}interview/)) return 'interview';
  if (s(c, /interview scheduled/)) return 'interview';
  if (s(c, /invited? (?:you )?to interview/)) return 'interview';
  if (s(c, /book a time/)) return 'interview';
  if (s(c, /choose a time/)) return 'interview';
  if (s(c, /next round interview/)) return 'interview';
  if (s(c, /interview with/)) return 'interview';
  if (s(c, /let'?s set up a call/)) return 'interview';
  if (s(c, /available for a call/)) return 'interview';
  if (s(c, /speak with our team/)) return 'interview';
  if (s(c, /schedule your first interview/)) return 'interview';
  if (s(sub, /next steps.{0,15}interview/)) return 'interview';

  // 2. ASSESSMENT
  if (s(c, /technical assessment/)) return 'assessment';
  if (s(c, /coding challenge/)) return 'assessment';
  if (s(c, /complete this exercise/)) return 'assessment';
  if (s(c, /screening test/)) return 'assessment';
  if (s(c, /take-?home/)) return 'assessment';
  if (s(c, /evaluation task/)) return 'assessment';
  if (s(c, /assessment link/)) return 'assessment';
  if (s(c, /screening questionnaire/)) return 'assessment';

  // 3. REJECTION
  if (s(c, /not moving forward/)) return 'rejection';
  if (s(c, /not been successful/)) return 'rejection';
  if (s(c, /application unsuccessful/)) return 'rejection';
  if (s(c, /not selected/)) return 'rejection';
  if (s(c, /chosen to not move forward/)) return 'rejection';
  if (s(c, /will not be moving forward/)) return 'rejection';
  if (s(c, /decided not to move forward/)) return 'rejection';
  if (s(c, /we('ve| have) (decided to )?(move|go) forward with other/)) return 'rejection';
  if (s(c, /unfortunately.{0,40}application/)) return 'rejection';
  if (s(c, /not a (good )?fit at this time/)) return 'rejection';
  if (s(sub, /position has been filled/)) return 'rejection';
  if (s(sub, /we will not be/)) return 'rejection';
  if (s(sub, /not (moving|proceeding) forward/)) return 'rejection';
  // "update on your application" is very often a rejection on LinkedIn
  if (platform === 'linkedin' && s(sub, /update on your application/)) return 'rejection';

  // 4. RECRUITER RESPONSE (real human outreach)
  if (s(c, /your background looks to align/)) return 'recruiter_response';
  if (s(c, /are you looking into new opportunities/)) return 'recruiter_response';
  if (s(c, /if this role is not a fit/)) return 'recruiter_response';
  if (s(c, /attach your resume/)) return 'recruiter_response';
  if (s(c, /pay rate/)) return 'recruiter_response';
  if (s(c, /let me know if you are interested/)) return 'recruiter_response';
  if (s(c, /we partner with top companies/)) return 'recruiter_response';
  if (s(c, /help schedule interviews/)) return 'recruiter_response';
  if (s(c, /wanted to discuss a role/)) return 'recruiter_response';
  if (s(c, /interested in your background/)) return 'recruiter_response';
  if (s(c, /would like to connect regarding/)) return 'recruiter_response';
  if (s(c, /would you be open/)) return 'recruiter_response';
  if (s(sub, /reach(ing)? out/)) return 'recruiter_response';
  // Body-only recruiter signals
  if (s(body, /sent you a message on linkedin/)) return 'recruiter_response';
  if (s(body, /new message awaits your response/)) return 'recruiter_response';
  if (s(body, /respond to .{1,40}linkedin message/)) return 'recruiter_response';
  // Wellfound human signals
  if (platform === 'wellfound' && s(c, /interested in your profile/)) return 'recruiter_response';
  if (platform === 'wellfound' && s(c, /would like to talk/)) return 'recruiter_response';
  // Follow-ups are recruiter_response in the new schema
  if (s(sub, /replied to your/)) return 'recruiter_response';
  if (s(sub, /following up/)) return 'recruiter_response';
  if (s(sub, /are you (still )?interested/)) return 'recruiter_response';
  if (s(sub, /checking in/)) return 'recruiter_response';

  // 5. INMAIL / MESSAGE ALERT
  if (s(sub, /messaged you/)) return 'inmail_message';
  if (s(sub, /sent you a message/)) return 'inmail_message';
  if (s(sub, /you have a new message/)) return 'inmail_message';
  if (s(sub, /new message awaits/)) return 'inmail_message';
  if (s(sub, /inmail/)) return 'inmail_message';
  if (s(sub, /view message/)) return 'inmail_message';
  if (s(sub, /1 new message/)) return 'inmail_message';

  // 6. JOB OPPORTUNITY (human presenting a role, not a reply to existing app)
  if (s(c, /learn about a new opportunity/)) return 'job_opportunity';
  if (s(sub, /opportunity.{0,10}at\b/)) return 'job_opportunity';
  if (s(c, /your background aligns with the role/)) return 'job_opportunity';

  // 7. APPLICATION CONFIRMATION
  if (detectApplicationConfirmation(email, platform)) return 'application_confirmation';

  // 8. APPLICATION UPDATE
  if (s(c, /under review/)) return 'application_update';
  if (s(c, /in review/)) return 'application_update';
  if (s(c, /being considered/)) return 'application_update';
  if (s(c, /reviewing your application/)) return 'application_update';
  // Wellfound "An update from X" that isn't rejection (already caught above)
  if (platform === 'wellfound' && s(sub, /an update from/)) return 'application_update';
  // Mercor review updates
  if (platform === 'mercor' && s(c, /review in progress/)) return 'application_update';
  if (platform === 'mercor' && s(c, /profile under consideration/)) return 'application_update';
  if (platform === 'mercor' && s(c, /team evaluating/)) return 'application_update';

  // 9. CONNECTION ACCEPTANCE
  if (s(sub, /accepted your (invitation|connection|request)/)) return 'connection_acceptance';
  if (s(sub, /your invitation was accepted/)) return 'connection_acceptance';
  if (s(sub, /explore their network/)) return 'connection_acceptance';
  if (s(sub, /wants to connect/)) return 'connection_acceptance';
  if (s(sub, /endorsed you/)) return 'connection_acceptance';
  if (s(sub, /congratulate/)) return 'connection_acceptance';

  // 10. DIGEST / PROMO / NOISE
  if (detectNoise(email, platform)) return detectNoiseCategory(email);

  // 11. GENERAL EMPLOYMENT INTEREST — handled in scoring.ts, fallback here
  // (The main index.ts will override to general_employment_interest if job interest score is high enough)

  return 'unknown';
}

// ── Application confirmation sub-rules ──────────────────────

function detectApplicationConfirmation(
  email: NormalizedEmail,
  platform: Platform,
): boolean {
  const sub = email.subjectLower;
  const c = email.combined;

  // LinkedIn
  if (platform === 'linkedin') {
    if (s(sub, /application was sent/)) return true;
    if (s(sub, /you applied to/)) return true;
    if (s(sub, /application submitted/)) return true;
    if (s(sub, /applied for/)) return true;
    if (s(sub, /thanks for applying/)) return true;
    if (
      s(sub, /your application/) &&
      !s(sub, /unfortunately|not moving|not proceeding|forward with other|filled/) &&
      s(c, /has been (sent|submitted|received)/)
    )
      return true;
  }

  // Wellfound
  if (platform === 'wellfound') {
    if (s(sub, /application to .+ successfully submitted/)) return true;
    if (s(sub, /application.*submitted/)) return true;
    if (s(sub, /application.*received/)) return true;
    if (s(sub, /you applied/)) return true;
    if (s(sub, /thanks for (your )?appl/)) return true;
    if (s(sub, /your application/) && !s(sub, /unfortunately|not moving/)) return true;
  }

  // Mercor
  if (platform === 'mercor') {
    if (s(sub, /application submitted/)) return true;
    if (s(c, /we've received your application/)) return true;
    if (s(c, /our team will review it shortly/)) return true;
  }

  return false;
}

// ── Noise sub-rules ─────────────────────────────────────────

function detectNoise(email: NormalizedEmail, platform: Platform): boolean {
  const sub = email.subjectLower;

  if (s(sub, /jobs you (may|might)/)) return true;
  if (s(sub, /recommended for you/)) return true;
  if (s(sub, /your weekly/)) return true;
  if (s(sub, /people you may know/)) return true;
  if (s(sub, /who viewed your profile/)) return true;
  if (s(sub, /skills? quiz/)) return true;
  if (s(sub, /linkedin news/)) return true;
  if (s(sub, /linkedin premium/)) return true;
  if (s(sub, /try linkedin/)) return true;
  if (s(sub, /is hiring/)) return true;
  if (s(sub, /new jobs?$/)) return true;
  if (s(sub, /apply now/)) return true;
  if (s(sub, /weekly digest/)) return true;
  if (s(sub, /trending/)) return true;
  if (s(sub, /browse more jobs/)) return true;
  if (s(sub, /top jobs/)) return true;
  if (s(sub, /install widget/)) return true;
  if (s(sub, /update your profile/)) return true;
  if (s(sub, /explore opportunities/)) return true;

  // Mercor promo/faq-only
  if (platform === 'mercor' && s(sub, /faq/)) return true;
  if (platform === 'mercor' && s(email.combined, /browse opportunities/) && !s(email.combined, /application/)) return true;
  if (platform === 'mercor' && s(sub, /feedback on the application process/)) return true;

  return false;
}

function detectNoiseCategory(email: NormalizedEmail): Category {
  const sub = email.subjectLower;
  if (s(sub, /digest|weekly|your weekly/)) return 'digest';
  if (s(sub, /jobs you (may|might)/)) return 'digest';
  if (s(sub, /recommended for you/)) return 'digest';
  if (s(sub, /people you may know/)) return 'digest';
  if (s(sub, /who viewed your profile/)) return 'digest';
  if (s(sub, /new jobs?$/)) return 'digest';
  if (s(sub, /premium|news|trending|try linkedin/)) return 'promo';
  if (s(sub, /is hiring|apply now/)) return 'promo';
  return 'noise';
}
