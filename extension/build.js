import fs from 'node:fs'
import path from 'node:path'

function prepareManifest(env) {
  let manifestFile = `manifest.${env}.json`

  let srcPath = path.join(import.meta.dirname, manifestFile)
  let destPath = path.join(import.meta.dirname, 'manifest.json')

  fs.copyFileSync(srcPath, destPath)
}

const env = process.argv[2]
if (!env) {
  process.exit(1)
}

prepareManifest(env)
