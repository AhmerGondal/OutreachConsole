# install-task.ps1
# Registers a Windows Task Scheduler job to run the sync agent every 5 minutes.
# Run as: powershell -ExecutionPolicy Bypass -File scripts\install-task.ps1

$taskName = "OutreachEmailSync"
$syncAgentDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$syncAgentDir = Join-Path $syncAgentDir "sync-agent"

# Get the full path to npm
$npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
if (-not $npmPath) {
    Write-Host "ERROR: npm not found in PATH" -ForegroundColor Red
    exit 1
}

# Build the action
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c cd /d `"$syncAgentDir`" && npm run sync >> `"$syncAgentDir\sync.log`" 2>&1" `
    -WorkingDirectory $syncAgentDir

# Run every 5 minutes indefinitely
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration (New-TimeSpan -Days 9999)

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 3) `
    -MultipleInstances IgnoreNew

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing task: $taskName" -ForegroundColor Yellow
}

# Register
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Outreach Console email sync — scans Yahoo inbox every 5 minutes" `
    -RunLevel Limited

Write-Host ""
Write-Host "Task '$taskName' registered successfully!" -ForegroundColor Green
Write-Host "  Interval: every 5 minutes"
Write-Host "  Log file: $syncAgentDir\sync.log"
Write-Host ""
Write-Host "To remove: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
