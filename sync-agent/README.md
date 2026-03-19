# Outreach Sync Agent

Local Windows background worker that scans your Yahoo inbox for LinkedIn and Wellfound emails, classifies them, and syncs normalized records to Supabase.

## Prerequisites

- Node.js 18+
- A Yahoo App Password ([generate one here](https://login.yahoo.com/account/security/app-passwords))
- Your Supabase project URL and **service role key** (Dashboard > Settings > API)
- An account created in the Outreach Console app (sign up first)

## Setup

```bash
cd sync-agent
npm install
```

Copy the env template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
YAHOO_EMAIL=your-yahoo-email@yahoo.com
YAHOO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SYNC_TARGET_EMAIL=your-app-login-email@example.com
```

## Run the SQL migration

Go to Supabase Dashboard > SQL Editor and run the contents of:

```
../supabase/migrations/002_email_sync.sql
```

## Test sync

Dry run (no writes, just classification output):

```bash
npm run sync:dry
```

Real sync (first run = 7-day backfill):

```bash
npm run sync
```

## Install as Windows scheduled task

Run in PowerShell (as your user, not admin):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-task.ps1
```

This creates a Task Scheduler job that runs `npm run sync` every 5 minutes.

Check the log at `sync-agent/sync.log`.

## Removing the scheduled task

```powershell
Unregister-ScheduledTask -TaskName "OutreachEmailSync"
```

## How it works

1. Connects to Yahoo IMAP (TLS, port 993)
2. Searches for emails from `linkedin.com`, `wellfound.com`, `angel.co`
3. On first run: scans past 7 days. After that: only new mail since last checkpoint
4. Classifies each email (platform, category, priority, action required)
5. Extracts company name, contact name, role title where possible
6. Upserts notification records + tracked application records to Supabase
7. Hard deduplication via message ID and fingerprint
8. Updates checkpoint for next incremental run

## Security

- Yahoo credentials and Supabase service role key stay in this local `.env` only
- They are **never** exposed to the browser
- The frontend app reads data through normal Supabase RLS policies
