'use strict';

const { existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const projectRoot = join(__dirname, '..');
const webDir = join(projectRoot, 'web');
const nodeModulesDir = join(webDir, 'node_modules');
const binDir = join(nodeModulesDir, '.bin');

const nextBinNames = process.platform === 'win32' ? ['next.cmd', 'next.ps1', 'next'] : ['next'];
const hasNodeModules = existsSync(nodeModulesDir);
const hasNextPackage = existsSync(join(nodeModulesDir, 'next', 'package.json'));
const hasNextBinary =
  existsSync(binDir) && nextBinNames.some((name) => existsSync(join(binDir, name)));

if (hasNodeModules && hasNextPackage && hasNextBinary) {
  console.log('[ensure-web-deps] Web dependencies already installed.');
  process.exit(0);
}

try {
  console.log('[ensure-web-deps] Installing web dependencies...');
  execSync('npm install', { cwd: webDir, stdio: 'inherit' });
  console.log('[ensure-web-deps] Web dependencies installed.');
} catch (error) {
  console.error('[ensure-web-deps] Failed to install web dependencies.');
  throw error;
}
