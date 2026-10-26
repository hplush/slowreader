// Write CycloneDX SBOM of npm packages, which got into the bundle,
// since Docker image scanner can’t see them inside JS files

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin, Rolldown } from 'vite'

interface Package {
  license?: string
  name: string
  version: string
}

export type Packages = Map<string, Package>

function findPackageDir(file: string): string | undefined {
  let path = file.replace(/^\0/, '').replace(/\?.*$/, '')
  let start = path.lastIndexOf('/node_modules/')
  if (start === -1) return undefined
  start += '/node_modules/'.length
  let parts = path.slice(start).split('/')
  return (
    path.slice(0, start) +
    parts.slice(0, parts[0]!.startsWith('@') ? 2 : 1).join('/')
  )
}

// Vite puts asset’s path relative to root to originalFileNames
function addBundle(
  packages: Packages,
  root: string,
  bundle: Rolldown.OutputBundle
): void {
  for (let file of Object.values(bundle)) {
    let sources =
      file.type === 'chunk' ? file.moduleIds : file.originalFileNames
    for (let source of sources) {
      let dir = findPackageDir(resolve(root, source))
      if (dir && !packages.has(dir)) {
        packages.set(
          dir,
          JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Package
        )
      }
    }
  }
}

function toComponent(pkg: Package): object {
  let purl = `pkg:npm/${pkg.name.replace('@', '%40')}@${pkg.version}`
  let [group, name] = pkg.name.startsWith('@')
    ? pkg.name.split('/')
    : [undefined, pkg.name]
  return {
    'bom-ref': purl,
    group,
    'licenses': pkg.license ? [{ expression: pkg.license }] : undefined,
    name,
    purl,
    'type': 'library',
    'version': pkg.version
  }
}

export function collectPackages(packages: Packages): Plugin {
  let root = ''
  return {
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    generateBundle(options, bundle) {
      addBundle(packages, root, bundle)
    },
    name: 'sbom-collect'
  }
}

// Worker bundles are built before the main bundle,
// so workerPackages is already filled in generateBundle
export function sbom(
  fileName: string,
  workerPackages: Packages = new Map()
): Plugin {
  let root = ''
  return {
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    generateBundle(options, bundle) {
      let packages = new Map(workerPackages)
      addBundle(packages, root, bundle)
      let components = new Map(
        [...packages.values()].map(pkg => [`${pkg.name}@${pkg.version}`, pkg])
      )
      this.emitFile({
        fileName,
        source:
          JSON.stringify(
            {
              bomFormat: 'CycloneDX',
              components: [...components.entries()]
                .toSorted(([a], [b]) => a.localeCompare(b))
                .map(([, pkg]) => toComponent(pkg)),
              specVersion: '1.6',
              version: 1
            },
            null,
            2
          ) + '\n',
        type: 'asset'
      })
    },
    name: 'sbom'
  }
}
