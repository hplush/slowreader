#!/usr/bin/node

import { lstat, readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

const IGNORE = new Set(['node_modules', 'coverage', 'dist', '.git', '.github'])

async function findFiles(dir, filter, callback) {
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

function check(all, part, filename, message) {
  if (all.includes(part)) {
    let lines = all.toString().split('\n')
    let line = lines.findIndex(i => i.includes(part)) + 1
    let path = relative(ROOT, filename)
    process.stderr.write(`${path}:${line} ${message} \n`)
    process.exit(1)
  }
}

findFiles(ROOT, /\.test\.(js|ts)$/, async filename => {
  let code = await readFile(filename)
  check(code, 'test.only(', filename, 'has focused test')
  check(code, 'test.skip(', filename, 'has skipped test')
})
