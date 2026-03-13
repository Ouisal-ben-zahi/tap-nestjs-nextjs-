const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const sharedSrc = path.join(backendDir, '..', 'shared', 'types');
const sharedDest = path.join(backendDir, 'src', 'shared', 'types');

if (!fs.existsSync(sharedSrc)) {
  console.warn('copy-shared-types: shared/types not found, skipping');
  process.exit(0);
}

fs.mkdirSync(sharedDest, { recursive: true });
const files = fs.readdirSync(sharedSrc).filter((f) => f.endsWith('.ts'));
for (const file of files) {
  const src = path.join(sharedSrc, file);
  const dest = path.join(sharedDest, file);
  fs.copyFileSync(src, dest);
}
console.log('copy-shared-types: copied', files.length, 'files to src/shared/types');
