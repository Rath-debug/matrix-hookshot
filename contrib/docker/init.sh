#!/bin/sh
if [ ! -f /hookshot-data/passkey.pem ]; then
    echo "Generating new passkey"
    apk add openssl;
    openssl genpkey -out /hookshot-data/passkey.pem -outform PEM -algorithm RSA -pkeyopt rsa_keygen_bits:4096
fi

chown -R 991:991 /synapse-data