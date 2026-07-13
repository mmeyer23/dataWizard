import fs from 'node:fs';
import path from 'node:path';

const BUILD_DIR = path.resolve('build');
const MAX_ENTRYPOINT_BYTES = 512 * 1024;
const MAX_ASSET_BYTES = 300 * 1024;

const files = listFiles(BUILD_DIR);
const bundle = files.find((file) => path.basename(file) === 'bundle.js');
const assets = files.filter(
  (file) => !file.endsWith('.map') && path.basename(file) !== 'bundle.js'
);

if (!bundle) {
  console.error('Bundle budget check failed: build/bundle.js was not found.');
  process.exit(1);
}

const bundleBytes = fs.statSync(bundle).size;
const largestAsset = assets.reduce(
  (largest, file) => {
    const bytes = fs.statSync(file).size;
    return bytes > largest.bytes ? { file, bytes } : largest;
  },
  { file: '', bytes: 0 }
);

console.log(
  `Bundle budget: ${formatBytes(bundleBytes)} / ${formatBytes(MAX_ENTRYPOINT_BYTES)}`
);
console.log(
  `Largest asset: ${path.relative(process.cwd(), largestAsset.file)} (${formatBytes(largestAsset.bytes)} / ${formatBytes(MAX_ASSET_BYTES)})`
);

if (bundleBytes > MAX_ENTRYPOINT_BYTES) {
  console.error('Bundle budget exceeded. Split or reduce the frontend entrypoint.');
  process.exit(1);
}

if (largestAsset.bytes > MAX_ASSET_BYTES) {
  console.error('Asset budget exceeded. Optimize or replace the largest asset.');
  process.exit(1);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : [file];
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
