import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from './config.js';
import { log } from './logger.js';

export interface RawEmail {
  uid: number;
  messageId: string | undefined;
  from: { address: string; name: string } | undefined;
  subject: string;
  date: Date | undefined;
  text: string;
  inReplyTo: string | undefined;
  references: string | string[] | undefined;
}

// ── Search strategy ─────────────────────────────────────────
//
// Two tiers of IMAP searches, run sequentially inside a single
// connection.  Results are deduped by UID before returning.
//
// TIER 1 — Platform domains (high-trust, exhaustive)
//   One SEARCH per domain.  These are the known job-platform
//   senders and will always be fetched.
//
// TIER 2 — Subject-keyword searches (conservative net)
//   Catches recruiter / hiring / staffing / interview emails
//   that come from non-platform senders (direct_email).
//   Each keyword produces a narrow IMAP SUBJECT search.
//   To avoid flooding: keywords are short, high-signal phrases
//   that rarely appear in non-employment mail.

const PLATFORM_DOMAINS = [
  'linkedin.com',
  'wellfound.com',
  'angel.co',
  'mercor.com',
];

// Subject keywords for direct-email recruiter/hiring signals.
// Each entry becomes a separate IMAP SUBJECT search.
// Keep this list tight — every entry is one server round-trip.
const SUBJECT_KEYWORDS = [
  'interview',
  'your resume',
  'your background',
  'job opportunity',
  'open role',
  'open position',
  'hiring',
  'recruiter',
  'staffing',
  'talent acquisition',
  'coding challenge',
  'technical assessment',
  'application',
];

// Candidate inbox paths — Yahoo sometimes uses a different path
const INBOX_CANDIDATES = ['INBOX', 'Inbox', 'INBOX/Bulk'];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * List all mailbox folders the server exposes.
 */
async function listMailboxes(client: ImapFlow): Promise<string[]> {
  try {
    const tree = await client.list();
    const paths = tree.map((m) => m.path);
    log.info(`Available mailboxes: ${paths.join(', ')}`);
    return paths;
  } catch (err) {
    log.warn('Failed to list mailboxes:', err);
    return [];
  }
}

/**
 * Try to open a mailbox lock with retries + exponential backoff.
 */
async function openInboxWithRetry(
  client: ImapFlow,
): Promise<{ lock: { release: () => void }; path: string }> {
  for (const candidate of INBOX_CANDIDATES) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log.debug(`Attempting to open "${candidate}" (attempt ${attempt}/${MAX_RETRIES})`);
        const lock = await client.getMailboxLock(candidate);
        log.info(`Opened mailbox "${candidate}" on attempt ${attempt}`);
        return { lock, path: candidate };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = /SERVERBUG|try again|temporarily/i.test(msg);

        if (attempt < MAX_RETRIES && isTransient) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          log.warn(`SELECT "${candidate}" failed (transient), retrying in ${delay}ms — ${msg}`);
          await sleep(delay);
          continue;
        }

        log.warn(`Failed to open "${candidate}" after ${attempt} attempt(s): ${msg}`);
        break;
      }
    }
  }

  log.warn('All standard inbox candidates failed. Discovering mailboxes...');
  const folders = await listMailboxes(client);

  const inboxLike = folders.find(
    (f) => /^inbox$/i.test(f) || /inbox/i.test(f),
  );

  if (inboxLike && !INBOX_CANDIDATES.includes(inboxLike)) {
    log.info(`Trying discovered inbox-like folder: "${inboxLike}"`);
    try {
      const lock = await client.getMailboxLock(inboxLike);
      log.info(`Opened discovered mailbox "${inboxLike}"`);
      return { lock, path: inboxLike };
    } catch (err) {
      log.error(`Failed to open discovered folder "${inboxLike}":`, err);
    }
  }

  throw new Error(
    `Could not open any inbox. Available folders: [${folders.join(', ')}]. ` +
    'Yahoo may be experiencing a temporary outage — try again in a few minutes.',
  );
}

// ── Search + fetch helpers ──────────────────────────────────

async function searchAndCollect(
  client: ImapFlow,
  criteria: Record<string, unknown>,
  label: string,
  seenUids: Set<number>,
  results: RawEmail[],
): Promise<void> {
  let seqNums: number[];
  try {
    const result = await client.search(criteria);
    seqNums = Array.isArray(result) ? result : [];
  } catch {
    log.debug(`No results for ${label}`);
    return;
  }

  if (seqNums.length === 0) return;
  log.info(`Found ${seqNums.length} emails for ${label}`);

  const range = seqNums.join(',');
  for await (const msg of client.fetch(range, {
    uid: true,
    envelope: true,
    source: true,
  })) {
    try {
      if (!msg.source) continue;
      // Skip already-seen UIDs (from earlier searches)
      if (seenUids.has(msg.uid)) continue;
      seenUids.add(msg.uid);

      const parsed = await simpleParser(msg.source);
      const fromAddr = parsed.from?.value?.[0];

      results.push({
        uid: msg.uid,
        messageId: parsed.messageId || undefined,
        from: fromAddr
          ? { address: fromAddr.address || '', name: fromAddr.name || '' }
          : undefined,
        subject: parsed.subject || '',
        date: parsed.date || undefined,
        text: (parsed.text || '').slice(0, 3000),
        inReplyTo: parsed.inReplyTo || undefined,
        references: parsed.references || undefined,
      });
    } catch (err) {
      log.warn(`Failed to parse email UID ${msg.uid}:`, err);
    }
  }
}

function buildTimeCriteria(opts: {
  since?: Date;
  afterUid?: number;
}): Record<string, unknown> {
  const criteria: Record<string, unknown> = {};
  if (opts.since) criteria.since = opts.since;
  if (opts.afterUid) criteria.uid = `${opts.afterUid + 1}:*`;
  return criteria;
}

// ── Main fetch ──────────────────────────────────────────────

export async function fetchEmails(opts: {
  since?: Date;
  afterUid?: number;
}): Promise<RawEmail[]> {
  const client = new ImapFlow({
    host: config.yahoo.host,
    port: config.yahoo.port,
    secure: true,
    auth: {
      user: config.yahoo.email,
      pass: config.yahoo.appPassword,
    },
    logger: false,
  });

  const results: RawEmail[] = [];
  const seenUids = new Set<number>();
  const timeBase = buildTimeCriteria(opts);

  try {
    await client.connect();
    log.info('Connected to Yahoo IMAP');

    const { lock } = await openInboxWithRetry(client);
    try {
      // TIER 1 — Platform domain searches
      for (const domain of PLATFORM_DOMAINS) {
        await searchAndCollect(
          client,
          { ...timeBase, from: domain },
          `FROM:${domain}`,
          seenUids,
          results,
        );
      }

      // TIER 2 — Subject-keyword searches for direct recruiter emails
      for (const keyword of SUBJECT_KEYWORDS) {
        await searchAndCollect(
          client,
          { ...timeBase, subject: keyword },
          `SUBJECT:"${keyword}"`,
          seenUids,
          results,
        );
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    log.error('IMAP error:', err);
    try { await client.logout(); } catch { /* ignore */ }
    throw err;
  }

  // Sort ascending by UID
  results.sort((a, b) => a.uid - b.uid);

  log.info(`Fetched ${results.length} unique relevant emails`);
  return results;
}
