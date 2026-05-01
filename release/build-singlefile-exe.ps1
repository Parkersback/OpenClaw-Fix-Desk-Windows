$ErrorActionPreference = 'Stop'
$releaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$zipPath = Join-Path $releaseDir 'OpenClaw-Fix-Desk-Windows-Portable.zip'
$launcherPath = Join-Path $releaseDir 'OpenClaw-Fix-Desk-Windows-Portable-Launcher.ps1'
$exePath = Join-Path $releaseDir 'OpenClaw-Fix-Desk-Windows-Portable-Launcher.exe'

if (!(Test-Path $zipPath)) { throw "Portable zip not found: $zipPath" }

$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($zipPath))
$script = @"
`$ErrorActionPreference = 'Stop'
`$appDir = Join-Path `$env:LOCALAPPDATA 'OpenClaw-Fix-Desk-Windows'
`$zipPath = Join-Path `$env:TEMP 'OpenClaw-Fix-Desk-Windows-Portable.zip'
`$bytes = [Convert]::FromBase64String('$base64')
if (!(Test-Path `$appDir)) { New-Item -ItemType Directory -Force -Path `$appDir | Out-Null }
[IO.File]::WriteAllBytes(`$zipPath, `$bytes)
Expand-Archive -Path `$zipPath -DestinationPath `$appDir -Force
Start-Process (Join-Path `$appDir 'launch-hidden.vbs')
"@
Set-Content -Path $launcherPath -Value $script -Encoding UTF8
Import-Module ps2exe
Invoke-ps2exe -inputFile $launcherPath -outputFile $exePath -noConsole -title 'OpenClaw Fix Desk Windows' -product 'OpenClaw Fix Desk Windows' -company 'Parkersback'
Write-Host "Built single-file EXE: $exePath"
