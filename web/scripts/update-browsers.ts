import browserslist from 'browserslist'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { styleText } from 'node:util'

const BROWSERSLIST_PATH = join(import.meta.dirname, '..', '.browserslistrc')
const README_PATH = join(import.meta.dirname, '..', 'README.md')

const DATE = /\d{4}-\d{2}-\d{2}/g

const LINK = /https:\/\/browsersl\.ist\/#q=[^\s)]+/g

function formatDate(date: Date): string {
  let year = date.getFullYear()
  let month = String(date.getMonth() + 1).padStart(2, '0')
  let day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBrowsers(config: string): string[] {
  return browserslist(browserslist.parseConfig(config).defaults).toSorted()
}

function getLink(config: string): string {
  let queries = config
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .join(', ')
  return (
    'https://browsersl.ist/#q=' +
    encodeURIComponent(queries).replaceAll('%20', '+')
  )
}

function printDiff(before: string[], after: string[]): void {
  let beforeSet = new Set(before)
  let afterSet = new Set(after)

  let added = after.filter(b => !beforeSet.has(b))
  let removed = before.filter(b => !afterSet.has(b))

  if (added.length === 0 && removed.length === 0) {
    process.stderr.write(styleText('gray', 'No browser changes\n'))
    return
  }

  for (let browser of removed) {
    process.stderr.write(styleText('red', `- ${browser}\n`))
  }
  for (let browser of added) {
    process.stderr.write(styleText('green', `+ ${browser}\n`))
  }
}

let oldConfig = readFileSync(BROWSERSLIST_PATH, 'utf-8')
let oldBrowsers = getBrowsers(oldConfig)
let oldDate = oldConfig.match(DATE)![0]

let newDate = formatDate(new Date())
let newConfig = oldConfig.replace(DATE, newDate)
let link = getLink(newConfig)

writeFileSync(BROWSERSLIST_PATH, newConfig.replace(LINK, link))
writeFileSync(
  README_PATH,
  readFileSync(README_PATH, 'utf-8').replace(LINK, link)
)
process.stderr.write(
  `Date: ${styleText('red', oldDate)} → ${styleText('green', newDate)}\n`
)
printDiff(oldBrowsers, getBrowsers(newConfig))
