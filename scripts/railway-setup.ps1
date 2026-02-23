# Generate tokens for matrix-hookshot Railway deployment
# PowerShell Version
#
# Run: powershell -ExecutionPolicy Bypass -File scripts\railway-setup.ps1

function GenerateToken {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "matrix-hookshot Railway Setup Helper" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Generate tokens
$AS_TOKEN = GenerateToken
$HS_TOKEN = GenerateToken

Write-Host "Generated Tokens (save these securely!)" -ForegroundColor Yellow
Write-Host ""
Write-Host "as_token:  $AS_TOKEN" -ForegroundColor Green
Write-Host "hs_token:  $HS_TOKEN" -ForegroundColor Green
Write-Host ""

# Prompt for user input
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Enter your Matrix configuration:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$MATRIX_DOMAIN = Read-Host "Matrix domain (e.g., matrix.org)"
$MATRIX_URL = Read-Host "Matrix homeserver URL (e.g., https://matrix.org)"
$MATRIX_USER_ID = Read-Host "Hookshot user ID (e.g., @hookshot:matrix.org)"
$RAILWAY_APP = Read-Host "Railway app name (will be used for URLs)"

# Build Railway URLs
$WEBHOOK_URL = "https://${RAILWAY_APP}.railway.app/webhook/"
$WIDGET_URL = "https://${RAILWAY_APP}.railway.app/widgetapi/v1/static/"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "RAILWAY ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy and paste these into Railway Dashboard > Your Project > Variables:" -ForegroundColor Yellow
Write-Host ""

$envVars = @"
MATRIX_DOMAIN=$MATRIX_DOMAIN
MATRIX_URL=$MATRIX_URL
MATRIX_USER_ID=$MATRIX_USER_ID
MATRIX_AS_TOKEN=$AS_TOKEN
MATRIX_HS_TOKEN=$HS_TOKEN
WEBHOOK_URL_PREFIX=$WEBHOOK_URL
WIDGET_PUBLIC_URL=$WIDGET_URL
LOG_LEVEL=info
LOG_COLORIZE=false
BRIDGE_PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0
"@

Write-Host $envVars -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MATRIX REGISTRATION FILE" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Update your registration.yml with these values:" -ForegroundColor Yellow
Write-Host ""

$regFile = @"
id: matrix-hookshot
as_token: $AS_TOKEN
hs_token: $HS_TOKEN
namespaces:
  users:
    - exclusive: false
      regex: '@github_.*'
    - exclusive: false
      regex: '@gitlab_.*'
    - exclusive: false
      regex: '@jira_.*'
rate_limited: false
URL: $MATRIX_URL
"@

Write-Host $regFile -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Add environment variables to Railway dashboard"
Write-Host "2. Save this output to a file for reference"
Write-Host "3. Upload registration.yml to your Matrix homeserver"
Write-Host "4. Restart your Matrix homeserver"
Write-Host "5. Push your code to GitHub"
Write-Host "6. Connect to Railway and deploy"
Write-Host ""
Write-Host "For detailed instructions, see RAILWAY_DEPLOYMENT.md" -ForegroundColor Yellow
Write-Host ""

# Offer to copy to clipboard
$response = Read-Host "Copy environment variables to clipboard? (y/n)"
if ($response -eq 'y') {
    $envVars | Set-Clipboard
    Write-Host "✓ Copied to clipboard!" -ForegroundColor Green
}
