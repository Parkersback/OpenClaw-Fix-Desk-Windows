$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseRoot = Join-Path $root 'release'
$portableDir = Join-Path $releaseRoot 'OpenClaw-Fix-Desk-Windows-Portable'
$zipPath = Join-Path $releaseRoot 'OpenClaw-Fix-Desk-Windows-Portable.zip'

if (Test-Path $portableDir) { Remove-Item $portableDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null

$items = @('public','src','package.json','README.md','start.cmd','stop.cmd','launch-hidden.vbs')
foreach ($item in $items) {
  Copy-Item (Join-Path $root $item) $portableDir -Recurse -Force
}

Compress-Archive -Path (Join-Path $portableDir '*') -DestinationPath $zipPath -Force
Write-Host "Portable package created: $zipPath"
