import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { defineConfig } from 'tsdown';

import { rawTextPlugin } from '../../build/raw-text-plugin.mjs';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };
const root = import.meta.dirname;

export default defineConfig({
  entry: ['./src/extension.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: false,
  plugins: [rawTextPlugin()],
  alias: {
    '@nighthawk/nighthawk-sdk': resolve(root, '../../packages/node-sdk/src/index.ts'),
    '@nighthawk/nighthawk-telemetry': resolve(root, '../../packages/telemetry/src/index.ts'),
    '@nighthawk/migration-legacy': resolve(root, '../../packages/migration-legacy/src/index.ts'),
    '@nighthawk/nighthawk-oauth/provider-credential': resolve(
      root,
      '../../packages/oauth/src/provider-credential.ts',
    ),
    '@nighthawk/nighthawk-oauth': resolve(root, '../../packages/oauth/src/index.ts'),
  },
  define: {
    __EXTENSION_VERSION__: JSON.stringify(pkg.version),
  },
  banner: {
    js: [
      "import { fileURLToPath as __cjsShimFileURLToPath } from 'node:url';",
      "import { dirname as __cjsShimDirname } from 'node:path';",
      'const __filename = __cjsShimFileURLToPath(import.meta.url);',
      'const __dirname = __cjsShimDirname(__filename);',
    ].join('\n'),
  },
  deps: {
    onlyBundle: false,
    alwaysBundle: [/^@nighthawk\//, 'immer', 'zod'],
    neverBundle: ['vscode'],
  },
  outputOptions: {
    entryFileNames: 'extension.js',
  },
});
