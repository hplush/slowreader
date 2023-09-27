#!/usr/bin/node

import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

let args = [
  '--test',
  '--enable-source-maps',
  '--loader',
  join(ROOT, 'node_modules/tsm/loader.mjs')
]

let files = []
for (let i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i]
  if (arg === '-t') {
    args.push(`--test-name-pattern=${process.argv[++i]}`)
  } else {
    files.push(arg)
  }
}

spawn('node', [...args, ...files], {
  env: {
    NODE_NO_WARNINGS: '1',
    ...process.env
  },
  stdio: 'inherit'
}).on('exit', process.exit)
