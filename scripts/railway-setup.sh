#!/bin/bash
# Generate tokens for matrix-hookshot Railway deployment
#
# This script generates the required tokens and prints environment variables
# ready to paste into Railway dashboard.

echo "=========================================="
echo "matrix-hookshot Railway Setup Helper"
echo "=========================================="
echo ""

# Generate tokens
AS_TOKEN=$(openssl rand -base64 32)
HS_TOKEN=$(openssl rand -base64 32)

echo "Generated Tokens (save these securely!):"
echo ""
echo "as_token:  $AS_TOKEN"
echo "hs_token:  $HS_TOKEN"
echo ""

# Prompt for user input
echo "=========================================="
echo "Enter your Matrix configuration:"
echo "=========================================="
echo ""

read -p "Matrix domain (e.g., matrix.org): " MATRIX_DOMAIN
read -p "Matrix homeserver URL (e.g., https://matrix.org): " MATRIX_URL
read -p "Hookshot user ID (e.g., @hookshot:matrix.org): " MATRIX_USER_ID
read -p "Railway app name (will be used for URLs): " RAILWAY_APP

# Build Railway URLs
WEBHOOK_URL="https://${RAILWAY_APP}.railway.app/webhook/"
WIDGET_URL="https://${RAILWAY_APP}.railway.app/widgetapi/v1/static/"

echo ""
echo "=========================================="
echo "RAILWAY ENVIRONMENT VARIABLES"
echo "=========================================="
echo ""
echo "Copy and paste these into Railway Dashboard > Your Project > Variables:"
echo ""

cat << EOF
MATRIX_DOMAIN=${MATRIX_DOMAIN}
MATRIX_URL=${MATRIX_URL}
MATRIX_USER_ID=${MATRIX_USER_ID}
MATRIX_AS_TOKEN=${AS_TOKEN}
MATRIX_HS_TOKEN=${HS_TOKEN}
WEBHOOK_URL_PREFIX=${WEBHOOK_URL}
WIDGET_PUBLIC_URL=${WIDGET_URL}
LOG_LEVEL=info
LOG_COLORIZE=false
BRIDGE_PORT=9993
BRIDGE_BIND_ADDRESS=0.0.0.0
EOF

echo ""
echo "=========================================="
echo "MATRIX REGISTRATION FILE"
echo "=========================================="
echo ""
echo "Update your registration.yml with these values:"
echo ""

cat << EOF
id: matrix-hookshot
as_token: ${AS_TOKEN}
hs_token: ${HS_TOKEN}
namespaces:
  users:
    - exclusive: false
      regex: '@github_.*'
    - exclusive: false
      regex: '@gitlab_.*'
    - exclusive: false
      regex: '@jira_.*'
rate_limited: false
URL: ${MATRIX_URL}
EOF

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Add environment variables to Railway dashboard"
echo "2. Save this output to a file for reference"
echo "3. Upload registration.yml to your Matrix homeserver"
echo "4. Restart your Matrix homeserver"
echo "5. Push your code to GitHub"
echo "6. Connect to Railway and deploy"
echo ""
echo "For detailed instructions, see RAILWAY_DEPLOYMENT.md"
