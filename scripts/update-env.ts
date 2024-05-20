// Script to update Node.js and pnpm everywhere

import { createHash } from 'node:crypto'
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

async function getNodeSha256(version: string): Promise<string> {
  let response = await fetch(
    `https://nodejs.org/dist/v${version}/SHASUMS256.txt`
  )
  let data = await response.text()
  return data
    .split('\n')
    .find(i => i.endsWith('-linux-x64.tar.gz'))!
    .split(' ')[0]!
}

async function getPnpmSha256(version: string): Promise<string> {
  let response = await fetch(
    `https://github.com/pnpm/pnpm/releases/download/v${version}/pnpm-linux-x64`
  )
  let hash = createHash('sha256')
  hash.update(Buffer.from(await response.arrayBuffer()))
  return hash.digest('hex')
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
    `${tool}: ${styleText('red', prev)} → ${styleText('green', next)}\n`
  )
}

function replaceEnv(file: string, key: string, value: string): string {
  return file.replace(new RegExp(`ENV ${key} .+`, 'g'), `ENV ${key} ${value}`)
}

function replaceKey(file: string, key: string, value: string): string {
  return file.replace(
    new RegExp(`"${key}": "[^"]+"`, 'g'),
    `"${key}": "${value}"`
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
  let checksum = await getNodeSha256(latestNode)
  Dockerfile = replaceEnv(Dockerfile, 'NODE_VERSION', latestNode)
  Dockerfile = replaceEnv(Dockerfile, 'NODE_CHECKSUM', `sha256:${checksum}`)
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), Dockerfile)
  writeFileSync(join(ROOT, '.node-version'), latestNode + '\n')

  updateProjectDockerfiles(dockerfile => {
    return replaceEnv(dockerfile, 'NODE_VERSION', latestNode)
  })

  let minor = latestNode.split('.').slice(0, 2).join('.')
  if (currentNode.split('.').slice(0, 2).join('.') !== minor) {
    updatePackages(pkg => replaceKey(pkg, 'node', `^${minor}.0`))
  }
}

if (currentPnpm !== latestPnpm) {
  printUpdate('pnpm', currentPnpm, latestPnpm)
  let checksum = await getPnpmSha256(latestPnpm)
  Dockerfile = replaceEnv(Dockerfile, 'PNPM_VERSION', latestPnpm)
  Dockerfile = replaceEnv(Dockerfile, 'PNPM_CHECKSUM', `sha256:${checksum}`)
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), Dockerfile)

  updatePackages(pkg => {
    pkg = replaceKey(pkg, 'packageManager', `pnpm@${latestPnpm}`)
    let major = latestPnpm.split('.')[0]
    if (currentPnpm.split('.')[0] !== major) {
      pkg = replaceKey(pkg, 'pnpm', `^${major}.0.0`)
    }
    return pkg
  })
}

if (currentNode === latestNode && currentPnpm === latestPnpm) {
  process.stderr.write(
    styleText('gray', 'No Node.js or pnpm updates available\n')
  )
}
