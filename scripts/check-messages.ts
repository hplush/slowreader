// Script to check that all core/messages/*.en.ts files have the right name.
// core/messages/foo.en.ts should exports fooMessages with 'foo' name.

import { lstat, readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')
const MESSAGES = join(ROOT, 'core', 'messages')

const IGNORE = new Set(['.git', '.github', 'coverage', 'dist', 'node_modules'])

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

function check(all: Buffer, part: string, filename: string): void {
  if (!all.includes(part)) {
    let path = relative(ROOT, filename)
    process.stderr.write(styleText('red', `${path} has no "${part}"\n`))
    process.exit(1)
  }
}

async function checkFile(filename: string): Promise<void> {
  let name = dirname(relative(MESSAGES, filename))
  let code = await readFile(filename)
  check(code, `export const ${name}Messages`, filename)
  check(code, `i18n('${name}', {`, filename)
}

if (process.argv.length > 2) {
  let files = process.argv.slice(2)
  for (let filename of files) {
    checkFile(filename)
  }
} else {
  findFiles(MESSAGES, /en.ts$/, checkFile)
}
