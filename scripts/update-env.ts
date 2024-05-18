// Script to update Node.js and pnpm everywhere

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

interface Release {
  version: string
}

async function getLatestNodeVersion(major: string): Promise<string> {
  let response = await fetch('https://nodejs.org/dist/index.json')
  let data: Release[] = await response.json()
  let filtered = data.filter(i => i.version.startsWith(`v${major}.`))
  return filtered[0]!.version.slice(1)
}

async function getLatestPnpmVersion(): Promise<string> {
  let response = await fetch(
    'https://api.github.com/repos/pnpm/pnpm/releases/latest'
  )
  let data = await response.json()
  return data.tag_name.slice(1)
}

function read(file: string): string {
  return readFileSync(file, 'utf-8').toString()
}

function updatePackages(cb: (content: string) => string): void {
  let files = ['package.json']
  let projects = readdirSync(ROOT)
  for (let project of projects) {
    let path = join(ROOT, project, 'package.json')
    if (existsSync(path)) files.push(path)
  }
  for (let file of files) {
    let content = read(file)
    let updated = cb(content)
    writeFileSync(file, updated)
  }
}

function updateProjectDockerfiles(cb: (content: string) => string): void {
  let files = []
  let projects = readdirSync(ROOT)
  for (let project of projects) {
    let path = join(ROOT, project, 'Dockerfile')
    if (existsSync(path)) files.push(path)
  }
  for (let file of files) {
    let content = read(file)
    let updated = cb(content)
    writeFileSync(file, updated)
  }
}

function printUpdate(tool: string, prev: string, next: string): void {
  process.stderr.write(
    `${tool}: ${styleText('red', prev)} -> ${styleText('green', next)}\n`
  )
}

let Dockerfile = read(join(ROOT, '.devcontainer', 'Dockerfile'))
let currentNode = Dockerfile.match(/NODE_VERSION (.+)/)![1]!
let currentPnpm = Dockerfile.match(/PNPM_VERSION (.+)/)![1]!

let latestNode = await getLatestNodeVersion(
  process.argv[2] ?? currentNode.split('.')[0]!
)
let latestPnpm = await getLatestPnpmVersion()

if (currentNode !== latestNode) {
  printUpdate('Node.js', currentNode, latestNode)
  Dockerfile = Dockerfile.replace(
    /NODE_VERSION .*/,
    `NODE_VERSION ${latestNode}`
  )
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), Dockerfile)
  writeFileSync(join(ROOT, '.node-version'), latestNode + '\n')

  updateProjectDockerfiles(dockerfile => {
    return dockerfile.replace(/NODE_VERSION=.+*/, `NODE_VERSION=${latestNode}`)
  })

  let minor = latestNode.split('.').slice(0, 2).join('.')
  if (currentNode.split('.').slice(0, 2).join('.') !== minor) {
    updatePackages(pkg => pkg.replace(/"node": ".+"/, `"node": "^${minor}.0"`))
  }
}

if (currentPnpm !== latestPnpm) {
  printUpdate('pnpm', currentPnpm, latestPnpm)
  Dockerfile = Dockerfile.replace(
    /PNPM_VERSION .*/,
    `PNPM_VERSION ${latestPnpm}`
  )
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), Dockerfile)

  updatePackages(pkg => {
    pkg = pkg.replace(
      /"packageManager": ".+"/,
      `"packageManager": "pnpm@${latestPnpm}"`
    )
    let major = latestPnpm.split('.')[0]
    if (currentPnpm.split('.')[0] !== major) {
      pkg = pkg.replace(/"pnpm": ".+"/, `"pnpm": "^${major}.0.0"`)
    }
    return pkg
  })
}

if (currentNode === latestNode && currentPnpm === latestPnpm) {
  process.stderr.write(
    styleText('gray', 'No Node.js or pnpm updates available\n')
  )
}
