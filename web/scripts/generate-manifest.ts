// Save hashes of all JS files and main HTML pages to dist/manifest.json as import map’s
// `integrity` with extra `commit` key. Server’s entrypoint.ts puts JS URLs
// to Content-Security-Policy, so the page can run only these files,
// and `integrity` in HTML and import map checks their content.
// Also put precached files with hashes and app routes to the service worker.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { getAppRoutes } from '../stores/url-router.ts'

const DIST = join(import.meta.dirname, '../dist')

function sha256(body: Buffer | string): string {
  return `sha256-${createHash('sha256').update(body).digest('base64')}`
}

function findDistFiles(pattern: string): string[] {
  return globSync(pattern, { cwd: DIST })
    .filter(file => !file.startsWith('ui/'))
    .toSorted()
}

function hashFiles(
  pattern: string,
  exclude: string[] = []
): Record<string, string> {
  return Object.fromEntries(
    findDistFiles(pattern)
      .filter(file => !exclude.includes(file))
      .map(file => [`/${file}`, sha256(readFileSync(join(DIST, file)))])
  )
}

function concatHashes(
  a: Record<string, string>,
  b: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...a, ...b }).toSorted(([x], [y]) => x.localeCompare(y))
  )
}

// Docker build has no .git, so the image gets the commit from build argument
function getCommit(): string {
  return (
    process.env.COMMIT ||
    execFileSync('git', ['rev-parse', 'HEAD']).toString().trim()
  )
}

function replace(code: string, from: string, to: string): string {
  if (!code.includes(from)) throw new Error(`No ${from} in sw.js`)
  return code.replaceAll(from, to)
}

let integrity = hashFiles('**/*.js', ['sw.js'])
let commit = getCommit()

function getIntegrity(url: string): string {
  let hash = integrity[url]
  if (!hash) throw new Error(`No ${url} in dist/`)
  return hash
}

let importMap =
  `<script type="importmap">${JSON.stringify({ integrity })}</script>\n` +
  '    '

// Inject Import map to HTML and `integrity` attr to <script>|<link>.
// Without it CSP will not work.
for (let page of findDistFiles('**/*.html')) {
  let path = join(DIST, page)
  let html = readFileSync(path, 'utf8')
  if (html.includes('<script type="module"')) {
    let start = html.search(/<script|<link rel="modulepreload"/)
    html = html.slice(0, start) + importMap + html.slice(start)
    html = html.replace(
      /(<script type="module"[^>]* src|<link rel="modulepreload"[^>]* href)="([^"]+)"/g,
      (tag: string, prefix: string, url: string) =>
        `${tag} integrity="${getIntegrity(url)}"`
    )
    writeFileSync(path, html)
  }
}

let sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
sw = replace(
  sw,
  'SW_ASSETS',
  JSON.stringify(
    Object.fromEntries(
      globSync(
        [
          'app.html',
          'apple-touch-icon.png',
          'assets/*',
          'docs/**/index.html',
          'favicon.ico',
          'icon*.{png,svg}',
          'landing/*.{css,js,png,svg,woff2}',
          'manifest.webmanifest'
        ],
        {
          cwd: DIST,
          exclude: [
            '**/*.{map,woff}',
            'docs/branding/**',
            'landing/releases-*.css'
          ]
        }
      )
        .toSorted()
        .map(file => [
          `/${file.replace(/\/index\.html$/, '')}`,
          sha256(readFileSync(join(DIST, file)))
        ])
    )
  )
)
sw = replace(sw, 'SW_COMMIT', JSON.stringify(commit))
sw = replace(sw, 'SW_ROUTES', String(getAppRoutes()))
writeFileSync(join(DIST, 'sw.js'), sw)

let manifest = {
  commit,
  integrity: concatHashes(
    hashFiles('**/*.js'),
    hashFiles('**/*.html', ['404.html', '500.html', 'og/index.html'])
  )
}

writeFileSync(
  join(DIST, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
)
