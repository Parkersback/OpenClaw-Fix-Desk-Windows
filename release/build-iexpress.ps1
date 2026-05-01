$ErrorActionPreference = 'Stop'
$releaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $releaseDir 'OpenClaw-Fix-Desk-Windows-Portable.exe'
$sed = Join-Path $releaseDir 'OpenClaw-Fix-Desk-Windows.sed'

$sedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$target
FriendlyName=OpenClaw Fix Desk Windows Portable
AppLaunched=run-portable.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0=OpenClaw-Fix-Desk-Windows-Portable.zip
FILE1=run-portable.cmd
[SourceFiles]
SourceFiles0=$releaseDir
[SourceFiles0]
%FILE0%=
%FILE1%=
"@
Set-Content -Path $sed -Value $sedContent -Encoding ASCII
& iexpress /N $sed | Out-Null
if (!(Test-Path $target)) { throw 'IExpress build failed.' }
Write-Host "Built EXE: $target"
