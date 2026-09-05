import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { build } from 'vite'

import { manifest } from './manifest.ts'

let dev = process.env.NODE_ENV !== 'production'

await rm('dist', { force: true, recursive: true })
await mkdir('dist', { recursive: true })

await writeFile('dist/manifest.json', JSON.stringify(manifest(dev), null, 2))
await cp('_locales', 'dist/_locales', { recursive: true })
await cp('options.html', 'dist/options.html')

await mkdir('dist/icons')
let favicon = await readFile('../web/public/icon.svg')
let appIcon = await readFile('../web/public/icon-512.png')
for (let size of [16, 32, 48, 96, 128]) {
  await sharp(size > 32 ? appIcon : favicon, { density: 384 })
    .resize(size, size)
    .png({ palette: true })
    .toFile(`dist/icons/${size}.png`)
}

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
