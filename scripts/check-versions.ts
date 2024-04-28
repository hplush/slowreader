// Script to check that:
// - All dependencies has "1.2.3" requirement and not "^1.2.3" used by npm.
//   It prevents unexpected updates on lock file issues.
// - Node.js and pnpm versions in .tool-versions and package.json are the same.
// - All Dockerfile use the same Node.js version that is in .tool-versions.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts)).toString()
}

function error(msg: string): void {
  process.stderr.write(styleText('red', `${msg}\n`))
  process.exit(1)
}

let pkg = read('package.json')
let toolVersions = read('.tool-versions')

let nodeFull = toolVersions.match(/nodejs (\d+\.\d+\.\d+)/)![1]
let nodeMinor = toolVersions.match(/nodejs (\d+\.\d+)\./)![1]
let pnpmMajor = toolVersions.match(/pnpm (\d+)\./)![1]

if (!pkg.includes(`"node": "^${nodeMinor}.`)) {
  error('.tool-versions and package.json have different Node.js minor version')
}

if (!pkg.includes(`"pnpm": "^${pnpmMajor}.`)) {
  error('.tool-versions and package.json have different pnpm major version')
}

function checkDependencies(file: string, content: string): void {
  let match = content.match(/"[^"]+": "[\^~][^"]+"/)
  if (match && !match[0].startsWith('"node":')) {
    let line = content.split('\n').findIndex(i => i.includes(match[0])) + 1
    error(
      `Not locked version in ${file}:${line}: ${styleText('yellow', match[0])}`
    )
  }
}

function checkDockerfile(file: string, content: string): void {
  let match = content.match(/node:(\d+\.\d+\.\d+)/)
  if (match && match[1] !== nodeFull) {
    error(
      `Different Node.js version in ${file}: ${styleText('yellow', match[1]!)}`
    )
  }
}

let projects = readdirSync(ROOT)

checkDependencies('package.json', pkg)
for (let project of projects) {
  if (existsSync(join(ROOT, project, 'package.json'))) {
    let relative = join(project, 'package.json')
    checkDependencies(relative, read(relative))
  }
}
for (let project of projects) {
  if (existsSync(join(ROOT, project, 'Dockerfile'))) {
    let relative = join(project, 'Dockerfile')
    checkDockerfile(relative, read(relative))
  }
}
