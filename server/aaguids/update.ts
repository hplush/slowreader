// Lock the latest commit of passkey providers names database and download it

import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { styleText } from 'node:util'

import { downloadProvidersIfMissed } from './utils.ts'

const LOCK = join(import.meta.dirname, 'commit.lock')
const NAMES = join(import.meta.dirname, 'names.json')

async function readNames(): Promise<Record<string, string>> {
  await downloadProvidersIfMissed()
  return JSON.parse(await readFile(NAMES, 'utf8')) as Record<string, string>
}

function printDiff(
  before: Record<string, string>,
  after: Record<string, string>
): void {
  let removed = Object.entries(before).filter(
    ([id, name]) => after[id] !== name
  )
  let added = Object.entries(after).filter(([id, name]) => before[id] !== name)

  if (removed.length === 0 && added.length === 0) {
    process.stderr.write(styleText('gray', 'No passkey provider changes\n'))
    return
  }

  process.stderr.write('Passkey provider updates found:\n')
  for (let [, name] of removed) {
    process.stderr.write(styleText('red', `- ${name}\n`))
  }
  for (let [, name] of added) {
    process.stderr.write(styleText('green', `+ ${name}\n`))
  }
}

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

if ((await readFile(LOCK, 'utf8')).trim() === sha) {
  process.stderr.write(styleText('gray', 'No passkey provider changes\n'))
} else {
  await rm(NAMES, { force: true })
  let before = await readNames()
  await writeFile(LOCK, sha + '\n')
  await rm(NAMES, { force: true })
  printDiff(before, await readNames())
}
