#!/usr/bin/env node
// Script to check test files in the codebase.
// - Avoid focused tests (test.only()) that developer could forget to unfocus
// - Avoid skipped tests (test.skip())
// - Ensure tests have describe() blocks
// - Ensure workflows run existing scripts
// - Ensure every project excluded from main.yml is tested by own workflow
// - Ensure every test is marked as offline:/online: and that own: tests,
//   which main.yml does not run, have own workflow

import { globSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

function check(
  all: Buffer,
  part: string,
  filename: string,
  message: string
): void {
  if (all.includes(part)) {
    let lines = all.toString().split('\n')
    let line = lines.findIndex(i => i.includes(part)) + 1
    let path = relative(ROOT, filename)
    process.stderr.write(styleText('red', `${path}:${line} ${message}\n`))
    process.exit(1)
  }
}

function checkMissing(
  all: Buffer,
  part: string,
  filename: string,
  message: string
): void {
  if (!all.includes(part)) {
    let path = relative(ROOT, filename)
    process.stderr.write(styleText('red', `${path} ${message}\n`))
    process.exit(1)
  }
}

async function checkFile(filename: string): Promise<void> {
  let code = await readFile(filename)
  check(code, 'test.only(', filename, 'has focused test')
  check(code, 'test.skip(', filename, 'has skipped test')
  checkMissing(code, 'describe(', filename, 'missing describe() block')
}

function error(message: string): void {
  process.stderr.write(styleText('red', `${message}\n`))
  process.exit(1)
}

function checkWorkflows(): void {
  let workflows = globSync('.github/workflows/*.yml').map(file => ({
    content: readFileSync(join(ROOT, file)).toString(),
    file
  }))
  let all = workflows.map(i => i.content).join('\n')
  for (let { content, file } of workflows) {
    if (file.endsWith('main.yml')) {
      for (let [, project] of content.matchAll(/-F '!([\w-]+)'/g)) {
        if (!all.includes(`pnpm -F ${project} test`)) {
          error(`main.yml excludes ${project}, but no workflow tests it`)
        }
      }
    }
  }
  for (let pkg of globSync(['package.json', '*/package.json'])) {
    let project = pkg.replace('/package.json', '')
    let content = readFileSync(join(ROOT, pkg)).toString()
    for (let [, script] of content.matchAll(/"((?:test|own):[\w:-]+)":/g)) {
      let [family, network] = script!.split(':')
      if (network !== 'offline' && network !== 'online') {
        error(`${pkg} has ${script}, mark it as offline: or online:`)
      } else if (
        family === 'own' &&
        !all.includes(script!) &&
        !all.includes(`pnpm -F ${project} test`)
      ) {
        error(`${pkg} has ${script}, but no workflow runs it`)
      }
    }
  }
}

let files =
  process.argv.length > 2 ? process.argv.slice(2) : globSync('**/*.test.ts')

await Promise.all(files.map(file => checkFile(file)))
checkWorkflows()
