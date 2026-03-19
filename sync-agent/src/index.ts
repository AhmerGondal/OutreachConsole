import { runSyncOnce, resetSyncData } from './sync.js';
import { config } from './config.js';
import { log } from './logger.js';

async function main() {
  log.info(`Outreach email sync starting${config.dryRun ? ' (DRY RUN)' : ''}${config.resetMode ? ' (RESET)' : ''}`);
  log.info(`Yahoo: ${config.yahoo.email}`);
  log.info(`Target user: ${config.syncTargetEmail}`);

  try {
    if (config.resetMode) {
      await resetSyncData();
      return;
    }

    const stats = await runSyncOnce();
    log.info(
      `Sync complete — ` +
      `fetched: ${stats.fetched}, ` +
      `notifications: ${stats.notifications}, ` +
      `applications: ${stats.applications}, ` +
      `responseLeads: ${stats.responseLeads}, ` +
      `contactMatches: ${stats.contactMatches}, ` +
      `rejections: ${stats.rejections}, ` +
      `skipped: ${stats.skipped}`
    );
  } catch (err) {
    log.error('Sync failed:', err);
    process.exit(1);
  }
}

main();
