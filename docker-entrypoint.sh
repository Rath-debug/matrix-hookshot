#!/bin/sh

# Ensure /data directory exists (for passkey and runtime files)
mkdir -p /data

# Generate passkey if it doesn't exist
if [ ! -f /data/passkey.pem ]; then
  echo "Generating passkey.pem..."
  openssl genrsa -out /data/passkey.pem 2048
fi

# Expand environment variables in config files
# Replace ${VAR_NAME} with actual environment variable values
echo "DEBUG: Checking source files..."
echo "DEBUG: Template file exists: $([ -f /bin/matrix-hookshot/config.railway.production.yml ] && echo 'YES' || echo 'NO')"
echo "DEBUG: /data directory writable: $([ -w /data ] && echo 'YES' || echo 'NO')"

echo "Expanding environment variables in config.railway.production.yml..."
if envsubst < /bin/matrix-hookshot/config.railway.production.yml > /data/config.railway.production.yml; then
  echo "SUCCESS: config.railway.production.yml expanded"
  echo "DEBUG: Output file exists: $([ -f /data/config.railway.production.yml ] && echo 'YES' || echo 'NO')"
  echo "DEBUG: Output file size: $(wc -c < /data/config.railway.production.yml) bytes"
else
  echo "ERROR: Failed to expand config.railway.production.yml"
  exit 1
fi

echo "Expanding environment variables in registration.yml..."
if envsubst < /bin/matrix-hookshot/registration.railway.production.yml > /data/registration.yml; then
  echo "SUCCESS: registration.yml expanded"
  echo "DEBUG: Output file exists: $([ -f /data/registration.yml ] && echo 'YES' || echo 'NO')"
else
  echo "ERROR: Failed to expand registration.yml"
  exit 1
fi

echo "Starting matrix-hookshot bridge..."
echo "Reading config from: /data/config.railway.production.yml"
echo "Reading registration from: /data/registration.yml"
exec node /bin/matrix-hookshot/App/BridgeApp.js /data/config.railway.production.yml /data/registration.yml
