// Merge SBOM of web client and landing with server packages, Node.js,
// and system packages to dist/.well-known/sbom. Dockerfile gives paths
// to server’s SBOM and to apk databases of other stages, since web client
// stage has only its own packages.

import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(import.meta.dirname, '../dist')

interface Component {
  [key: string]: unknown
  name: string
  purl: string
}

function readComponents(json: string): Component[] {
  return (JSON.parse(json) as { components: Component[] }).components
}

function readApk(path: string): Component[] {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n\n')
    .map(pkg => {
      let name = pkg.match(/^P:(.+)$/m)![1]!
      let version = pkg.match(/^V:(.+)$/m)![1]!
      let license = pkg.match(/^L:(.+)$/m)?.[1]
      let purl = `pkg:apk/wolfi/${encodeURIComponent(name)}@${version}`
      return {
        'bom-ref': purl,
        'licenses': license ? [{ expression: license }] : undefined,
        name,
        purl,
        'type': 'library',
        version
      }
    })
}

let landing = join(DIST, 'landing/sbom.cdx.json')

let components = new Map<string, Component>()
for (let component of [
  ...readComponents(readFileSync(join(DIST, '.well-known/sbom'), 'utf8')),
  ...readComponents(readFileSync(landing, 'utf8')),
  ...readComponents(readFileSync(process.argv[2]!, 'utf8')),
  ...readApk(process.argv[3]!),
  ...readApk(process.argv[4]!).filter(i =>
    process.argv.slice(5).includes(i.name)
  )
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
