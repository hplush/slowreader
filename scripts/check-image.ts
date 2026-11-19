#!/usr/bin/env node
// Script to check that system packages from staging SBOM have no
// vulnerabilities with a released fix and nginx has no security release
// after it.

import { styleText } from 'node:util'

interface Component {
  name: string
  purl: string
  version: string
}

interface Vulnerability {
  affected: { ranges?: { events: { fixed?: string }[] }[] }[]
  id: string
  upstream?: string[]
}

function error(msg: string): never {
  process.stderr.write(styleText('red', `${msg}\n`))
  process.exit(1)
}

let packages = (
  (await (
    await fetch('https://dev.slowreader.app/.well-known/sbom')
  ).json()) as { components: Component[] }
).components.filter(i => i.purl.startsWith('pkg:apk/'))

let nginx = packages.find(i => i.name === 'nginx-mainline')
if (!nginx) error('Can not find nginx in staging SBOM')
let current = nginx.version.replace(/-r\d+$/, '')

let releases = (await (await fetch('https://nginx.org/en/CHANGES')).text())
  .split(/^Changes with nginx /m)
  .slice(1)
let index = releases.findIndex(i => i.startsWith(`${current} `))
if (index === -1) error(`Can not find nginx ${current} in changelog`)

let lines = releases
  .slice(0, index)
  .filter(i => i.includes('*) Security:'))
  .map(
    i =>
      `nginx ${current} → ${i.split(' ')[0]}: ` +
      [...new Set(i.match(/CVE-\d+-\d+/g))].join(', ')
  )

for (let pkg of packages) {
  let response = await fetch('https://api.osv.dev/v1/query', {
    body: JSON.stringify({ package: { purl: pkg.purl } }),
    method: 'POST'
  })
  if (!response.ok) error(`OSV returned ${response.status} for ${pkg.purl}`)
  let { vulns = [] } = (await response.json()) as { vulns?: Vulnerability[] }
  for (let vuln of vulns) {
    let fixed = vuln.affected
      .flatMap(i => i.ranges ?? [])
      .flatMap(i => i.events)
      .find(i => i.fixed)?.fixed
    // Vulnerability without a fix would fail the check every day for nothing
    if (fixed) {
      lines.push(
        `${pkg.name} ${pkg.version} → ${fixed}: ` +
          (vuln.upstream?.find(i => i.startsWith('CVE-')) ?? vuln.id)
      )
    }
  }
}

if (lines.length > 0) {
  error(
    'Staging image has vulnerabilities. Run pnpm update-docker\n\n' +
      [...new Set(lines)].join('\n')
  )
}
