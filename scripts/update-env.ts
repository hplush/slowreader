// Script to update Node.js and pnpm everywhere
// By default it will keep Node.js major version, but can update to next major
// by `pnpm update-env --major` argument.

import { createHash } from 'node:crypto'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const KEEP_MAJOR = !process.argv.includes('--major')

const ROOT = join(import.meta.dirname, '..')

interface Release {
  version: string
}

type Architectures = { arm64: string; x64: string }

async function getLatestNodeVersion(major: string): Promise<string> {
  let response = await fetch('https://nodejs.org/dist/index.json')
  let data: Release[] = await response.json()
  let filtered = KEEP_MAJOR
    ? data.filter(i => i.version.startsWith(`v${major}.`))
    : data
  return filtered[0]!.version.slice(1)
}

async function getLatestPnpmVersion(): Promise<string> {
  let response = await fetch(
    'https://api.github.com/repos/pnpm/pnpm/releases/latest'
  )
  let data = (await response.json()) as { tag_name: string }
  return data.tag_name.slice(1)
}

async function getNodeSha256(version: string): Promise<Architectures> {
  let data = await fetch(`https://nodejs.org/dist/v${version}/SHASUMS256.txt`)
  let text = await data.text()
  let lines = text.split('\n')
  return {
    arm64: lines.find(i => i.endsWith('-linux-x64.tar.xz'))!.split(' ')[0]!,
    x64: lines.find(i => i.endsWith('-linux-x64.tar.xz'))!.split(' ')[0]!
  }
}

async function getPnpmSha256(
  version: string,
  arch: 'arm64' | 'x64'
): Promise<string> {
  let binary = await fetch(
    'https://github.com/pnpm/pnpm/releases/download/' +
      `v${version}/pnpm-linux-${arch}`
  )
  return createHash('sha256')
    .update(Buffer.from(await binary.arrayBuffer()))
    .digest('hex')
}

function read(file: string): string {
  return readFileSync(file, 'utf-8')
}

function updatePackages(cb: (content: string) => string): void {
  let files = globSync('**/package.json')
  for (let file of files) {
    let content = read(file)
    let updated = cb(content)
    writeFileSync(file, updated)
  }
}

function updateProjectDockerfiles(cb: (content: string) => string): void {
  let files = globSync(['**/Dockerfile', '.devcontainer/Dockerfile'])
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
  return file.replace(new RegExp(` ${key}=.+`, 'g'), ` ${key}=${value}`)
}

function replaceVersionEnv(
  content: string,
  tool: string,
  version: string,
  checksums: Architectures
): string {
  let fixed = replaceEnv(content, `${tool}_VERSION`, version)
  if (content.includes('_CHECKSUM_')) {
    for (let [arch, checksum] of Object.entries(checksums)) {
      let name = `${tool}_CHECKSUM_${arch.toUpperCase()}`
      fixed = replaceEnv(fixed, name, checksum)
    }
  } else if (content.includes('_CHECKSUM ') && checksums.x64) {
    fixed = replaceEnv(fixed, `${tool}_CHECKSUM`, 'sha256:' + checksums.x64)
  }
  return fixed
}

function replaceKey(file: string, key: string, value: string): string {
  return file.replace(
    new RegExp(`"${key}": "[^"]+"`, 'g'),
    `"${key}": "${value}"`
  )
}

let dockerfile = read(join(ROOT, '.devcontainer', 'Dockerfile'))
let currentNode = dockerfile.match(/NODE_VERSION (.+)/)![1]!
let currentPnpm = dockerfile.match(/PNPM_VERSION (.+)/)![1]!

let latestNode = await getLatestNodeVersion(
  process.argv[2] ?? currentNode.split('.')[0]!
)
let latestPnpm = await getLatestPnpmVersion()

if (currentNode !== latestNode) {
  printUpdate('Node.js', currentNode, latestNode)
  let checksums = await getNodeSha256(latestNode)
  dockerfile = replaceVersionEnv(dockerfile, 'NODE', latestNode, checksums)

  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), dockerfile)
  writeFileSync(join(ROOT, '.node-version'), latestNode + '\n')

  updateProjectDockerfiles(projectDocker => {
    return replaceVersionEnv(projectDocker, 'NODE', latestNode, checksums)
  })

  let minor = latestNode.split('.').slice(0, 2).join('.')
  if (currentNode.split('.').slice(0, 2).join('.') !== minor) {
    updatePackages(pkg => replaceKey(pkg, 'node', `^${minor}.0`))
  }
}

if (currentPnpm !== latestPnpm) {
  printUpdate('pnpm', currentPnpm, latestPnpm)
  let [checksumArm, checksumX86] = await Promise.all([
    getPnpmSha256(latestPnpm, 'arm64'),
    getPnpmSha256(latestPnpm, 'x64')
  ])
  dockerfile = replaceVersionEnv(dockerfile, 'PNPM', latestPnpm, {
    arm64: checksumArm,
    x64: checksumX86
  })
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), dockerfile)

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
