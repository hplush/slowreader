import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const ENVIRONMENTS = ['dev', 'prod'] as const
type Environment = (typeof ENVIRONMENTS)[number]

function isEnvironment(env: string | undefined): env is Environment {
  return ENVIRONMENTS.some(e => e === env)
}

function prepareManifest(env: Environment): void {
  let manifestFile = `manifest.${env}.json`

  let srcPath = join(import.meta.dirname, manifestFile)
  let destPath = join(import.meta.dirname, 'manifest.json')

  copyFileSync(srcPath, destPath)
}

let env = process.argv[2]
if (isEnvironment(env)) {
  prepareManifest(env)
} else {
  process.stderr.write(styleText('red', `Invalid environment: ${env}\n`))
  process.exit(1)
}
