// Script to avoid focused tests in the codebase.
// The developer could focus test by using test.only() and forget to unfocus
// it before committing the code.

import { globSync } from "node:fs"
import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

function check(
  all: Buffer,
  part: string,
  filename: string,
  message: string
): void {
  if (all.includes(part)) {
    let lines = all.toString().split('\n')
    let line = lines.findIndex(i => i.includes(part)) + 1
    let path = relative(ROOT, filename)
    process.stderr.write(styleText('red', `${path}:${line} ${message}\n`))
    process.exit(1)
  }
}

async function checkFile(filename: string): Promise<void> {
  let code = await readFile(filename)
  check(code, 'test.only(', filename, 'has focused test')
  check(code, 'test.skip(', filename, 'has skipped test')
}

let files = process.argv.length > 2
  ? process.argv.slice(2)
  : globSync('**/*.test.ts')

for (let filename of files) {
  checkFile(filename)
}
