// Script to avoid focused tests in the codebase.
// The developer could focus test by using test.only() and forget to unfocus
// it before committing the code.

import { lstat, readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

const IGNORE = new Set(['node_modules', 'coverage', 'dist', '.git', '.github'])

async function findFiles(
  dir: string,
  filter: RegExp,
  callback: (filename: string) => void
): Promise<void> {
  for (let name of await readdir(dir)) {
    if (IGNORE.has(name)) continue
    let filename = join(dir, name)
    let stat = await lstat(filename)
    if (stat.isDirectory()) {
      findFiles(filename, filter, callback)
    } else if (filter.test(name)) {
      callback(filename)
    }
  }
}

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

if (process.argv.length > 2) {
  let files = process.argv.slice(2)
  for (let filename of files) {
    checkFile(filename)
  }
} else {
  findFiles(ROOT, /\.test\.ts$/, checkFile)
}
