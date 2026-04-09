$ErrorActionPreference = 'Stop'

# Avoid treating native command stderr warnings as terminating errors during deploy steps.
if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$serverHost = if ($env:UMUNSI_SERVER_HOST) { $env:UMUNSI_SERVER_HOST } else { '93.127.186.217' }
$serverHostKey = if ($env:UMUNSI_SERVER_HOSTKEY) { $env:UMUNSI_SERVER_HOSTKEY } else { 'ssh-ed25519 255 SHA256:jYsWizDft9Sm+hAuCTR9zWtpWeehF5XLunkPQPf/IBo' }
$credentialFile = if ($env:UMUNSI_DEPLOY_CREDENTIAL_FILE) {
  $env:UMUNSI_DEPLOY_CREDENTIAL_FILE
} else {
  Join-Path $env:APPDATA 'Umunsi\deploy-credential.xml'
}

$remoteUser = $env:UMUNSI_DEPLOY_USER
$remotePassword = $env:UMUNSI_DEPLOY_PASSWORD

if ((-not $remoteUser -or -not $remotePassword) -and (Test-Path $credentialFile)) {
  $savedCredential = Import-Clixml -Path $credentialFile
  if ($savedCredential -and $savedCredential.UserName -and $savedCredential.Password) {
    $remoteUser = $savedCredential.UserName
    $remotePassword = [System.Net.NetworkCredential]::new('', $savedCredential.Password).Password
  }
}

if (-not $remoteUser -or -not $remotePassword) {
  throw 'Missing Hostinger credential. Run setup-deploy-credential.ps1 first.'
}

$plink = 'C:\Program Files\PuTTY\plink.exe'
$pscp = 'C:\Program Files\PuTTY\pscp.exe'
if (-not (Test-Path $plink)) { throw 'plink not found' }
if (-not (Test-Path $pscp)) { throw 'pscp not found' }

Write-Host 'Building frontend...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }

$zipPath = Join-Path $env:TEMP 'umunsi_dist.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path .\dist\* -DestinationPath $zipPath -Force

Write-Host 'Uploading build to Hostinger...' -ForegroundColor Cyan
& $pscp -batch -pw $remotePassword -hostkey $serverHostKey $zipPath "$remoteUser@${serverHost}:/home/$remoteUser/umunsi_dist.zip"
if ($LASTEXITCODE -ne 0) { throw 'Upload failed' }

$publicDir = if ($env:UMUNSI_PUBLIC_DIR) { $env:UMUNSI_PUBLIC_DIR } else { '/home/umunsi/backend-api/public' }
$pm2Home = if ($env:UMUNSI_PM2_HOME) { $env:UMUNSI_PM2_HOME } else { '/home/umunsi/.pm2' }
$pm2App = if ($env:UMUNSI_PM2_APP) { $env:UMUNSI_PM2_APP } else { 'umunsi-backend' }

$remoteCmd = "set -e; mkdir -p $publicDir; rm -rf $publicDir/*; unzip -o /home/$remoteUser/umunsi_dist.zip -d $publicDir >/dev/null || true; PM2_HOME=$pm2Home pm2 restart $pm2App; PM2_HOME=$pm2Home pm2 save; echo DEPLOY_COMPLETE"

Write-Host 'Publishing build and restarting PM2...' -ForegroundColor Cyan
& $plink -ssh "$remoteUser@$serverHost" -hostkey $serverHostKey -pw $remotePassword -batch $remoteCmd
if ($LASTEXITCODE -ne 0) { throw 'Remote publish failed' }

Write-Host 'HOSTINGER_FRONTEND_DEPLOY_OK' -ForegroundColor Green
