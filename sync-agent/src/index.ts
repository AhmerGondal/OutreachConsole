import { runSyncOnce } from './sync.js';
import { config } from './config.js';
import { log } from './logger.js';

async function main() {
  log.info(`Outreach email sync starting${config.dryRun ? ' (DRY RUN)' : ''}`);
  log.info(`Yahoo: ${config.yahoo.email}`);
  log.info(`Target user: ${config.syncTargetEmail}`);

  try {
    const stats = await runSyncOnce();
    log.info(
      `Sync complete — ` +
      `fetched: ${stats.fetched}, ` +
      `notifications: ${stats.notifications}, ` +
      `applications: ${stats.applications}, ` +
      `skipped: ${stats.skipped}`
    );
  } catch (err) {
    log.error('Sync failed:', err);
    process.exit(1);
  }
}

main();
