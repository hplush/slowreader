import { marked } from 'marked'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
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
        readFile(source, 'utf8')
      ])
      let title = markdown.match(/^# (.+)$/m)?.[1] ?? basename(id, '.html')
      return layout
        .replace('{{title}}', title)
        .replace(
          '{{content}}',
          typograf.execute(marked.parse(markdown, { async: false }))
        )
    },

    name: 'docs',

    resolveId(id) {
      return docPages.includes(id) ? id : null
    }
  }
}
