import { marked } from 'marked'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { Plugin } from 'vite'

import { replaceTemplate, typograf } from './docs.ts'

const CHANGELOG = join(import.meta.dirname, '..', '..', 'CHANGELOG.md')
// Vite names the result file by the page path inside `landings/`
const PAGES = join(import.meta.dirname, '..', 'releases')
const ORIGIN = 'https://slowreader.app'

interface Release {
  changes: string
  date: string
  version: string
}

function parseChangelog(markdown: string): Release[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map(section => {
      let match = section.match(/^(\S+)\n\n_(\d{4}-\d{2}-\d{2})_\n(.*)$/s)
      if (!match) {
        throw new Error(`Release has no date: ${section.split('\n')[0]}`)
      }
      return { changes: match[3]!.trim(), date: match[2]!, version: match[1]! }
    })
}

function toHtml(markdown: string): string {
  return typograf.execute(marked.parse(markdown, { async: false }))
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export const releasePages = [
  join(PAGES, 'index.html'),
  ...parseChangelog(readFileSync(CHANGELOG, 'utf8')).map(i =>
    join(PAGES, `${i.version}.html`)
  )
]

function renderRelease(
  release: Release,
  title: string,
  tag: 'h1' | 'h2'
): string {
  let side = tag === 'h1' ? 'h2' : 'h3'
  let [intro, ...sections] = toHtml(release.changes).split(/<h3>(.*?)<\/h3>/)
  let rows = intro!.trim() ? [`<div class="releases_text">${intro}</div>`] : []
  for (let i = 0; i < sections.length; i += 2) {
    rows.push(
      `<${side} class="releases_side">${sections[i]}</${side}>` +
        `<div class="releases_text">${sections[i + 1]}</div>`
    )
  }
  let date = new Date(release.date).toLocaleDateString('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC'
  })
  return (
    '<article class="releases_release">' +
    `<time class="releases_date" datetime="${release.date}">${date}</time>` +
    `<${tag} class="releases_version">${title}</${tag}>${rows.join('')}</article>`
  )
}

function renderList(all: Release[]): string {
  return (
    '<div class="releases"><h1>Releases</h1>' +
    all
      .map(i =>
        renderRelease(
          i,
          `<a href="/releases/${i.version}">${i.version}</a>`,
          'h2'
        )
      )
      .join('') +
    '</div>'
  )
}

function renderPage(release: Release, prev: Release | undefined): string {
  let previous = prev
    ? `<a class="releases_page is-previous" href="/releases/${prev.version}">` +
      '<span class="releases_label">' +
      '<span class="releases_arrow">←</span>Previous release</span>' +
      `${prev.version}</a>`
    : ''
  return (
    '<div class="releases">' +
    renderRelease(release, `Release ${release.version}`, 'h1') +
    `<nav class="releases_pages">${previous}` +
    '<a class="releases_page is-end" href="/releases">' +
    '<span class="releases_label">Overview</span>All releases</a></nav></div>'
  )
}

function renderAtom(all: Release[]): string {
  let entries = all.map(i => {
    let url = `${ORIGIN}/releases/${i.version}`
    return `
  <entry>
    <title>${i.version}</title>
    <id>${url}</id>
    <link href="${url}" />
    <updated>${i.date}T00:00:00Z</updated>
    <content type="html">${escapeXml(toHtml(i.changes))}</content>
  </entry>`
  })
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Slow Reader releases</title>
  <id>${ORIGIN}/releases</id>
  <link href="${ORIGIN}/releases" />
  <link rel="self" href="${ORIGIN}/releases.atom" />
  <icon>${ORIGIN}/icon.svg</icon>
  <author><name>Slow Reader</name></author>
  <updated>${all[0]!.date}T00:00:00Z</updated>${entries.join('')}
</feed>
`
}

export function releases(): Plugin {
  return {
    enforce: 'pre',

    async generateBundle() {
      this.emitFile({
        fileName: 'releases.atom',
        source: renderAtom(parseChangelog(await readFile(CHANGELOG, 'utf8'))),
        type: 'asset'
      })
    },

    async load(id) {
      if (!releasePages.includes(id)) return null
      let template = join(import.meta.dirname, '..', 'layout', 'layout.html')
      this.addWatchFile(template)
      this.addWatchFile(CHANGELOG)
      let [layout, changelog] = await Promise.all([
        readFile(template, 'utf8'),
        readFile(CHANGELOG, 'utf8')
      ])
      let all = parseChangelog(changelog)
      let index = all.findIndex(i => i.version === basename(id, '.html'))
      let release = all[index]
      return replaceTemplate(
        layout.replace(
          '</head>',
          '  <link rel="stylesheet" href="../layout/releases.css" />\n' +
            '    <link rel="alternate" type="application/atom+xml" ' +
            'title="Slow Reader releases" href="/releases.atom" />\n' +
            '  </head>'
        ),
        release
          ? {
              content: renderPage(release, all[index + 1]),
              title: `Release ${release.version}`
            }
          : { content: renderList(all), title: 'Releases' }
      )
    },

    name: 'releases',

    resolveId(id) {
      return releasePages.includes(id) ? id : null
    }
  }
}
