#!/usr/bin/env node
// Update images in FROM and COPY --from= inside Dockerfile to a specific
// hash for security and having the same environment everywhere.

import { createHash } from 'node:crypto'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

const ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.docker.distribution.manifest.v2+json'
].join(', ')

const FROM = /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/i
const COPY = /^\s*COPY\s+--from=(\S+)/i

function print(message: string): void {
  process.stdout.write(message + '\n')
}

function splitName(name: string): [string, string] {
  let slash = name.indexOf('/')
  let registry = name.slice(0, slash)
  if (!registry.includes('.') && !registry.includes(':')) {
    return ['registry-1.docker.io', name]
  }
  return [registry, name.slice(slash + 1)]
}

async function getToken(
  challenge: string,
  repository: string
): Promise<string | undefined> {
  let realm = challenge.match(/realm="([^"]+)"/)?.[1]
  if (!realm) return undefined
  let url = new URL(realm)
  let service = challenge.match(/service="([^"]+)"/)?.[1]
  if (service) url.searchParams.set('service', service)
  let scope = challenge.match(/scope="([^"]+)"/)?.[1]
  url.searchParams.set('scope', scope ?? `repository:${repository}:pull`)
  let response = await fetch(url)
  if (!response.ok) return undefined
  let data = (await response.json()) as {
    access_token?: string
    token?: string
  }
  return data.token ?? data.access_token
}

async function getDigest(
  name: string,
  tag: string
): Promise<string | undefined> {
  let [registry, repository] = splitName(name)
  let url = `https://${registry}/v2/${repository}/manifests/${tag}`
  let headers: Record<string, string> = { accept: ACCEPT }
  let response = await fetch(url, { headers })
  if (response.status === 401) {
    let token = await getToken(
      response.headers.get('www-authenticate') ?? '',
      repository
    )
    if (token) {
      headers.authorization = `Bearer ${token}`
      response = await fetch(url, { headers })
    }
  }
  if (!response.ok) return undefined
  let manifest = Buffer.from(await response.arrayBuffer())
  return 'sha256:' + createHash('sha256').update(manifest).digest('hex')
}

// Read tag from comment on previous line if image has no tag
function getTag(previous: string | undefined, name: string): string {
  let comment = previous?.match(/^\s*#\s*(\S+):([^@\s]+)\s*$/)
  if (comment && comment[1] === name) {
    print(styleText('gray', `  Using tag from comment: ${comment[2]}`))
    return comment[2]!
  }
  return 'latest'
}

async function updateReference(
  file: string,
  line: number,
  lines: string[],
  reference: string
): Promise<string | undefined> {
  if (!reference.includes('/')) return undefined

  print(`${file}:${line + 1}`)

  let [origin, pinned] = reference.split('@') as [string, string | undefined]
  let colon = origin.lastIndexOf(':')
  let name = origin
  let tag: string
  if (colon > origin.lastIndexOf('/')) {
    name = origin.slice(0, colon)
    tag = origin.slice(colon + 1)
  } else {
    tag = getTag(lines[line - 1], origin)
  }

  let digest = await getDigest(name, tag)
  if (!digest) {
    print(
      styleText(['red', 'bold'], `  Could not get digest for ${name}:${tag}`)
    )
    return undefined
  }

  if (digest === pinned) {
    print(styleText('gray', '  Already pinned to latest manifest digest'))
    return undefined
  }

  let updated = `${origin}@${digest}`
  print(
    `  ${styleText(['red', 'bold'], reference)} → ` +
      styleText(['green', 'bold'], updated)
  )
  return updated
}

let files = globSync(['**/Dockerfile', '.devcontainer/Dockerfile'], {
  cwd: ROOT,
  exclude: ['**/node_modules/**', '**/dist/**']
})

for (let file of files) {
  let path = join(ROOT, file)
  let lines = readFileSync(path, 'utf-8').split('\n')
  let changed = false
  for (let i = 0; i < lines.length; i++) {
    let reference = lines[i]!.match(FROM)?.[1] ?? lines[i]!.match(COPY)?.[1]
    if (!reference) continue
    let updated = await updateReference(file, i, lines, reference)
    if (updated) {
      lines[i] = lines[i]!.replace(reference, updated)
      changed = true
    }
  }
  if (changed) writeFileSync(path, lines.join('\n'))
  print('')
}
