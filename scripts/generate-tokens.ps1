# Matrix Hookshot - Token Generation Script (PowerShell)
# Generates secure random tokens for AS and HS authentication

Write-Host "=== Matrix Hookshot Token Generator ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generating secure random tokens..." -ForegroundColor Yellow
Write-Host ""

# Generate AS token
$asBytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($asBytes)
$AS_TOKEN = [Convert]::ToBase64String($asBytes)

Write-Host "AS Token (Application Service):" -ForegroundColor Green
Write-Host $AS_TOKEN
Write-Host ""

# Generate HS token
$hsBytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($hsBytes)
$HS_TOKEN = [Convert]::ToBase64String($hsBytes)

Write-Host "HS Token (Homeserver):" -ForegroundColor Green
Write-Host $HS_TOKEN
Write-Host ""

Write-Host "=== Instructions ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy the AS Token and paste it in:"
Write-Host "   - config.yml (bridge.as_token)"
Write-Host "   - registration.yml (as_token)"
Write-Host ""
Write-Host "2. Copy the HS Token and paste it in:"
Write-Host "   - config.yml (bridge.hs_token)"
Write-Host "   - registration.yml (hs_token)"
Write-Host ""
Write-Host "3. Ensure both files have MATCHING tokens" -ForegroundColor Red
Write-Host ""
Write-Host "4. Restart the bridge:"
Write-Host "   docker-compose restart"
Write-Host ""

# Optional: Copy to clipboard
Write-Host "Tokens copied to clipboard:" -ForegroundColor Cyan
$output = "as_token: $AS_TOKEN`nhs_token: $HS_TOKEN"
$output | Set-Clipboard
Write-Host "Paste: Ctrl+V"
