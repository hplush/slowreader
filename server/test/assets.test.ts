import { TestServer } from '@logux/server'
import { nanoid } from 'nanoid'
import { deepEqual, equal, match } from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, test } from 'node:test'

import { config } from '../lib/config.ts'
import assetsModule from '../modules/assets.ts'

describe('server assets', () => {
  let toDelete: string[] = []
  let server: TestServer | undefined

  let SECURITY = {
    'cross-origin-embedder-policy': 'credentialless',
    'cross-origin-opener-policy': 'same-origin',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff'
  }

  let IGNORE_HEADERS = new Set([
    'connection',
    'date',
    'keep-alive',
    'transfer-encoding'
  ])

  function checkHeaders(res: Response, expected: Record<string, string>): void {
    equal(res.status, 200)
    let headers: Record<string, string> = {}
    for (let [header, value] of res.headers.entries()) {
      if (!IGNORE_HEADERS.has(header)) {
        headers[header] = value
      }
    }
    deepEqual(headers, expected)
  }

  afterEach(async () => {
    await server?.destroy()
    server = undefined
    for (let i of toDelete) {
      await rm(i, { recursive: true })
    }
    toDelete = []
  })

  test('serves static pages', async () => {
    let assetsDir = join(tmpdir(), nanoid())
    await mkdir(assetsDir)
    await writeFile(
      join(assetsDir, 'index.html'),
      '<html><style>*{}</style><script></script>App</html>'
    )
    await writeFile(join(assetsDir, 'favicon.ico'), 'A')
    await mkdir(join(assetsDir, 'ui'))
    await writeFile(
      join(assetsDir, 'ui', 'index.html'),
      '<html>Storybook</html>'
    )
    await writeFile(
      join(assetsDir, '404.html'),
      '<html><style>:root{}</style><404</html>'
    )
    await writeFile(join(assetsDir, 'data'), 'D')
    await writeFile(join(assetsDir, 'demo.json'), '{}')
    await writeFile(join(assetsDir, 'demo.sqlite'), 'S')
    await mkdir(join(assetsDir, 'assets'))
    await writeFile(join(assetsDir, 'assets', 'app-CiUGZyvO.css'), '*{}')
    await writeFile(
      join(assetsDir, 'assets', 'worker-CBmSnzIj.js'),
      'postMessage(1)'
    )
    await writeFile(join(assetsDir, 'assets', 'sqlite3-DGXXSD5r.wasm'), 'W')
    toDelete.push(assetsDir)

    let hidden = `${nanoid()}.txt`
    await writeFile(join(assetsDir, '..', hidden), 'H')
    toDelete.push(join(assetsDir, '..', hidden))

    let routes = join(tmpdir(), nanoid())
    await writeFile(routes, '^\\/welcome$|^\\/feeds(?:\\/([^/]+))?$')
    toDelete.push(routes)

    server = new TestServer()
    await assetsModule(server, { ...config, assets: true }, assetsDir, routes)

    let index1 = await server.fetch('/')
    checkHeaders(index1, {
      'content-security-policy':
        "object-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'; style-src 'sha256-SmAM1DSNiCCdAEabBHfOLWn8GuDZmajUjuFmodxWN5E=' 'sha256-jao29H8BKSlaiUqByFnf6MxYoYKKc1augDeFhsmIVag=' 'sha256-A+WIF57Zi2pZ+PSfiD5lb/2xvVRTUhW02IK/tX5ZT3s=' 'sha256-uiWkQb6L1FmUhEr5KBFM9oqhcGX0BqUksFZpGOiLpWo=' 'sha256-1tI7zFRuDBdCe/c3JvEG6N6f/fad51GVV86/f9tEXVw=' 'self'; script-src 'sha256-iliif2S6Fr8mQazzDJs2huHUeow98/TYx+Staat/56E=' 'sha256-qcw7nJXFn+YgQEAEcmC4BSxlmbIgcivQD0w8cwoeqNE=' 'wasm-unsafe-eval' 'self'; require-trusted-types-for 'script'; trusted-types default dompurify slowreader-rich svelte-trusted-html slowreader-parse",
      'content-type': 'text/html',
      ...SECURITY
    })
    match(await index1.text(), /App/)

    let html = await server.fetch('/404.html')
    checkHeaders(html, {
      'content-security-policy':
        "object-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'; style-src 'sha256-SmAM1DSNiCCdAEabBHfOLWn8GuDZmajUjuFmodxWN5E=' 'sha256-jao29H8BKSlaiUqByFnf6MxYoYKKc1augDeFhsmIVag=' 'sha256-A+WIF57Zi2pZ+PSfiD5lb/2xvVRTUhW02IK/tX5ZT3s=' 'sha256-uiWkQb6L1FmUhEr5KBFM9oqhcGX0BqUksFZpGOiLpWo=' 'sha256-1tI7zFRuDBdCe/c3JvEG6N6f/fad51GVV86/f9tEXVw=' 'self'; script-src 'sha256-iliif2S6Fr8mQazzDJs2huHUeow98/TYx+Staat/56E=' 'sha256-qcw7nJXFn+YgQEAEcmC4BSxlmbIgcivQD0w8cwoeqNE=' 'wasm-unsafe-eval' 'self'; require-trusted-types-for 'script'; trusted-types default dompurify slowreader-rich svelte-trusted-html slowreader-parse",
      'content-type': 'text/html',
      ...SECURITY
    })
    match(await html.text(), /<html>/)

    let route1 = await server.fetch('/welcome')
    match(await route1.text(), /App/)

    let route2 = await server.fetch('/welcome/')
    match(await route2.text(), /App/)

    let route3 = await server.fetch('/feeds/X2ZGRL3cXtar4oyuyM7jQ')
    match(await route3.text(), /App/)

    let icon1 = await server.fetch('/favicon.ico')
    checkHeaders(icon1, { 'content-type': 'image/x-icon', ...SECURITY })
    equal(await icon1.text(), 'A')

    let icon2 = await server.fetch('/favicon.ico')
    checkHeaders(icon2, { 'content-type': 'image/x-icon', ...SECURITY })
    equal(await icon2.text(), 'A')

    let css = await server.fetch('/assets/app-CiUGZyvO.css')
    checkHeaders(css, {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'text/css',
      ...SECURITY
    })
    equal(await css.text(), '*{}')

    // The worker will not start without the isolation headers
    let worker = await server.fetch('/assets/worker-CBmSnzIj.js')
    checkHeaders(worker, {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/javascript',
      ...SECURITY
    })
    equal(await worker.text(), 'postMessage(1)')

    // `WebAssembly.instantiateStreaming()` needs the correct MIME type
    let wasm = await server.fetch('/assets/sqlite3-DGXXSD5r.wasm')
    checkHeaders(wasm, {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/wasm',
      ...SECURITY
    })

    // The demo files change on every rebuild, so the browser must ask for them
    let manifest = await server.fetch('/demo.json')
    checkHeaders(manifest, {
      'cache-control': 'no-store',
      'content-type': 'application/json',
      ...SECURITY
    })
    equal(await manifest.text(), '{}')

    let database = await server.fetch('/demo.sqlite')
    checkHeaders(database, {
      'cache-control': 'no-store',
      'content-type': 'application/vnd.sqlite3',
      ...SECURITY
    })
    equal(await database.text(), 'S')

    let story1 = await server.fetch('/ui/')
    checkHeaders(story1, { 'content-type': 'text/html', ...SECURITY })
    equal(await story1.text(), '<html>Storybook</html>')

    let story2 = await server.fetch('/ui/')
    checkHeaders(story2, { 'content-type': 'text/html', ...SECURITY })
    equal(await story2.text(), '<html>Storybook</html>')

    let data = await server.fetch('/data')
    checkHeaders(data, {
      'content-type': 'application/octet-stream',
      ...SECURITY
    })
    equal(await data.text(), 'D')

    let post = await server.fetch('/', { method: 'POST' })
    equal(post.status, 404)

    let unknown = await server.fetch('/unknown', {
      headers: { Accept: 'text/html,application/xhtml+xml' }
    })
    equal(unknown.status, 404)
    equal(unknown.headers.get('content-type'), 'text/html')
    match(await unknown.text(), /<404/)

    // Non-browser clients should get the short answer instead of the page
    let api = await server.fetch('/unknown', { headers: { Accept: '*/*' } })
    equal(api.status, 404)
    equal(api.headers.get('content-type'), 'text/plain')

    let prohibited1 = await server.fetch('/./db.ts')
    equal(prohibited1.status, 404)

    let prohibited2 = await server.fetch(`/../${hidden}`)
    equal(prohibited2.status, 404)
  })

  test('ignores on missed environment variable', async () => {
    server = new TestServer()
    await assetsModule(
      server,
      {
        ...config,
        assets: false
      },
      import.meta.dirname,
      import.meta.filename
    )
    let index = await server.fetch('/')
    match(await index.text(), /Logux/)

    let icon = await server.fetch('/favicon.ico')
    equal(icon.status, 404)
  })
})
