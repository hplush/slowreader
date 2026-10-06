#!/usr/bin/env node
// Script to check that “Last change” date in docs/*.md is the date
// of the last commit, which changed the file.

import { execFileSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT }).toString().trim()
}

let failed = false
for (let file of globSync('docs/*.md', { cwd: ROOT })) {
  let written = readFileSync(join(ROOT, file))
    .toString()
    .match(/Last change: ([^.]+)\./)?.[1]
  if (!written) continue
  // Pre-commit hook runs before the commit, which will have today’s date
  let date = git('status', '--porcelain', '--', file)
    ? new Date()
    : new Date(git('log', '-1', '--format=%aI', '--', file))
  let expected = date.toLocaleDateString('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC'
  })
  if (written !== expected) {
    process.stderr.write(
      styleText(
        'red',
        `${file} has “Last change: ${written}” instead of ${expected}\n`
      )
    )
    failed = true
  }
}
if (failed) process.exit(1)
