#!/usr/bin/env node
// Save DNS records of slowreader.app from Netim to infra/dns.txt.
// `--check` fails if the records differ from the file.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

// DNS can’t list names, so we ask every type for our known names
const NAMES = [
  'slowreader.app',
  '_dmarc.slowreader.app',
  'proxy.slowreader.app',
  'metrics.slowreader.app',
  'dev.slowreader.app',
  'proxy.dev.slowreader.app'
]

const TYPES = ['A', 'AAAA', 'CAA', 'CNAME', 'HTTPS', 'TXT']

// Only records of asked name and type, without CNAME chain and TTL
function dig(...args: string[]): string[] {
  let [type, name] = args.slice(-2)
  return execFileSync('dig', ['+noall', '+answer', ...args], {
    encoding: 'utf8'
  })
    .split('\n')
    .map(i => i.split(/\s+/))
    .filter(i => i[0] === `${name}.` && i[3] === type)
    .map(i => i.slice(4).join(' '))
    .toSorted()
}

// Resolvers can keep old NS in the cache, so we ask .app registry directly
let registry: string | undefined
let servers: string[] = []
for (let candidate of dig('NS', 'app')) {
  try {
    servers = dig(
      '+authority',
      '+norecurse',
      `@${candidate}`,
      'NS',
      'slowreader.app'
    )
    registry = candidate
    break
  } catch {
    continue
  }
}
if (!registry) throw new Error('No .app registry servers responded')
if (servers.length === 0) throw new Error('slowreader.app has no NS records')

let records = servers.map(i => `slowreader.app NS ${i}`)
// DS lives in the parent zone
for (let answer of dig('+norecurse', `@${registry}`, 'DS', 'slowreader.app')) {
  records.push(`slowreader.app DS ${answer}`)
}
for (let answer of dig(`@${servers[0]}`, 'MX', 'slowreader.app')) {
  records.push(`slowreader.app MX ${answer}`)
}
for (let name of NAMES) {
  for (let type of TYPES) {
    // Authoritative server skips caches of resolvers
    for (let answer of dig(`@${servers[0]}`, type, name)) {
      records.push(`${name} ${type} ${answer}`)
    }
  }
}

let file = join(import.meta.dirname, '..', 'dns.txt')
let dump = records.join('\n') + '\n'

if (process.argv.includes('--check')) {
  let saved = readFileSync(file, 'utf8')
  if (saved !== dump) {
    let before = saved.trim().split('\n')
    for (let line of before.filter(i => !records.includes(i))) {
      process.stderr.write(styleText('red', `- ${line}\n`))
    }
    for (let line of records.filter(i => !before.includes(i))) {
      process.stderr.write(styleText('green', `+ ${line}\n`))
    }
    process.stderr.write(
      styleText(
        'red',
        'DNS differs from infra/dns.txt. ' +
          'Fix records or run node infra/scripts/dump-dns.ts\n'
      )
    )
    process.exit(1)
  }
} else {
  writeFileSync(file, dump)
}
