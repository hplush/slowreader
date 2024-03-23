// Remove unused colors from palette (as CSS Custom Properties)
// and throw and error if other CSS Custom Properties are unused.

import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import pico from 'picocolors'
import postcss from 'postcss'

import { checkUsed, cleaner } from '../postcss/vars-cleaner.js'

function printError(message: string | undefined): void {
  process.stderr.write(pico.red(message) + '\n')
}

async function processCss(dir: string): Promise<void> {
  let items = await readdir(dir)
  await Promise.all(
    items.map(async name => {
      let path = join(dir, name)
      let stat = await lstat(path)
      if (stat.isDirectory()) {
        await processCss(path)
      } else if (extname(name) === '.css') {
        let css = await readFile(path)
        try {
          let fixed = await cssCleaner.process(css, { from: path })
          await writeFile(path, fixed.css)
        } catch (e) {
          if (!(e instanceof Error)) {
            printError(`${e}`)
          } else if (e.name === 'CssSyntaxError') {
            printError(e.message)
          } else {
            printError(e.stack)
          }
          process.exit(1)
        }
      }
    })
  )
}

const ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')

let cssCleaner = postcss([cleaner])

await processCss(ASSETS)

let unused = checkUsed()
if (unused.length > 0) {
  printError(`Unused CSS variables: ${pico.yellow(unused.join(', '))}`)
  process.exit(1)
}
