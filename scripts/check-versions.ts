import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pico from 'picocolors'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts)).toString()
}
let pkg = read('package.json')
let toolVersions = read('.tool-versions')

let nodeMinor = toolVersions.match(/nodejs (\d+\.\d+)\./)![1]

function error(msg: string): void {
  process.stderr.write(pico.red(`${msg}\n`))
  process.exit(1)
}

if (!pkg.includes(`"node": "~${nodeMinor}.`)) {
  error('.tool-versions and package.json have different Node.js minor version')
}

function checkDependencies(file: string, content: string): void {
  let match = content.match(/"[^"]+": "[\^~][^"]+"/)
  if (match && !match[0].startsWith('"node":')) {
    error(`Not locked version in ${file}: ${pico.yellow(match[0])}`)
  }
}

checkDependencies('package.json', pkg)
for (let child of readdirSync(ROOT)) {
  if (existsSync(join(ROOT, child, 'package.json'))) {
    let relative = join(child, 'package.json')
    checkDependencies(relative, read(relative))
  }
}
