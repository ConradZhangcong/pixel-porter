const { build } = require('esbuild');
const path = require('path');

build({
  entryPoints: [path.resolve(__dirname, '../src/preload/preload.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.resolve(__dirname, '../dist-electron/preload/preload.js'),
  external: ['electron'],
  format: 'cjs',
}).catch(() => process.exit(1));

