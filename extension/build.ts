import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { build } from 'vite'

import { manifest } from './manifest.ts'

let dev = process.env.NODE_ENV !== 'production'

await rm('dist', { force: true, recursive: true })
await mkdir('dist', { recursive: true })

await writeFile('dist/manifest.json', JSON.stringify(manifest(dev), null, 2))
await cp('_locales', 'dist/_locales', { recursive: true })
await cp('options.html', 'dist/options.html')

/**
 * Chrome, Firefox, and Safari all run a content script as a classic script,
 * none of them supports ES modules there, so we bundle every file to IIFE.
 */
for (let name of ['background', 'content', 'options']) {
  await build({
    build: {
      emptyOutDir: false,
      lib: {
        entry: `${name}.ts`,
        fileName: () => `${name}.js`,
        formats: ['iife'],
        name
      },
      minify: !dev,
      outDir: 'dist',
      watch: dev ? {} : null
    },
    configFile: false
  })
}
