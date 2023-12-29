import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pico from 'picocolors'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts)).toString()
}

function error(msg: string): void {
  process.stderr.write(pico.red(`${msg}\n`))
  process.exit(1)
}

let pkg = read('package.json')
let toolVersions = read('.tool-versions')

let nodeMajor = toolVersions.match(/nodejs (\d+)\./)![1]
let pnpmMajor = toolVersions.match(/pnpm (\d+)\./)![1]

if (!pkg.includes(`"node": "^${nodeMajor}.`)) {
  error('.tool-versions and package.json have different Node.js major version')
}

if (!pkg.includes(`"pnpm": "^${pnpmMajor}.`)) {
  error('.tool-versions and package.json have different pnpm major version')
}

function checkDependencies(file: string, content: string): void {
  let match = content.match(/"[^"]+": "[\^~][^"]+"/)
  if (match && !match[0].startsWith('"node":')) {
    let line = content.split('\n').findIndex(i => i.includes(match![0])) + 1
    error(`Not locked version in ${file}:${line}: ${pico.yellow(match[0])}`)
  }
}

checkDependencies('package.json', pkg)
for (let child of readdirSync(ROOT)) {
  if (existsSync(join(ROOT, child, 'package.json'))) {
    let relative = join(child, 'package.json')
    checkDependencies(relative, read(relative))
  }
}
