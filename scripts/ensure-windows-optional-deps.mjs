import { execSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

if (!isWindows) {
  process.exit(0);
}

const packages = ['@rollup/rollup-win32-x64-msvc', '@esbuild/win32-x64'];

for (const pkg of packages) {
  try {
    require.resolve(pkg);
    console.log(`[ensure-windows-optional-deps] ${pkg} already installed.`);
  } catch {
    console.log(`[ensure-windows-optional-deps] Installing missing ${pkg}...`);
    execSync(`npm i -D ${pkg} --no-save`, { stdio: 'inherit' });
  }
}
