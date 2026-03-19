import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  yahoo: {
    email: required('YAHOO_EMAIL'),
    appPassword: required('YAHOO_APP_PASSWORD'),
    host: 'imap.mail.yahoo.com',
    port: 993,
  },
  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  syncTargetEmail: required('SYNC_TARGET_EMAIL'),
  backfillDays: 7,
  dryRun: process.argv.includes('--dry-run'),
} as const;
