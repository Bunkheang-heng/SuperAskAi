<#
.SYNOPSIS
  Register (or remove) the weekly SuperAsk content-monitoring crawl.

.DESCRIPTION
  Creates a per-user Windows scheduled task that runs `npm run crawl:weekly`
  once a week. No administrator rights are required and nothing is installed
  system-wide — the task runs as the current user and can be removed with
  -Uninstall.

  WHAT THE WEEKLY RUN DOES
    Crawls priority 1 and 2 sources and raises change signals to
    var/review-queue.jsonl. It does NOT publish anything, does not touch
    data/kb/, and does not change a single citizen-facing answer (FR-49).
    A steward approving a change is a separate, human step.

  WHY SUNDAY 02:00 BY DEFAULT
    Off-peak in Cambodia (ICT, UTC+7), so a 40-source crawl lands when ministry
    sites are least likely to be serving citizens. Change it with -DayOfWeek and
    -At if that clashes with a maintenance window.

  BEFORE YOU RUN THIS
    Set MONITOR_CONTACT to a mailbox someone actually reads. It goes in the
    User-Agent on every request to government infrastructure, and it is the only
    way an operator who has a problem with the crawler can reach you.

.EXAMPLE
  .\scripts\schedule-weekly.ps1
  .\scripts\schedule-weekly.ps1 -DayOfWeek Saturday -At 23:30
  .\scripts\schedule-weekly.ps1 -Uninstall
#>

[CmdletBinding()]
param(
    [string]$TaskName = "SuperAsk content monitoring (weekly)",
    [ValidateSet("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")]
    [string]$DayOfWeek = "Sunday",
    [string]$At = "02:00",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

if ($Uninstall) {
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Output "Removed scheduled task: $TaskName"
    } catch {
        Write-Output "No scheduled task named '$TaskName' was registered."
    }
    return
}

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
if ($null -eq $npm) { $npm = (Get-Command npm -ErrorAction SilentlyContinue) }
if ($null -eq $npm) { throw "npm not found on PATH. Install Node.js, or run the crawl manually." }

# Log every run. A scheduled task that fails silently for six weeks is worse
# than no scheduled task, because the review queue looks calm rather than stale.
$logDir = Join-Path $projectRoot "var\monitor\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }

$command = "& '$($npm.Source)' run crawl:weekly *>> '$logDir\weekly.log'"
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand $encoded" `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $At

$settings = New-ScheduledTaskSettings `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -MultipleInstances IgnoreNew

# Run only on AC power is the default and it is wrong for a laptop that lives on
# battery: the crawl would quietly never run.
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Weekly SuperAsk crawl of Cambodian government sites. Raises change signals to var/review-queue.jsonl for steward review (FR-47, FR-49). Publishes nothing." `
    -Force | Out-Null

Write-Output ""
Write-Output "Registered: $TaskName"
Write-Output "  Schedule   Every $DayOfWeek at $At"
Write-Output "  Command    npm run crawl:weekly   (priority 1 and 2 sources)"
Write-Output "  Working in $projectRoot"
Write-Output "  Log        var\monitor\logs\weekly.log"
Write-Output ""
Write-Output "Run once now to check it works:"
Write-Output "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Output ""
Write-Output "Remove it with:"
Write-Output "  .\scripts\schedule-weekly.ps1 -Uninstall"
Write-Output ""
