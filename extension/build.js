import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

function prepareManifest(env) {
  let manifestFile = `manifest.${env}.json`

  let srcPath = join(import.meta.dirname, manifestFile)
  let destPath = join(import.meta.dirname, 'manifest.json')

  copyFileSync(srcPath, destPath)
}

let env = process.argv[2]
if (!env) {
  process.exit(1)
}

prepareManifest(env)
