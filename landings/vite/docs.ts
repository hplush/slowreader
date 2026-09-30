import { marked } from 'marked'
import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import Typograf from 'typograf'
import type { Plugin } from 'vite'

const DOCS = join(import.meta.dirname, '..', '..', 'docs')
// Vite names the result file by the page path inside `landings/`
const PAGES = join(import.meta.dirname, '..', 'docs')

let typograf = new Typograf({
  disableRule: '*',
  enableRule: 'common/nbsp/*',
  locale: ['en-US']
})

export const docPages = readdirSync(DOCS)
  .filter(i => i.endsWith('.md'))
  .map(i => join(PAGES, i.replace(/\.md$/, '.html')))

async function replaceTemplate(
  template: string,
  values: Record<string, (() => Promise<string> | string) | string>
): Promise<string> {
  let result = template
  for (let [key, value] of Object.entries(values)) {
    let placeholder = `{{${key}}}`
    if (!result.includes(placeholder)) continue
    let text = typeof value === 'function' ? await value() : value
    result = result.replaceAll(placeholder, () => text)
  }
  return result
}

async function lastChange(file: string): Promise<string> {
  let log = await promisify(execFile)('git', [
    'log',
    '-1',
    '--format=%cs',
    '--',
    file
  ])
  return new Date(log.stdout.trim() || Date.now()).toLocaleDateString('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC'
  })
}

export function docs(): Plugin {
  return {
    enforce: 'pre',

    async load(id) {
      if (!docPages.includes(id)) return null
      let template = join(import.meta.dirname, '..', 'layout', 'layout.html')
      let source = join(DOCS, basename(id, '.html') + '.md')
      this.addWatchFile(template)
      this.addWatchFile(source)
      let [layout, markdown] = await Promise.all([
        readFile(template, 'utf8'),
        readFile(source, 'utf8').then(text =>
          replaceTemplate(text, { updated: () => lastChange(source) })
        )
      ])
      let title = markdown.match(/^# (.+)$/m)?.[1] ?? basename(id, '.html')
      return replaceTemplate(layout, {
        content: typograf.execute(marked.parse(markdown, { async: false })),
        title
      })
    },

    name: 'docs',

    resolveId(id) {
      return docPages.includes(id) ? id : null
    }
  }
}
