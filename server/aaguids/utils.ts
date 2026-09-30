import { existsSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let names: Record<string, string> = {}

export async function downloadProvidersIfMissed(
  dir = import.meta.dirname
): Promise<void> {
  let output = join(dir, 'names.json')
  if (existsSync(output)) return
  let commit = (
    await readFile(join(import.meta.dirname, 'commit.lock'), 'utf8')
  ).trim()
  let response = await fetch(
    'https://raw.githubusercontent.com/passkeydeveloper/' +
      `passkey-authenticator-aaguids/${commit}/combined_aaguid.json`
  )
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  let list = (await response.json()) as Record<string, { name: string }>
  let result: Record<string, string> = {}
  for (let [aaguid, { name }] of Object.entries(list)) {
    result[aaguid] = name
  }
  let partial = `${output}.${process.pid}`
  await writeFile(partial, JSON.stringify(result))
  await rename(partial, output)
}

export async function loadProviders(): Promise<void> {
  let file = join(import.meta.dirname, 'names.json')
  try {
    names = JSON.parse(await readFile(file, 'utf8')) as Record<string, string>
  } catch (e) {
    throw new Error(
      `Passkey providers list ${file} is broken. ` +
        'Run `pnpm -F server aaguids`',
      { cause: e }
    )
  }
}

export function getProvider(aaguid: string): null | string {
  return names[aaguid] ?? null
}
