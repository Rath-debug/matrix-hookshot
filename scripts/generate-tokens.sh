#!/bin/bash
# Matrix Hookshot - Token Generation Script
# Generates secure random tokens for AS and HS authentication

echo "=== Matrix Hookshot Token Generator ==="
echo ""
echo "Generating secure random tokens..."
echo ""

# Generate AS token
AS_TOKEN=$(openssl rand -base64 32)
echo "AS Token (Application Service):"
echo "$AS_TOKEN"
echo ""

# Generate HS token
HS_TOKEN=$(openssl rand -base64 32)
echo "HS Token (Homeserver):"
echo "$HS_TOKEN"
echo ""

echo "=== Instructions ==="
echo ""
echo "1. Copy the AS Token and paste it in:"
echo "   - config.yml (bridge.as_token)"
echo "   - registration.yml (as_token)"
echo ""
echo "2. Copy the HS Token and paste it in:"
echo "   - config.yml (bridge.hs_token)"
echo "   - registration.yml (hs_token)"
echo ""
echo "3. Ensure both files have MATCHING tokens"
echo ""
echo "4. Restart the bridge:"
echo "   docker-compose restart"
echo ""
