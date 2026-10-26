// Merge SBOM of web client and landing with server packages and Node.js
// to dist/.well-known/sbom. Server stage of Dockerfile gives path
// to server’s SBOM, since web client stage has no server’s packages.

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

let components = new Map<string, Component>()
for (let component of [
  ...readComponents(readFileSync(join(DIST, '.well-known/sbom'), 'utf8')),
  ...readComponents(readFileSync(landing, 'utf8')),
  ...readComponents(readFileSync(process.argv[2]!, 'utf8'))
]) {
  if (component.purl.startsWith('pkg:npm/%40slowreader/')) continue
  // Bundle’s packages have no hashes, which server’s SBOM has
  components.set(component.purl, {
    ...component,
    ...components.get(component.purl)
  })
}

// Docker builds the web client by the same Node.js version, which image runs
let node = process.version.slice(1)
components.set(`pkg:generic/node@${node}`, {
  'bom-ref': `pkg:generic/node@${node}`,
  'licenses': [{ expression: 'MIT' }],
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
