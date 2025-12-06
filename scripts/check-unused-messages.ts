// Script to find all unused messages

import { execSync } from 'node:child_process'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { styleText } from 'node:util'

const ROOT = join(import.meta.dirname, '..')
const MESSAGES = join(ROOT, 'core', 'messages')

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

interface MessagesStore {
  get(): Record<string, unknown>
}

function loadAllFiles(): Map<string, string> {
  let files = globSync(join(ROOT, '/**/*.{ts,svelte}'), {
    exclude: [join(ROOT, '/node_modules/**')]
  })
  let allFiles = new Map<string, string>()
  for (let file of files) {
    try {
      allFiles.set(file, readFileSync(file, 'utf8'))
    } catch {
      // Skip files that can't be read
    }
  }
  return allFiles
}

function findUnusedByDirectUsage(
  name: string,
  messages: string[],
  fileContents: Map<string, string>
): string[] {
  let importPattern = new RegExp(
    `import\\s+\\{[^}]*${name}(?:\\s+as\\s+(\\w+))?[^}]*\\}`
  )
  let usedKeys = new Set<string>()

  for (let [file, content] of fileContents) {
    let match = importPattern.exec(content)
    if (!match) continue
    let alias = match[1] ?? name
    for (let key of messages) {
      let tsPattern = new RegExp(`${alias}\\.get\\(\\)\\.${key}\\b`)
      let sveltePattern = new RegExp(`\\$${alias}\\.${key}\\b`)
      if (
        tsPattern.test(content) ||
        (file.endsWith('.svelte') && sveltePattern.test(content))
      ) {
        usedKeys.add(key)
      }
    }
  }

  return messages.filter(key => !usedKeys.has(key))
}

function checkByTypes(messages: string[], file: string): string[] {
  let original = readFileSync(file, 'utf8')
  let unused: string[] = []
  for (let key of messages) {
    let modified = original.replace(
      new RegExp(`^\\s*${key}:\\s*[^,\\n]+,?\\s*$`, 'm'),
      ''
    )
    writeFileSync(file, modified, 'utf8')

    let typeCheckPasses = true
    try {
      execSync('pnpm test:types', { cwd: ROOT, stdio: 'pipe' })
    } catch {
      typeCheckPasses = false
    }
    writeFileSync(file, original, 'utf8')
    if (typeCheckPasses) unused.push(key)
  }
  return unused
}

async function findUnused(
  file: string,
  allFiles: Map<string, string>
): Promise<string[]> {
  let camel = toCamelCase(dirname(relative(MESSAGES, file)))
  let name = `${camel}Messages`

  try {
    let module = (await import(file)) as Record<string, MessagesStore>
    let store = module[name]
    if (!store) throw new Error('Messages store was not found')
    let messages = Object.keys(store.get())
    let indirectOrUnused = findUnusedByDirectUsage(name, messages, allFiles)
    return checkByTypes(indirectOrUnused, file)
  } catch (error) {
    process.stderr.write(
      styleText(
        'red',
        `Error loading ${relative(ROOT, file)}\n${String(error)}\n`
      )
    )
    process.exit(1)
  }
}

let allFiles = loadAllFiles()
let unusedFound = false
for (let file of globSync(join(MESSAGES, '/**/en.ts'))) {
  let unused = await findUnused(file, allFiles)
  if (unused.length > 0) {
    if (!unusedFound) {
      process.stderr.write(`Unused messages:\n\n`)
      unusedFound = true
    }
    process.stdout.write(`${relative(ROOT, file)}\n`)
    for (let key of unused) {
      process.stdout.write(styleText('red', `  - ${key}\n`))
    }
  }
}
if (unusedFound) {
  process.exit(1)
}
