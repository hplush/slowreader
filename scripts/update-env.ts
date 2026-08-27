#!/usr/bin/env node
// Script to update Node.js and pnpm everywhere.
//
// By default it will keep Node.js major version, but can update to next major
// by `pnpm update-env --major` argument. You can specify version `--major 22`.
//
// If you change script and need to update result without new Node.js version
// run it with `pnpm update-env --force` argument.

import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const FORCE = process.argv.includes('--force')

function getMajor(current: string): string | undefined {
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--major') {
      let next = process.argv[i + 1]
      if (next && /^[\d+.]+$/.test(next)) {
        return next
      } else {
        return undefined
      }
    }
  }
  return current
}

const ROOT = join(import.meta.dirname, '..')

interface Release {
  version: string
}

interface GitHubReleases {
  assets: { digest: string; name: string }[]
  tag_name: string
}

type Architectures = { arm64: string; x64: string }

async function getLatestNodeVersion(
  major: string | undefined
): Promise<string> {
  let response = await fetch('https://nodejs.org/dist/index.json')
  let data = (await response.json()) as Release[]
  let filtered = major
    ? data.filter(i => i.version.startsWith(`v${major}.`))
    : data
  return filtered[0]!.version.slice(1)
}

async function getPnpmRelease(current: string): Promise<GitHubReleases> {
  if (!current.includes('-')) {
    let response = await fetch(
      'https://api.github.com/repos/pnpm/pnpm/releases/latest'
    )
    return (await response.json()) as GitHubReleases
  }
  // Stay on pre-release branch until it will have stable release
  let major = current.split('.')[0]
  let response = await fetch(
    'https://api.github.com/repos/pnpm/pnpm/releases?per_page=10'
  )
  let releases = (await response.json()) as GitHubReleases[]
  return releases.find(i => i.tag_name.startsWith(`v${major}.`))!
}

async function getLatestPnpm(
  current: string
): Promise<[string, Architectures]> {
  let release = await getPnpmRelease(current)
  return [
    release.tag_name.slice(1),
    {
      arm64: release.assets
        .find(i => i.name === 'pnpm-linux-arm64.tar.gz')!
        .digest.replace(/^sha256:/, ''),
      x64: release.assets
        .find(i => i.name === 'pnpm-linux-x64.tar.gz')!
        .digest.replace(/^sha256:/, '')
    }
  ]
}

async function hasNodeImage(version: string): Promise<boolean> {
  let response = await fetch(
    `https://registry.access.redhat.com/v2/hi/nodejs/manifests/${version}`,
    { method: 'HEAD' }
  )
  return response.ok
}

async function getNodeSha256(version: string): Promise<Architectures> {
  let data = await fetch(`https://nodejs.org/dist/v${version}/SHASUMS256.txt`)
  let text = await data.text()
  let lines = text.split('\n')
  return {
    arm64: lines.find(i => i.endsWith('-linux-arm64.tar.xz'))!.split(' ')[0]!,
    x64: lines.find(i => i.endsWith('-linux-x64.tar.xz'))!.split(' ')[0]!
  }
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
  return file.replace(new RegExp(` ${key}=[^\\s]+`, 'g'), ` ${key}=${value}`)
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

// Pre-release versions do not match `^12.0.0` range
function getPnpmRange(version: string): string {
  if (version.includes('-')) {
    return `^${version}`
  } else {
    return `^${version.split('.')[0]}.0.0`
  }
}

function replaceKey(file: string, key: string, value: string): string {
  return file.replace(
    new RegExp(`"${key}": "[^"]+"`, 'g'),
    `"${key}": "${value}"`
  )
}

let dockerfile = read(join(ROOT, '.devcontainer', 'Dockerfile'))
let currentNode = dockerfile.match(/NODE_VERSION=(\S+)/)![1]!
let currentPnpm = dockerfile.match(/PNPM_VERSION=(\S+)/)![1]!

let latestNode = await getLatestNodeVersion(
  getMajor(currentNode.split('.')[0]!)
)
let [latestPnpm, pnpmChecksums] = await getLatestPnpm(currentPnpm)

let updateNode = currentNode !== latestNode || FORCE
if (updateNode && !(await hasNodeImage(latestNode))) {
  process.stderr.write(
    styleText(
      'yellow',
      `Waiting for registry.access.redhat.com/hi/nodejs:${latestNode} image\n`
    )
  )
  updateNode = false
}

if (updateNode) {
  printUpdate('Node.js', currentNode, latestNode)
  let checksums = await getNodeSha256(latestNode)
  dockerfile = replaceVersionEnv(dockerfile, 'NODE', latestNode, checksums)

  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), dockerfile)
  writeFileSync(join(ROOT, '.node-version'), latestNode + '\n')

  updateProjectDockerfiles(projectDocker => {
    let fixed = replaceVersionEnv(projectDocker, 'NODE', latestNode, checksums)
    return fixed.replace(/nodejs:\d+\.\d+\.\d+/g, `nodejs:${latestNode}`)
  })

  let minor = latestNode.split('.').slice(0, 2).join('.')
  if (currentNode.split('.').slice(0, 2).join('.') !== minor) {
    updatePackages(pkg => replaceKey(pkg, 'node', `^${minor}.0`))
  }
}

let updatePnpm = currentPnpm !== latestPnpm || FORCE
if (updatePnpm) {
  printUpdate('pnpm', currentPnpm, latestPnpm)
  dockerfile = replaceVersionEnv(dockerfile, 'PNPM', latestPnpm, pnpmChecksums)
  writeFileSync(join(ROOT, '.devcontainer', 'Dockerfile'), dockerfile)

  updatePackages(pkg => {
    pkg = replaceKey(pkg, 'packageManager', `pnpm@${latestPnpm}`)
    return replaceKey(pkg, 'pnpm', getPnpmRange(latestPnpm))
  })
}

if (currentNode === latestNode && !updatePnpm) {
  process.stderr.write(
    styleText('gray', 'No Node.js or pnpm updates available\n')
  )
}
