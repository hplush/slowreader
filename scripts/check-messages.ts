// Script to check that all core/messages/*.en.ts files have the right name.
// core/messages/foo.en.ts should exports fooMessages with 'foo' name.

import { globSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')
const MESSAGES = join(ROOT, 'core', 'messages')

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

let files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : globSync(join(MESSAGES, '/**/en.ts'))

for (let filename of files) {
  checkFile(filename)
}
