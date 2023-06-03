#!/usr/bin/node

import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

function read(...parts) {
  return readFileSync(join(ROOT, ...parts)).toString()
}

let pkg = read('package.json')
let versions = read('.tool-versions')

let minor = versions.match(/nodejs (\d+.\d+)\./)[1]

if (!pkg.includes(`"node": "~${minor}.`)) {
  process.stderr.write(
    '.tool-versions and package.json have different Node.js minor version\n'
  )
  process.exit(1)
}
