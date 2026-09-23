import { marked } from 'marked'
import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Plugin } from 'vite'

const DOCS = join(import.meta.dirname, '..', 'docs')

export const docPages = readdirSync(DOCS)
  .filter(i => i.endsWith('.md'))
  .map(i => join(DOCS, i.replace(/\.md$/, '.html')))

export function docs(): Plugin {
  return {
    enforce: 'pre',

    async load(id) {
      if (!docPages.includes(id)) return null
      let [layout, markdown] = await Promise.all([
        readFile(
          join(import.meta.dirname, '..', 'layout', 'layout.html'),
          'utf8'
        ),
        readFile(id.replace(/\.html$/, '.md'), 'utf8')
      ])
      let title = markdown.match(/^# (.+)$/m)?.[1] ?? basename(id, '.html')
      return layout
        .replace('{{title}}', title)
        .replace('{{content}}', marked.parse(markdown, { async: false }))
    },

    name: 'docs',

    resolveId(id) {
      return docPages.includes(id) ? id : null
    }
  }
}
