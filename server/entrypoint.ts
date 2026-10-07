// Docker image starts with this file. ROLE environment variable chooses
// which part of Slow Reader container runs.

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

function replace(conf: string, from: string, to: string): string {
  if (!conf.includes(from)) throw new Error(`No ${from} in nginx.conf`)
  return conf.replace(from, to)
}

function findSvgIcons(): Set<string> {
  let icons = new Set<string>()
  for (let page of ['app.html', 'index.html']) {
    let html = readFileSync(`/var/www/${page}`, 'utf8')
    for (let [tag] of html.matchAll(
      /<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>/g
    )) {
      icons.add(tag)
    }
  }
  return icons
}

function buildNginxConfig(selfHosted: boolean): string {
  let conf = replace(
    readFileSync('/etc/nginx/nginx.conf', 'utf8'),
    '__ROUTES__',
    readFileSync('/etc/nginx/routes.regexp', 'utf8').trim()
  )
  let rules = ''

  if (process.env.STAGING || selfHosted) {
    rules +=
      '    location = /robots.txt {\n' +
      '      default_type text/plain;\n' +
      '      return 200 "User-agent: *\\nDisallow: /\\n";\n' +
      '    }\n\n'
  }

  if (process.env.STAGING) {
    rules +=
      '    sub_filter_once off;\n' +
      `    sub_filter '<link rel="icon" href="/favicon.ico" sizes="32x32" />' '';\n`
    for (let icon of findSvgIcons()) {
      rules += `    sub_filter '${icon}' '<link rel="icon" href="/icon-staging.svg" type="image/svg+xml" />';\n`
    }
    rules += '\n'
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

function startNginx(selfHosted: boolean): void {
  writeFileSync('/tmp/nginx.conf', buildNginxConfig(selfHosted))
  let nginx = spawn(
    '/usr/bin/nginx',
    ['-c', '/tmp/nginx.conf', '-e', '/dev/stderr', '-g', 'daemon off;'],
    { stdio: 'inherit' }
  )
  // Container must restart if nginx or Node.js server stops
  nginx.on('exit', code => {
    process.exit(code ?? 1)
  })
  for (let signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      nginx.kill('SIGQUIT')
    })
  }
}

let role = process.env.ROLE ?? ''
if (role === 'proxy') {
  process.env.PORT = '2553'
  await import('@slowreader/proxy/server')
} else if (role === 'app' || role === '') {
  startNginx(role === '')
  process.env.LOGUX_HOST = '127.0.0.1'
  process.env.PORT = '2554'
  await import('./index.ts')
} else {
  process.stderr.write(`Unknown ROLE=${role}, use "app", "proxy", or nothing\n`)
  process.exit(1)
}
