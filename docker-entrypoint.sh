#!/bin/sh
# Startup script for matrix-hookshot on Railway
# Generates config from environment variables

set -e

echo "Starting matrix-hookshot..."

# Ensure data directory exists
mkdir -p /data

# Generate config.yml from environment variables if it doesn't exist
if [ ! -f /data/config.yml ]; then
  echo "Generating config.yml from environment variables..."

  cat > /data/config.yml <<EOF
bridge:
  domain: ${MATRIX_DOMAIN}
  url: ${MATRIX_URL}
  port: ${BRIDGE_PORT:-9993}
  bindAddress: ${BRIDGE_BIND_ADDRESS:-0.0.0.0}
  as_token: ${MATRIX_AS_TOKEN}
  hs_token: ${MATRIX_HS_TOKEN}
  userId: ${MATRIX_USER_ID}
  mediaEncryptionUrl: ${MEDIA_ENCRYPTION_URL:-}

logging:
  level: ${LOG_LEVEL:-info}
  colorize: ${LOG_COLORIZE:-false}

passFile: /data/passkey.pem

listeners:
  - port: 9001
    bindAddress: 0.0.0.0
    resources:
      - widgets
      - webhooks

generic:
  enabled: ${GENERIC_ENABLED:-true}
  urlPrefix: ${WEBHOOK_URL_PREFIX}
  allowJsTransformationFunctions: ${GENERIC_JS_TRANSFORMS:-true}
  waitForComplete: ${GENERIC_WAIT_COMPLETE:-true}

github:
  enabled: ${GITHUB_ENABLED:-false}

gitlab:
  enabled: ${GITLAB_ENABLED:-false}

jira:
  enabled: ${JIRA_ENABLED:-false}

figma:
  enabled: ${FIGMA_ENABLED:-false}

openproject:
  enabled: ${OPENPROJECT_ENABLED:-false}

widgets:
  publicUrl: ${WIDGET_PUBLIC_URL}
  roomSetupWidget:
    addOnInvite: true
  branding:
    widgetTitle: ${WIDGET_TITLE:-Hookshot Configuration}
  openIdOverrides:
    "${MATRIX_DOMAIN}": "${MATRIX_URL}"
EOF

  echo "✓ config.yml generated"
else
  echo "Using existing config.yml from /data"
fi

# Generate registration.yml from environment variables if it doesn't exist
if [ ! -f /data/registration.yml ]; then
  echo "Generating registration.yml from environment variables..."

  cat > /data/registration.yml <<EOF
id: matrix-hookshot
as_token: ${MATRIX_AS_TOKEN}
hs_token: ${MATRIX_HS_TOKEN}
namespaces:
  rooms: []
  users:
    - regex: "@_github_.*:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "@_gitlab_.*:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "@_jira_.*:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "@_webhooks_.*:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "@feeds:${MATRIX_DOMAIN}"
      exclusive: true
  aliases:
    - regex: "#github_.+:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "#gitlab_.+:${MATRIX_DOMAIN}"
      exclusive: true
    - regex: "#jira_.+:${MATRIX_DOMAIN}"
      exclusive: true
rate_limited: false
URL: ${MATRIX_URL}
EOF

  echo "✓ registration.yml generated"
else
  echo "Using existing registration.yml from /data"
fi

# Generate passkey if it doesn't exist
if [ ! -f /data/passkey.pem ]; then
  echo "Generating passkey.pem..."
  openssl genrsa -out /data/passkey.pem 2048
  echo "✓ passkey.pem generated"
else
  echo "Using existing passkey.pem"
fi

echo "Configuration ready. Starting application..."

# Start the application
exec node /usr/bin/matrix-hookshot/App/BridgeApp.js /data/config.yml /data/registration.yml
