// Docker image starts with this file. ROLE environment variable chooses
// which part of Slow Reader container runs. `manifest` argument prints
// hashes of web client’s JS and HTML files to compare them with the deployed
// ones.

import { type ChildProcess, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Manifest {
  integrity: Record<string, string>
}

function toSources(hashes: string[]): string {
  return hashes.map(hash => `'${hash}'`).join(' ')
}

function replace(conf: string, from: string, to: string): string {
  if (!conf.includes(from)) throw new Error(`No ${from} in nginx.conf`)
  return conf.replaceAll(from, to)
}

function hashInline(pattern: string, tag: RegExp): string[] {
  let hashes = new Set<string>()
  for (let file of globSync(pattern, { cwd: '/var/www' })) {
    if (file.startsWith('ui/')) continue
    let content = readFileSync(join('/var/www', file), 'utf8')
    for (let [, code] of content.matchAll(tag)) {
      hashes.add(
        `sha256-${createHash('sha256').update(code!).digest('base64')}`
      )
    }
  }
  return [...hashes].toSorted()
}

function buildNginxConfig(selfHosted: boolean, webOrigin: string): string {
  let manifest = JSON.parse(
    readFileSync('/var/www/manifest.json', 'utf8')
  ) as Manifest
  let conf = replace(
    readFileSync('/etc/nginx/nginx.conf', 'utf8'),
    '__ROUTES__',
    readFileSync('/etc/nginx/routes.regexp', 'utf8').trim()
  )
  let scripts = Object.keys(manifest.integrity).filter(url =>
    url.endsWith('.js')
  )
  conf = replace(
    conf,
    '__INLINE_SCRIPT_HASHES__',
    toSources(
      hashInline(
        '**/*.html',
        /<script(?: type="importmap")?>([\s\S]*?)<\/script>/g
      )
    )
  )
  // Browsers open SVG as a document with our Content-Security-Policy
  conf = replace(
    conf,
    '__STYLE_HASHES__',
    toSources(hashInline('**/*.{html,svg}', /<style>([\s\S]*?)<\/style>/g))
  )
  // Safari ignores import map hashes in CSP and no browser checks worker’s
  // hash, so we allow JS by exact URLs. `integrity` still checks the content.
  conf = replace(
    conf,
    '__SCRIPT_URLS__',
    scripts.map(url => new URL(url, webOrigin).href).join(' ')
  )
  conf = replace(conf, '__WEB_ORIGIN__', webOrigin)
  let rules = ''

  if (process.env.STAGING || selfHosted) {
    rules +=
      '    location = /robots.txt {\n' +
      '      default_type text/plain;\n' +
      '      return 200 "User-agent: *\\nDisallow: /\\n";\n' +
      '    }\n\n'
  }

  if (process.env.BEHIND_BALANCER) {
    rules +=
      '    set_real_ip_from 0.0.0.0/0;\n' +
      '    set_real_ip_from ::/0;\n' +
      '    real_ip_header X-Forwarded-For;\n\n'
  }

  if (selfHosted) {
    // Self-hosted server has no landing, so the app opens on /
    conf = replace(
      conf,
      'try_files /index.html /app.html =404;',
      'try_files /app.html =404;'
    )
  }

  return replace(
    conf,
    '    location = /health {',
    rules + '    location = /health {'
  )
}

let children = new Set<ChildProcess>()
let stopping = false

function start(
  command: string,
  args: string[],
  stopSignal: NodeJS.Signals
): void {
  let child = spawn(command, args, { stdio: 'inherit' })
  children.add(child)
  // Container must restart if nginx or Node.js server stops
  child.on('exit', code => {
    children.delete(child)
    if (!stopping || children.size === 0) process.exit(code ?? 1)
  })
  for (let signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      stopping = true
      child.kill(stopSignal)
    })
  }
}

function startNginx(selfHosted: boolean, webOrigin: string): void {
  writeFileSync('/tmp/nginx.conf', buildNginxConfig(selfHosted, webOrigin))
  start(
    '/usr/bin/nginx',
    ['-c', '/tmp/nginx.conf', '-e', '/dev/stderr', '-g', 'daemon off;'],
    'SIGQUIT'
  )
}

function startSandboxed(file: string, writable?: string): void {
  start(
    process.execPath,
    [
      '--permission',
      '--allow-fs-read=/var/app',
      ...(writable
        ? [`--allow-fs-read=${writable}`, `--allow-fs-write=${writable}`]
        : []),
      '--allow-net',
      '--disable-warning=ExperimentalWarning',
      file
    ],
    'SIGTERM'
  )
}

let role = process.env.ROLE ?? ''
if (process.argv[2] === 'manifest') {
  process.stdout.write(readFileSync('/var/www/manifest.json'))
} else if (role === 'proxy') {
  process.env.PORT = '2553'
  startSandboxed(fileURLToPath(import.meta.resolve('@slowreader/proxy/server')))
} else if (role === 'app' || role === '') {
  let { config } = await import('./lib/config.ts')
  startNginx(role === '', config.webOrigin)
  process.env.LOGUX_HOST = '127.0.0.1'
  process.env.PORT = '2554'
  let data = config.db.startsWith('file://')
    ? config.db.slice('file://'.length)
    : undefined
  // PGlite can’t init database in a folder, which didn’t exist on Node.js
  // start with --permission
  if (data) mkdirSync(data, { recursive: true })
  startSandboxed(join(import.meta.dirname, 'index.ts'), data)
} else {
  process.stderr.write(`Unknown ROLE=${role}, use "app", "proxy", or nothing\n`)
  process.exit(1)
}
