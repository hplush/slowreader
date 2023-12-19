import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
      let filename = join(dir, name)
      let stat = await lstat(filename)
      if (stat.isDirectory()) {
        await processCss(filename)
      } else if (extname(name) === '.css') {
        let css = await readFile(filename)
        try {
          let fixed = await cssCleaner.process(css, { from: filename })
          await writeFile(filename, fixed.css)
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

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const DIST = join(ROOT, 'dist')

let cssCleaner = postcss([cleaner])

await processCss(DIST)

let unused = checkUsed()
if (unused.length > 0) {
  printError(`Unused CSS variables: ${pico.yellow(unused.join(', '))}`)
  process.exit(1)
}
