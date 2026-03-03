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
echo "Expanding environment variables in config.yml..."
envsubst < /bin/matrix-hookshot/config.railway.production.yml > /data/config.yml

echo "Expanding environment variables in registration.yml..."
envsubst < /bin/matrix-hookshot/registration.railway.production.yml > /data/registration.yml

echo "Starting matrix-hookshot bridge..."
echo "Reading config from: /data/config.yml"
echo "Reading registration from: /data/registration.yml"
exec node /bin/matrix-hookshot/App/BridgeApp.js /data/config.yml /data/registration.yml
