#!/bin/sh
# Startup script for matrix-hookshot on Railway
# Generates config from environment variables

set -e

echo "Starting matrix-hookshot..."
echo "Environment check:"
echo "  MATRIX_DOMAIN: ${MATRIX_DOMAIN:-NOT SET}"
echo "  MATRIX_URL: ${MATRIX_URL:-NOT SET}"
echo "  WEBHOOK_URL_PREFIX: ${WEBHOOK_URL_PREFIX:-NOT SET}"

# Ensure data directory exists
mkdir -p /data
chmod 755 /data

# Check for required environment variables
if [ -z "$MATRIX_DOMAIN" ] || [ -z "$MATRIX_URL" ] || [ -z "$WEBHOOK_URL_PREFIX" ]; then
  echo "ERROR: Required environment variables not set!"
  echo "Required variables:"
  echo "  - MATRIX_DOMAIN"
  echo "  - MATRIX_URL"
  echo "  - WEBHOOK_URL_PREFIX"
  exit 1
fi

# Generate config.yml from environment variables if it doesn't exist
if [ ! -f /data/config.yml ]; then
  echo "Generating config.yml from environment variables..."

  # Use printf instead of cat with heredoc for better variable expansion
  printf '%s\n' \
    'bridge:' \
    "  domain: $MATRIX_DOMAIN" \
    "  url: $MATRIX_URL" \
    "  port: ${BRIDGE_PORT:-9993}" \
    "  bindAddress: ${BRIDGE_BIND_ADDRESS:-0.0.0.0}" \
    "  as_token: $MATRIX_AS_TOKEN" \
    "  hs_token: $MATRIX_HS_TOKEN" \
    "  userId: $MATRIX_USER_ID" \
    "  mediaEncryptionUrl: ${MEDIA_ENCRYPTION_URL:-}" \
    '' \
    'logging:' \
    "  level: ${LOG_LEVEL:-info}" \
    "  colorize: ${LOG_COLORIZE:-false}" \
    '' \
    'passFile: /data/passkey.pem' \
    '' \
    'listeners:' \
    '  - port: 9001' \
    '    bindAddress: 0.0.0.0' \
    '    resources:' \
    '      - widgets' \
    '      - webhooks' \
    '' \
    'generic:' \
    "  enabled: ${GENERIC_ENABLED:-true}" \
    "  urlPrefix: $WEBHOOK_URL_PREFIX" \
    "  allowJsTransformationFunctions: ${GENERIC_JS_TRANSFORMS:-true}" \
    "  waitForComplete: ${GENERIC_WAIT_COMPLETE:-true}" \
    '' \
    'github:' \
    "  enabled: ${GITHUB_ENABLED:-false}" \
    '' \
    'gitlab:' \
    "  enabled: ${GITLAB_ENABLED:-false}" \
    '' \
    'jira:' \
    "  enabled: ${JIRA_ENABLED:-false}" \
    '' \
    'figma:' \
    "  enabled: ${FIGMA_ENABLED:-false}" \
    '' \
    'openproject:' \
    "  enabled: ${OPENPROJECT_ENABLED:-false}" \
    '' \
    'widgets:' \
    "  publicUrl: $WIDGET_PUBLIC_URL" \
    '  roomSetupWidget:' \
    '    addOnInvite: true' \
    '  branding:' \
    "    widgetTitle: ${WIDGET_TITLE:-Hookshot Configuration}" \
    '  openIdOverrides:' \
    "    \"$MATRIX_DOMAIN\": \"$MATRIX_URL\"" \
    > /data/config.yml

  echo "✓ config.yml generated"
else
  echo "Using existing config.yml from /data"
fi

# Generate registration.yml from environment variables if it doesn't exist
if [ ! -f /data/registration.yml ]; then
  echo "Generating registration.yml from environment variables..."

  printf '%s\n' \
    'id: matrix-hookshot' \
    "as_token: $MATRIX_AS_TOKEN" \
    "hs_token: $MATRIX_HS_TOKEN" \
    'namespaces:' \
    '  rooms: []' \
    '  users:' \
    "    - regex: \"@_github_.*:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"@_gitlab_.*:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"@_jira_.*:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"@_webhooks_.*:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"@feeds:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    '  aliases:' \
    "    - regex: \"#github_.+:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"#gitlab_.+:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    "    - regex: \"#jira_.+:$MATRIX_DOMAIN\"" \
    '      exclusive: true' \
    'rate_limited: false' \
    "url: $MATRIX_URL" \
    > /data/registration.yml

  echo "✓ registration.yml generated"
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

# Verify config file was created
if [ ! -f /data/config.yml ]; then
  echo "ERROR: Failed to create /data/config.yml"
  exit 1
fi

echo "✓ All configuration files ready"
echo "Starting application..."

# Start the application
exec node /bin/matrix-hookshot/App/BridgeApp.js /data/config.yml /data/registration.yml
