#!/usr/bin/env node
// Script to check that docs/experiments.md describes every event,
// which the client can send, and only them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

import { EVENTS } from '../api/events.ts'

const ROOT = join(import.meta.dirname, '..')

let docs = readFileSync(join(ROOT, 'docs', 'experiments.md')).toString()
let described = new Set(
  [...docs.matchAll(/^- `([^`]+)` /gm)].map(match => match[1])
)

let errors: string[] = []
for (let name of EVENTS) {
  if (!described.has(name)) {
    errors.push(`docs/experiments.md has no \`${name}\` event`)
  }
}
for (let name of described) {
  if (!EVENTS.some(i => i === name)) {
    errors.push(`api/events.ts has no \`${name}\` event from docs`)
  }
}

if (errors.length > 0) {
  process.stderr.write(styleText('red', errors.join('\n') + '\n'))
  process.exit(1)
}
