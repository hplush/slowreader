// Save hashes of all JS and HTML files to dist/manifest.json as import map’s
// `integrity` with extra `commit` key. Server’s entrypoint.ts puts JS hashes
// to Content-Security-Policy, so the page can run only these files.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(import.meta.dirname, '../dist')

function sha256(body: Buffer | string): string {
  return `sha256-${createHash('sha256').update(body).digest('base64')}`
}

function findDistFiles(pattern: string): string[] {
  return globSync(pattern, { cwd: DIST })
    .filter(file => !file.startsWith('ui/'))
    .toSorted()
}

function hashFiles(pattern: string): Record<string, string> {
  return Object.fromEntries(
    findDistFiles(pattern).map(file => [
      `/${file}`,
      sha256(readFileSync(join(DIST, file)))
    ])
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

let integrity = hashFiles('**/*.js')

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

let manifest = {
  commit: getCommit(),
  integrity: concatHashes(integrity, hashFiles('**/*.html'))
}

writeFileSync(
  join(DIST, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
)
