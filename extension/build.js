import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function prepareManifest(env) {
  let manifestFile = `manifest.${env}.json`

  let srcPath = path.join(__dirname, manifestFile)
  let destPath = path.join(__dirname, 'manifest.json')

  fs.copyFileSync(srcPath, destPath)
}

const env = process.argv[2]
if (!env) {
  process.exit(1)
}

prepareManifest(env)
