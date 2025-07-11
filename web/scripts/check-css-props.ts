// Check that all design tokens (CSS Custom Properties) are used

import { globSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { styleText } from 'node:util'
import postcss, { type Parser } from 'postcss'
import html from 'postcss-html'

import { getPropsError, propsChecker } from '../postcss/props-checker.ts'

function printError(message: string): void {
  process.stderr.write(styleText('red', message) + '\n')
}

function printWarning(message: string): void {
  process.stderr.write(styleText('yellow', message) + '\n')
}

const cssChecker = postcss([propsChecker])

let files = [
  ...globSync(join(import.meta.dirname, '..', 'dist', '**', '*.css')),
  join(import.meta.dirname, '..', 'dist', 'index.html')
]
await Promise.all(
  files.map(async file => {
    let content = await readFile(file)
    try {
      let parser: Parser | undefined
      if (extname(file) === '.html') parser = html.parse
      await cssChecker.process(content, { from: file, parser })
    } catch (e) {
      if (!(e instanceof Error)) {
        printError(String(e))
      } else if (e instanceof Error && e.name === 'CssSyntaxError') {
        printError(e.message)
      } else {
        printError(e.stack ?? e.message)
      }
      process.exit(1)
    }
  })
)

let error = getPropsError(true)
if (error) {
  printError(error)
  process.exit(1)
}

let warning = getPropsError(false)
if (warning) {
  printWarning(warning)
}
