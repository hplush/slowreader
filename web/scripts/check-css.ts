// 1. Merge all rules with :root selector into the single rule
// in the beginning of the file
// 2. Remove unused colors from palette (as CSS Custom Properties)
// and throw and error if other CSS Custom Properties are unused.

import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { styleText } from 'node:util'
import postcss from 'postcss'

import { rootsMerger } from '../postcss/roots-merger.ts'
import { getVarsCleanerError, varsCleaner } from '../postcss/vars-checker.ts'

function printError(message: string): void {
  process.stderr.write(styleText('red', message) + '\n')
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
          let fixed = await cssCleaner.process(css, {
            from: path
          })
          await writeFile(path, fixed.css)
        } catch (e) {
          if (!(e instanceof Error)) {
            printError(`${e}`)
          } else if (e.name === 'CssSyntaxError') {
            printError(e.message)
          } else {
            printError(e.stack ?? e.message)
          }
          process.exit(1)
        }
      }
    })
  )
}

const ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')

const cssCleaner = postcss([rootsMerger, varsCleaner])

await processCss(ASSETS)

let error = getVarsCleanerError()
if (error) {
  printError(error)
  process.exit(1)
}
