import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
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
  await writeFile(output, JSON.stringify(result))
}

export async function loadProviders(): Promise<void> {
  names = JSON.parse(
    await readFile(join(import.meta.dirname, 'names.json'), 'utf8')
  ) as Record<string, string>
}

export function getProvider(aaguid: string): null | string {
  return names[aaguid] ?? null
}
