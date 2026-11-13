#!/usr/bin/env node
// Script to check that Node.js from .node-version has no security release
// after it and its major version is still supported.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

interface Release {
  security: boolean
  version: string
}

type Schedule = Record<string, { end: string }>

function error(msg: string): never {
  process.stderr.write(styleText('red', `${msg}\n`))
  process.exit(1)
}

let current =
  'v' +
  readFileSync(join(import.meta.dirname, '..', '.node-version'))
    .toString()
    .trim()
let major = current.split('.')[0]!

let releases = (await (
  await fetch('https://nodejs.org/dist/index.json')
).json()) as Release[]
let sameMajor = releases.filter(i => i.version.startsWith(`${major}.`))
let index = sameMajor.findIndex(i => i.version === current)
if (index === -1) error(`Can not find Node.js ${current} in releases`)

let fixes = sameMajor.slice(0, index).filter(i => i.security)
async function getFixedCVEs(version: string): Promise<string[]> {
  let response = await fetch(
    `https://api.github.com/repos/nodejs/node/releases/tags/${version}`
  )
  if (!response.ok) return []
  let { body } = (await response.json()) as { body: string }
  return Array.from(
    body.matchAll(/^\* \((CVE-[\d-]+)\) (.+) \([^)]+\) – (\w+)$/gm),
    ([, id, title, severity]) =>
      `  ${styleText('yellow', severity!.padEnd(6))} ` +
      `https://www.cve.org/CVERecord?id=${id} ${title}`
  )
}

if (fixes.length > 0) {
  let lines = await Promise.all(
    fixes.map(async i => [
      '',
      `${i.version} https://github.com/nodejs/node/releases/tag/${i.version}`,
      ...(await getFixedCVEs(i.version))
    ])
  )
  error(
    `Node.js ${current} has vulnerabilities. Run pnpm update-tools\n` +
      lines.flat().join('\n')
  )
}

let schedule = (await (
  await fetch(
    'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json'
  )
).json()) as Schedule
let end = schedule[major]?.end
if (!end) error(`Can not find Node.js ${major} in release schedule`)
if (new Date(end) < new Date()) {
  error(`Node.js ${major} is not supported since ${end}`)
}
