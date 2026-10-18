// Automated Packaging Script for Chrome Web Store
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(manifestPath)) {
  console.error('Error: manifest.json not found!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';
const zipName = `review-spy-extension-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`Packaging ReviewSpy AI v${version} into ${zipName}...`);

// Use native zip command excluding git, dist, markdown, and node_modules
const command = [
  'zip', '-r', `"${zipPath}"`,
  'manifest.json',
  'assets/icons',
  'sidepanel',
  'scripts',
  'utils',
  '-x "*.DS_Store"',
  '-x "*__MACOSX*"'
].join(' ');

try {
  execSync(command, { cwd: rootDir, stdio: 'inherit' });
  const stats = fs.statSync(zipPath);
  const sizeKb = (stats.size / 1024).toFixed(2);
  console.log(`\n✅ Successfully created release package:`);
  console.log(`   Location: ${zipPath}`);
  console.log(`   Size: ${sizeKb} KB`);
  console.log(`\nReady to upload to Chrome Web Store Developer Dashboard!`);
} catch (err) {
  console.error('Failed to create zip package:', err.message);
  process.exit(1);
}
