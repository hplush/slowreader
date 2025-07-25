// Script to check that:
// - All dependencies has "1.2.3" requirement and not "^1.2.3" used by npm.
//   It prevents unexpected updates on lock file issues.
// - Node.js and pnpm versions are the same in all configs
//   (Dockerfile, package.json, .node-version).
// - Workflow’s actions has full version.

import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

function read(file: string): string {
  return readFileSync(join(ROOT, file)).toString()
}

function error(msg: string): void {
  process.stderr.write(styleText('red', `${msg}\n`))
  process.exit(1)
}

function getVersion(content: string, regexp: RegExp): string {
  return content.match(regexp)![1]!
}

let dockerfile = read('.devcontainer/Dockerfile')

let nodeFull = getVersion(dockerfile, /NODE_VERSION=(\d+\.\d+\.\d+)/)
let nodeMinor = nodeFull.split('.').slice(0, 2).join('.')
let pnpmFull = getVersion(dockerfile, /PNPM_VERSION=(\d+\.\d+\.\d+)/)
let pnpmMajor = pnpmFull.split('.')[0]

let nodeVersion = read('.node-version').trim()
if (nodeVersion !== nodeFull) {
  error(
    '.devcontainer/Dockerfile and .node-version have different Node.js version'
  )
}
let packageManager = getVersion(
  read('package.json'),
  /"packageManager": "pnpm@(\d+\.\d+\.\d+)"/
)
if (packageManager !== pnpmFull) {
  error('.devcontainer/Dockerfile and package.json have different pnpm version')
}

for (let file of globSync(['./*/package.json', 'package.json'])) {
  let content = read(file)
  if (!content.includes(`"node": "^${nodeMinor}.`)) {
    error(`.devcontainer/Dockerfile and ${file} have different Node.js version`)
  }
  if (!content.includes(`"pnpm": "^${pnpmMajor}.`)) {
    error(`.devcontainer/Dockerfile and ${file} have different pnpm version`)
  }
  let match = content.match(/"[^"]+": "[\^~][^"]+"/g)
  for (let version of match || []) {
    if (!version.startsWith('"node":') && !version.startsWith('"pnpm":')) {
      let line = content.split('\n').findIndex(i => i.includes(version)) + 1
      error(
        `Not locked version in ${file}:${line}: ${styleText('yellow', version)}`
      )
    }
  }
}

for (let file of globSync('**/Dockerfile')) {
  let match = read(file).match(/NODE_VERSION=(\d+\.\d+\.\d+)/)
  if (match && match[1] !== nodeFull) {
    error(
      `Different Node.js version in ${file}: ${styleText('yellow', match[1]!)}`
    )
  }
}

for (let file of globSync('.github/**/*.yml')) {
  let match = read(file).match(/\w+\/\w+@v?\d+$/m)
  if (match) {
    error(
      `Non-locked action version in ${file}: ${styleText('yellow', match[0])}`
    )
  }
}
