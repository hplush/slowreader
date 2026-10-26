// Merge SBOM of web client and landing with server packages and Node.js
// to dist/.well-known/sbom..

import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(import.meta.dirname, '../dist')

interface Component {
  [key: string]: unknown
  purl: string
}

function readComponents(json: string): Component[] {
  return (JSON.parse(json) as { components: Component[] }).components
}

let landing = join(DIST, 'landing/sbom.cdx.json')
// Server has no bundle, so its lockfile’s production packages are exactly
// what the image has
let server = execFileSync('pnpm', [
  '-F',
  'server...',
  'sbom',
  '--prod',
  '--lockfile-only',
  '--sbom-format',
  'cyclonedx',
  '--sbom-spec-version',
  '1.6'
]).toString()

let components = new Map<string, Component>()
for (let component of [
  ...readComponents(readFileSync(join(DIST, '.well-known/sbom'), 'utf8')),
  ...readComponents(readFileSync(landing, 'utf8')),
  ...readComponents(server)
]) {
  if (component.purl.startsWith('pkg:npm/%40slowreader/')) continue
  if (!components.has(component.purl)) {
    components.set(component.purl, component)
  }
}

// Docker builds the web client by the same Node.js version, which image runs
let node = process.version.slice(1)
components.set(`pkg:generic/node@${node}`, {
  'bom-ref': `pkg:generic/node@${node}`,
  'name': 'node',
  'purl': `pkg:generic/node@${node}`,
  'type': 'platform',
  'version': node
})

rmSync(landing)
writeFileSync(
  join(DIST, '.well-known/sbom'),
  JSON.stringify(
    {
      bomFormat: 'CycloneDX',
      components: [...components.values()].toSorted((a, b) =>
        a.purl.localeCompare(b.purl)
      ),
      specVersion: '1.6',
      version: 1
    },
    null,
    2
  ) + '\n'
)
