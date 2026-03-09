#!/usr/bin/env node
/**
 * This script patches @vector-im/compound-web to remove problematic icon imports
 * that cannot be resolved during Vite build
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const compoundWebPath = path.join(
  __dirname,
  '../node_modules/@vector-im/compound-web/dist'
);

if (!fs.existsSync(compoundWebPath)) {
  console.log('compound-web not installed, skipping patch');
  process.exit(0);
}

// Find all JS files
glob('**/*.js', { cwd: compoundWebPath }, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    process.exit(1);
  }

  let patchedCount = 0;
  files.forEach(file => {
    const filePath = path.join(compoundWebPath, file);
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;

      // Replace each icon import with a dummy variable assignment
      content = content.replace(
        /import\s+(\w+)\s+from\s+"@vector-im\/compound-design-tokens\/assets\/web\/icons\/[^"]+";/g,
        'const $1 = null; // Icon import removed by patch'
      );

      // If content changed, write it back
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Patched: ${file}`);
        patchedCount++;
      }
    } catch (e) {
      // Silently skip files that can't be read
    }
  });

  if (patchedCount === 0) {
    console.log('No files needed patching');
  } else {
    console.log(`Patched ${patchedCount} files`);
  }
});


