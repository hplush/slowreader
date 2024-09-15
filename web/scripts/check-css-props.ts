// Check that all design tokens (CSS Custom Properties) are used

import { globSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { styleText } from 'node:util'
import postcss from 'postcss'

import { getPropsError, propsChecker } from '../postcss/props-checker.ts'

function printError(message: string): void {
  process.stderr.write(styleText('red', message) + '\n')
}

const cssChecker = postcss([propsChecker])

let files = globSync(
  join(import.meta.dirname, '..', 'dist', 'assets', '**', '*.css')
)
await Promise.all(
  files.map(async file => {
    let css = await readFile(file)
    try {
      await cssChecker.process(css, { from: file })
    } catch (e) {
      if (!(e instanceof Error)) {
        printError(`${e}`)
      } else if (e instanceof Error && e.name === 'CssSyntaxError') {
        printError(e.message)
      } else {
        printError(e.stack ?? e.message)
      }
      process.exit(1)
    }
  })
)

let error = getPropsError()
if (error) {
  printError(error)
  process.exit(1)
}
