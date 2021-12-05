#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

function read(file) {
  return readFileSync(join(ROOT, file)).toString()
}

let toolVersions = read('.tool-versions')
let test = read('.github/workflows/test.yml')

let versions = toolVersions.split('\n').map(i => i.split(' '))
for (let [tool, version] of versions) {
  if (tool === 'nodejs') {
    if (!test.includes(` node-version: ${version}`)) {
      process.stderr.write(
        'Update Node.js version in .github/workflows/test.yml'
      )
      process.exit(1)
    }
  } else if (tool === 'pnpm') {
    if (!test.includes(` version: ${version}`)) {
      process.stderr.write('Update pnpm version in .github/workflows/test.yml')
      process.exit(1)
    }
  }
}
