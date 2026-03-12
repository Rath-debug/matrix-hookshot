#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Copy Vector-IM packages to public folder for widget runtime
const PUBLIC_DIR = './public';
const NODE_MODULES = './node_modules';

// Create node_modules in public if it doesn't exist
const vectorImDir = path.join(PUBLIC_DIR, 'node_modules', '@vector-im');
if (!fs.existsSync(vectorImDir)) {
  fs.mkdirSync(vectorImDir, { recursive: true });
}

// Helper function to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`ℹ️  Source not found: ${src}`);
    return;
  }

  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`📋 Copied: ${src} → ${dest}`);
}

try {
  // Copy required packages
  copyDirSync(
    path.join(NODE_MODULES, '@vector-im', 'compound-web'),
    path.join(vectorImDir, 'compound-web')
  );

  copyDirSync(
    path.join(NODE_MODULES, '@vector-im', 'compound-design-tokens'),
    path.join(vectorImDir, 'compound-design-tokens')
  );

  console.log('✅ Widget dependencies copied successfully');
} catch (error) {
  console.error('❌ Failed to copy widget dependencies:', error.message);
  process.exit(1);
}

