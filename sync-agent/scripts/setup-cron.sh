#!/usr/bin/env bash
# =============================================
# Setup cron job for OutreachConsole sync agent
# Run this on your Ubuntu server after deployment
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/var/log/outreach-sync.log"
NODE_BIN="$(which node)"

echo "Sync agent dir: $AGENT_DIR"
echo "Node binary:    $NODE_BIN"
echo "Log file:       $LOG_FILE"

# Ensure log file exists and is writable
sudo touch "$LOG_FILE"
sudo chown "$(whoami)" "$LOG_FILE"

# Build TypeScript to dist/
echo "Building sync agent..."
cd "$AGENT_DIR"
npm run build

# Verify dist/index.js exists
if [ ! -f "$AGENT_DIR/dist/index.js" ]; then
  echo "ERROR: dist/index.js not found after build"
  exit 1
fi

# Verify .env exists
if [ ! -f "$AGENT_DIR/.env" ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in values."
  exit 1
fi

# Create the cron entry
CRON_CMD="cd $AGENT_DIR && $NODE_BIN dist/index.js >> $LOG_FILE 2>&1"
CRON_LINE="*/5 * * * * $CRON_CMD"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -qF "outreach-sync"; then
  echo "Cron entry already exists. Replacing..."
  crontab -l | grep -v "outreach-sync" | crontab -
fi

# Add the cron entry with a comment
(crontab -l 2>/dev/null; echo "# outreach-sync — runs every 5 minutes"; echo "$CRON_LINE") | crontab -

echo ""
echo "Cron installed successfully!"
echo "Entry: $CRON_LINE"
echo ""
echo "Useful commands:"
echo "  crontab -l                          # view cron"
echo "  tail -f $LOG_FILE     # watch logs"
echo "  crontab -l | grep -v outreach-sync | crontab -  # remove"
