const fs = require('fs');
const path = require('path');

const bundlePath = '/Users/raushanisonline/Documents/GitHub/MCEMotihari app/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle';

if (!fs.existsSync(bundlePath)) {
  console.error('Bundle file not found at:', bundlePath);
  process.exit(1);
}

const content = fs.readFileSync(bundlePath, 'utf8');
const targetOffset = 1868321;

console.log('Total bundle length:', content.length);

const start = Math.max(0, targetOffset - 400);
const end = Math.min(content.length, targetOffset + 400);

console.log('\n--- CODE SNIPPET AROUND OFFSET', targetOffset, '---\n');
console.log(content.substring(start, end));
console.log('\n---------------------------------------\n');
