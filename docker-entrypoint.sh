#!/bin/sh
# Startup script for matrix-hookshot on Railway
# Generates config from environment variables

echo "=========================================="
echo "matrix-hookshot Bridge - Startup"
echo "=========================================="
echo ""

# Ensure data directory exists
mkdir -p /data
chmod 755 /data

echo "Checking environment variables..."
echo "  MATRIX_DOMAIN: ${MATRIX_DOMAIN:-NOT SET}"
echo "  MATRIX_URL: ${MATRIX_URL:-NOT SET}"
echo "  WEBHOOK_URL_PREFIX: ${WEBHOOK_URL_PREFIX:-NOT SET}"
echo ""

# Check for required environment variables
if [ -z "$MATRIX_DOMAIN" ] || [ -z "$MATRIX_URL" ] || [ -z "$WEBHOOK_URL_PREFIX" ]; then
  echo "ERROR: Required environment variables not set!"
  echo "Please set:"
  echo "  - MATRIX_DOMAIN"
  echo "  - MATRIX_URL"
  echo "  - WEBHOOK_URL_PREFIX"
  echo "  - MATRIX_USER_ID"
  echo "  - MATRIX_AS_TOKEN"
  echo "  - MATRIX_HS_TOKEN"
  exit 1
fi

# Generate config.yml from environment variables if it doesn't exist
if [ ! -f /data/config.yml ]; then
  echo "Generating config.yml..."

  cat > /data/config.yml << 'CONFIG_EOF'
bridge:
  domain: MATRIX_DOMAIN_PLACEHOLDER
  url: MATRIX_URL_PLACEHOLDER
  port: BRIDGE_PORT_PLACEHOLDER
  bindAddress: BRIDGE_BIND_ADDRESS_PLACEHOLDER
  as_token: MATRIX_AS_TOKEN_PLACEHOLDER
  hs_token: MATRIX_HS_TOKEN_PLACEHOLDER
  userId: MATRIX_USER_ID_PLACEHOLDER
  mediaEncryptionUrl: MEDIA_ENCRYPTION_URL_PLACEHOLDER

logging:
  level: LOG_LEVEL_PLACEHOLDER
  colorize: LOG_COLORIZE_PLACEHOLDER

passFile: /data/passkey.pem

listeners:
  - port: 9001
    bindAddress: 0.0.0.0
    resources:
      - widgets
      - webhooks

generic:
  enabled: GENERIC_ENABLED_PLACEHOLDER
  urlPrefix: WEBHOOK_URL_PREFIX_PLACEHOLDER
  allowJsTransformationFunctions: GENERIC_JS_TRANSFORMS_PLACEHOLDER
  waitForComplete: GENERIC_WAIT_COMPLETE_PLACEHOLDER

github:
  enabled: GITHUB_ENABLED_PLACEHOLDER

gitlab:
  enabled: GITLAB_ENABLED_PLACEHOLDER

jira:
  enabled: JIRA_ENABLED_PLACEHOLDER

figma:
  enabled: FIGMA_ENABLED_PLACEHOLDER

openproject:
  enabled: OPENPROJECT_ENABLED_PLACEHOLDER

widgets:
  publicUrl: WIDGET_PUBLIC_URL_PLACEHOLDER
  roomSetupWidget:
    addOnInvite: true
  branding:
    widgetTitle: WIDGET_TITLE_PLACEHOLDER
  openIdOverrides:
    "MATRIX_DOMAIN_PLACEHOLDER": "MATRIX_URL_PLACEHOLDER"
CONFIG_EOF

  # Now replace placeholders with actual values
  sed -i "s|MATRIX_DOMAIN_PLACEHOLDER|${MATRIX_DOMAIN}|g" /data/config.yml
  sed -i "s|MATRIX_URL_PLACEHOLDER|${MATRIX_URL}|g" /data/config.yml
  sed -i "s|MATRIX_USER_ID_PLACEHOLDER|${MATRIX_USER_ID}|g" /data/config.yml
  sed -i "s|MATRIX_AS_TOKEN_PLACEHOLDER|${MATRIX_AS_TOKEN}|g" /data/config.yml
  sed -i "s|MATRIX_HS_TOKEN_PLACEHOLDER|${MATRIX_HS_TOKEN}|g" /data/config.yml
  sed -i "s|WEBHOOK_URL_PREFIX_PLACEHOLDER|${WEBHOOK_URL_PREFIX}|g" /data/config.yml
  sed -i "s|WIDGET_PUBLIC_URL_PLACEHOLDER|${WIDGET_PUBLIC_URL:-$WEBHOOK_URL_PREFIX}|g" /data/config.yml
  sed -i "s|BRIDGE_PORT_PLACEHOLDER|${BRIDGE_PORT:-9993}|g" /data/config.yml
  sed -i "s|BRIDGE_BIND_ADDRESS_PLACEHOLDER|${BRIDGE_BIND_ADDRESS:-0.0.0.0}|g" /data/config.yml
  sed -i "s|LOG_LEVEL_PLACEHOLDER|${LOG_LEVEL:-info}|g" /data/config.yml
  sed -i "s|LOG_COLORIZE_PLACEHOLDER|${LOG_COLORIZE:-false}|g" /data/config.yml
  sed -i "s|WIDGET_TITLE_PLACEHOLDER|${WIDGET_TITLE:-Hookshot Configuration}|g" /data/config.yml
  sed -i "s|GENERIC_ENABLED_PLACEHOLDER|${GENERIC_ENABLED:-true}|g" /data/config.yml
  sed -i "s|GENERIC_JS_TRANSFORMS_PLACEHOLDER|${GENERIC_JS_TRANSFORMS:-true}|g" /data/config.yml
  sed -i "s|GENERIC_WAIT_COMPLETE_PLACEHOLDER|${GENERIC_WAIT_COMPLETE:-true}|g" /data/config.yml
  sed -i "s|GITHUB_ENABLED_PLACEHOLDER|${GITHUB_ENABLED:-false}|g" /data/config.yml
  sed -i "s|GITLAB_ENABLED_PLACEHOLDER|${GITLAB_ENABLED:-false}|g" /data/config.yml
  sed -i "s|JIRA_ENABLED_PLACEHOLDER|${JIRA_ENABLED:-false}|g" /data/config.yml
  sed -i "s|FIGMA_ENABLED_PLACEHOLDER|${FIGMA_ENABLED:-false}|g" /data/config.yml
  sed -i "s|OPENPROJECT_ENABLED_PLACEHOLDER|${OPENPROJECT_ENABLED:-false}|g" /data/config.yml
  sed -i "s|MEDIA_ENCRYPTION_URL_PLACEHOLDER|${MEDIA_ENCRYPTION_URL:-}|g" /data/config.yml

  echo "✓ config.yml generated successfully"
else
  echo "Using existing config.yml from /data"
fi

# Generate registration.yml from environment variables if it doesn't exist
if [ ! -f /data/registration.yml ]; then
  echo "Generating registration.yml..."

  cat > /data/registration.yml << 'REG_EOF'
id: matrix-hookshot
as_token: MATRIX_AS_TOKEN_PLACEHOLDER
hs_token: MATRIX_HS_TOKEN_PLACEHOLDER
namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: false
    - regex: "@_gitlab_.*:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: false
    - regex: "@_jira_.*:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: false
    - regex: "@_webhooks_.*:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: false
    - regex: "@feeds:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: false
  aliases:
    - regex: "#hookshot.*:MATRIX_DOMAIN_PLACEHOLDER"
      exclusive: true
sender_localpart: hookshot
url: "WEBHOOK_URL_PREFIX_PLACEHOLDER"
rate_limited: false
de.sorunome.msc2409.push_ephemeral: true
push_ephemeral: true
org.matrix.msc3202: true
REG_EOF

  # Replace placeholders
  sed -i "s|MATRIX_DOMAIN_PLACEHOLDER|${MATRIX_DOMAIN}|g" /data/registration.yml
  sed -i "s|MATRIX_AS_TOKEN_PLACEHOLDER|${MATRIX_AS_TOKEN}|g" /data/registration.yml
  sed -i "s|MATRIX_HS_TOKEN_PLACEHOLDER|${MATRIX_HS_TOKEN}|g" /data/registration.yml
  sed -i "s|WEBHOOK_URL_PREFIX_PLACEHOLDER|${WEBHOOK_URL_PREFIX}|g" /data/registration.yml

  echo "✓ registration.yml generated successfully"
else
  echo "Using existing registration.yml from /data"
fi

# Generate passkey if it doesn't exist
if [ ! -f /data/passkey.pem ]; then
  echo "Generating passkey.pem..."
  openssl genrsa -out /data/passkey.pem 2048 2>/dev/null
  chmod 600 /data/passkey.pem
  echo "✓ passkey.pem generated"
else
  echo "Using existing passkey.pem"
fi

# Verify config file exists
if [ ! -f /data/config.yml ]; then
  echo "ERROR: Failed to create /data/config.yml"
  exit 1
fi

echo ""
echo "✓ Configuration complete"
echo "Starting matrix-hookshot bridge..."
echo ""
