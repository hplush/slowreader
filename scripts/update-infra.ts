#!/usr/bin/env node
// Script to update OpenTofu providers in infra/ and their checksums.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const INFRA = join(import.meta.dirname, '..', 'infra')

interface GitHubRelease {
  draft: boolean
  prerelease: boolean
  published_at: string
  tag_name: string
}

// Same cooldown as pnpm’s minimumReleaseAge to skip a hijacked release
async function getLatestDayOldProvider(source: string): Promise<string> {
  let [namespace, name] = source.split('/')
  let response = await fetch(
    `https://api.github.com/repos/${namespace}/terraform-provider-${name}/releases?per_page=20`
  )
  let releases = (await response.json()) as GitHubRelease[]
  let dayAgo = Date.now() - 24 * 60 * 60 * 1000
  return releases
    .find(
      i => !i.draft && !i.prerelease && Date.parse(i.published_at) < dayAgo
    )!
    .tag_name.slice(1)
}

let file = join(INFRA, 'versions.tf')
let config = readFileSync(file, 'utf-8')
let updated = config

for (let [block, source, current] of config.matchAll(
  /source\s+= "([^"]+)"\n\s+version\s+= "([^"]+)"/g
)) {
  let latest = await getLatestDayOldProvider(source!)
  if (latest !== current) {
    process.stderr.write(
      `${source}: ${styleText('red', current!)} → ${styleText('green', latest)}\n`
    )
    updated = updated.replace(
      block,
      block.replace(`"${current}"`, `"${latest}"`)
    )
  }
}

if (updated === config) {
  process.stderr.write(styleText('gray', 'No OpenTofu providers updates\n'))
} else {
  writeFileSync(file, updated)
  execFileSync('tofu', ['init', '-backend=false', '-upgrade'], {
    cwd: INFRA,
    stdio: 'inherit'
  })
  execFileSync(
    'tofu',
    [
      'providers',
      'lock',
      '-platform=linux_amd64',
      '-platform=linux_arm64',
      '-platform=darwin_arm64'
    ],
    { cwd: INFRA, stdio: 'inherit' }
  )
}
