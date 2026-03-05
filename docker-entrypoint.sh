#!/bin/sh

# Ensure /data directory exists
mkdir -p /data

# Generate passkey if it doesn't exist
if [ ! -f /data/passkey.pem ]; then
  echo "Generating passkey.pem..."
  openssl genrsa -out /data/passkey.pem 2048
fi

# Expand environment variables in configuration templates
echo "Expanding environment variables in templates..."
envsubst < /bin/matrix-hookshot/config.railway.production.yml > /data/config.railway.production.yml
envsubst < /bin/matrix-hookshot/registration.railway.production.yml > /data/registration.railway.production.yml

echo "Starting matrix-hookshot bridge..."
exec node /bin/matrix-hookshot/App/BridgeApp.js /data/config.railway.production.yml /data/registration.railway.production.yml
