#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const os = require('os');

function commandExists(cmd) {
  try {
    // Use 'which' on Unix/Linux/macOS, 'where' on Windows
    const checkCmd = os.platform() === 'win32' ? 'where' : 'which';
    const result = spawnSync(checkCmd, [cmd], {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function run(command, description) {
  console.log(`\n📦 ${description}`);
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

console.log('🚀 Starting full build...\n');

// Check if cargo is available
const hasCargo = commandExists('cargo');
console.log(`Cargo available: ${hasCargo}`);

if (hasCargo) {
  run('yarn run build:app:rs', 'Building Rust layer');
  run('yarn run build:app:fix-defs', 'Running rust-typescript definitions fix');
} else {
  console.log('\n⚠️  Cargo not found - skipping Rust build');
  console.log('    If you need the complete build with Rust, install Rust from https://rustup.rs/\n');
}

run('yarn run build:app', 'Building TypeScript layer');
run('yarn run build:web', 'Building web UI');

console.log('\n✨ Full build completed successfully!');



