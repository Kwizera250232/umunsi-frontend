$ErrorActionPreference = 'Stop'

$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$tempDir = Join-Path $env:TEMP 'umunsi-vercel-auto-deploy'

if (Test-Path $tempDir) {
  Remove-Item $tempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host 'Copying project to clean temp folder...' -ForegroundColor Cyan
robocopy $source $tempDir /E /XD node_modules .git dist /XF npm-debug.log /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null

Set-Location $tempDir

Write-Host 'Deploying to Vercel production...' -ForegroundColor Cyan
npx vercel --prod --yes --debug

if ($LASTEXITCODE -ne 0) {
  throw 'Vercel deployment failed.'
}

Write-Host 'SAFE_VERCEL_DEPLOY_DONE' -ForegroundColor Green
