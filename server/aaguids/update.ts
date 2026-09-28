// Lock the latest commit of passkey providers names database

import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let response = await fetch(
  'https://api.github.com/repos/passkeydeveloper/' +
    'passkey-authenticator-aaguids/commits/main',
  {
    headers: process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}
  }
)
if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText}`)
}
let { sha } = (await response.json()) as { sha: string }

await writeFile(join(import.meta.dirname, 'commit.lock'), sha + '\n')
await rm(join(import.meta.dirname, 'names.json'), { force: true })
