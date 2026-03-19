@echo off
:: Switch to Node 20 and run the sync agent
cd /d "C:\Users\yosae\Documents\OutreachConsole\sync-agent"

:: Use nvm to set Node 20
call nvm use 20.20.1 >nul 2>&1

:: Run sync via npx tsx (one-shot)
call npx tsx src/index.ts
