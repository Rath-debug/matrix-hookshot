#!/bin/bash
# Copy Vector-IM packages to public folder for widget runtime

set -e

PUBLIC_DIR="./public"
NODE_MODULES="./node_modules"

# Create node_modules in public if it doesn't exist
mkdir -p "$PUBLIC_DIR/node_modules/@vector-im"

# Copy required packages
cp -r "$NODE_MODULES/@vector-im/compound-web" "$PUBLIC_DIR/node_modules/@vector-im/" 2>/dev/null || true
cp -r "$NODE_MODULES/@vector-im/compound-design-tokens" "$PUBLIC_DIR/node_modules/@vector-im/" 2>/dev/null || true

echo "Widget dependencies copied"
