import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function prepareManifest(env) {
  const manifestFile = `manifest.${env}.json`

  const srcPath = path.join(__dirname, manifestFile)
  const destPath = path.join(__dirname, 'manifest.json')

  fs.copyFileSync(srcPath, destPath)
  console.log(`Copied ${manifestFile} to manifest.json for ${env} environment`)
}

const env = process.argv[2]
if (!env) {
  console.error('You need to specify the environment: dev or pr')
  process.exit(1)
}

prepareManifest(env)
