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

const SEARCH_DOMAINS = ['linkedin.com', 'wellfound.com', 'angel.co'];

// Candidate inbox paths — Yahoo sometimes uses a different path
const INBOX_CANDIDATES = ['INBOX', 'Inbox', 'INBOX/Bulk'];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * List all mailbox folders the server exposes.
 * Used for diagnostics when INBOX selection fails.
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
 * If all INBOX_CANDIDATES fail, discovers the real inbox from the folder list.
 */
async function openInboxWithRetry(
  client: ImapFlow,
): Promise<{ lock: { release: () => void }; path: string }> {
  // First, try the standard candidates with retries
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

        // Non-transient or last attempt — try next candidate
        log.warn(`Failed to open "${candidate}" after ${attempt} attempt(s): ${msg}`);
        break;
      }
    }
  }

  // All candidates failed — discover folders and try inbox-like paths
  log.warn('All standard inbox candidates failed. Discovering mailboxes...');
  const folders = await listMailboxes(client);

  // Look for any folder whose path looks like an inbox
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

  try {
    await client.connect();
    log.info('Connected to Yahoo IMAP');

    const { lock } = await openInboxWithRetry(client);
    try {
      for (const domain of SEARCH_DOMAINS) {
        const criteria: Record<string, unknown> = { from: domain };

        if (opts.since) {
          criteria.since = opts.since;
        }
        if (opts.afterUid) {
          criteria.uid = `${opts.afterUid + 1}:*`;
        }

        let seqNums: number[];
        try {
          const result = await client.search(criteria);
          seqNums = Array.isArray(result) ? result : [];
        } catch {
          log.debug(`No results for domain ${domain}`);
          continue;
        }

        if (seqNums.length === 0) continue;
        log.info(`Found ${seqNums.length} emails from ${domain}`);

        const range = seqNums.join(',');
        for await (const msg of client.fetch(range, {
          uid: true,
          envelope: true,
          source: true,
        })) {
          try {
            if (!msg.source) continue;
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
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    log.error('IMAP error:', err);
    try { await client.logout(); } catch { /* ignore */ }
    throw err;
  }

  // Deduplicate by UID and sort ascending
  const seen = new Set<number>();
  const unique = results.filter((r) => {
    if (seen.has(r.uid)) return false;
    seen.add(r.uid);
    return true;
  });
  unique.sort((a, b) => a.uid - b.uid);

  log.info(`Fetched ${unique.length} unique relevant emails`);
  return unique;
}
