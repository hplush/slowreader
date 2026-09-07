import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { build } from 'vite'

import { manifest, type Target } from './manifest.ts'

let zip = promisify(execFile)

let watch = !!process.env.WATCH

let main: Target = 'chrome'
let copies: Target[] = ['firefox', 'safari']

/** Chrome’s and Firefox’s stores take a ZIP, Safari’s converter a folder. */
let archives: Target[] = ['chrome', 'firefox']

/** Own folder for every build, so a release never replaces the local build,
 * which the browser has already loaded. */
async function make(local: boolean): Promise<void> {
  let out = local ? 'local' : 'store'

  await rm(`dist/${out}`, { force: true, recursive: true })
  await mkdir(`dist/${out}/${main}/icons`, { recursive: true })

  await cp('_locales', `dist/${out}/${main}/_locales`, { recursive: true })
  await cp('options.html', `dist/${out}/${main}/options.html`)

  let favicon = await readFile('../web/public/icon.svg')
  let appIcon = await readFile('../web/public/icon-512.png')
  for (let size of [16, 32, 48, 96, 128]) {
    await sharp(size > 32 ? appIcon : favicon, { density: 384 })
      .resize(size, size)
      .png({ palette: true })
      .toFile(`dist/${out}/${main}/icons/${size}.png`)
  }

  for (let target of copies) {
    await cp(`dist/${out}/${main}`, `dist/${out}/${target}`, {
      recursive: true
    })
  }

  for (let target of [main, ...copies]) {
    await writeFile(
      `dist/${out}/${target}/manifest.json`,
      JSON.stringify(manifest(local, target), null, 2)
    )
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
        minify: !local,
        outDir: `dist/${out}/${main}`,
        watch: watch ? {} : null
      },
      configFile: false,
      plugins: [
        {
          name: 'copy-to-targets',
          async writeBundle(_, bundle) {
            for (let file of Object.keys(bundle)) {
              for (let target of copies) {
                await cp(
                  `dist/${out}/${main}/${file}`,
                  `dist/${out}/${target}/${file}`
                )
              }
            }
          }
        }
      ]
    })
  }

  if (!local) {
    for (let target of archives) {
      await zip(
        'zip',
        ['--recurse-paths', '--quiet', `../${target}.zip`, '.'],
        {
          cwd: `dist/store/${target}`
        }
      )
      await rm(`dist/store/${target}`, { recursive: true })
    }
  }
}

/** Builds of the previous layouts stay in `dist/` and look like the result. */
for (let old of await readdir('dist').catch(() => [])) {
  if (old !== 'local' && old !== 'store') {
    await rm(`dist/${old}`, { force: true, recursive: true })
  }
}

await make(true)
if (!watch) await make(false)
