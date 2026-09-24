import { build } from 'esbuild'

const target = process.argv[2]

if (target === 'extension') {
  await build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    outfile: 'dist/extension.js',
  })
} else if (target === 'webview') {
  await build({
    entryPoints: ['src/webview/main.ts'],
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'iife',
    outfile: 'dist/webview.js',
    loader: {
      '.woff': 'file',
      '.woff2': 'file',
      '.ttf': 'file',
    },
    assetNames: 'assets/[name]-[hash]',
  })
} else {
  throw new Error('Expected build target: extension or webview')
}
