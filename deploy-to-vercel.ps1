# Umunsi Frontend Deployment to Vercel
# Fallback-safe deploy: copies project to a temporary non-git folder, then deploys from there.

$ErrorActionPreference = 'Stop'

Write-Host "Starting Umunsi Frontend deployment to Vercel (fallback temp-folder method)..." -ForegroundColor Cyan

$projectRoot = "c:\Users\POSITIVO\UMUNSI WEBSITE\Umunsi"
Set-Location $projectRoot

Write-Host "`n[1/5] Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/5] Ensuring Vercel CLI is available..." -ForegroundColor Yellow
npx vercel --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vercel CLI missing; installing globally..." -ForegroundColor Yellow
    npm install -g vercel --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Vercel CLI." -ForegroundColor Red
        exit 1
    }
}

$tempDir = Join-Path $env:TEMP ("umunsi-vercel-temp-" + [Guid]::NewGuid().ToString('N'))
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null

Write-Host "`n[3/5] Creating non-git temporary deploy folder..." -ForegroundColor Yellow
$excludeDirs = @('.git', 'node_modules', 'dist', '.idx', '.same')
$excludeFiles = @('vercel-deploy.log')

$robocopyArgs = @(
    $projectRoot,
    $tempDir,
    '/MIR',
    '/R:1',
    '/W:1',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NC',
    '/NS',
    '/XD'
) + ($excludeDirs | ForEach-Object { Join-Path $projectRoot $_ }) + @('/XF') + $excludeFiles

robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) {
    Write-Host "Failed to copy project to temp folder for deployment." -ForegroundColor Red
    exit 1
}

Write-Host "`n[4/5] Deploying to Vercel from temp folder..." -ForegroundColor Yellow
Set-Location $tempDir
npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vercel deployment failed." -ForegroundColor Red
    Write-Host "Temp folder preserved for troubleshooting: $tempDir" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[5/5] Cleaning up temp folder..." -ForegroundColor Yellow
if ($env:UMUNSI_KEEP_TEMP_DEPLOY -eq '1') {
    Write-Host "Skipping cleanup because UMUNSI_KEEP_TEMP_DEPLOY=1" -ForegroundColor Yellow
    Write-Host "Temp folder: $tempDir" -ForegroundColor Yellow
} else {
    Set-Location $projectRoot
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`nDeployment successful. Frontend is live on Vercel." -ForegroundColor Green
