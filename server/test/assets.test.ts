import { TestServer } from '@logux/server'
import { nanoid } from 'nanoid'
import { deepStrictEqual, equal, match } from 'node:assert'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'

import { config } from '../lib/config.ts'
import assetsModule from '../modules/assets.ts'

let toDelete: string[] = []
let server: TestServer | undefined

const IGNORE_HEADERS = new Set([
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
  deepStrictEqual(headers, expected)
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
  await writeFile(join(assetsDir, 'ui', 'index.html'), '<html>Storybook</html>')
  await writeFile(join(assetsDir, 'data'), 'D')
  await mkdir(join(assetsDir, 'assets'))
  await writeFile(join(assetsDir, 'assets', 'app-CiUGZyvO.css'), '*{}')
  toDelete.push(assetsDir)

  let hidden = `${nanoid()}.txt`
  await writeFile(join(assetsDir, '..', hidden), 'H')
  toDelete.push(join(assetsDir, '..', hidden))

  let routes = join(tmpdir(), nanoid())
  await writeFile(routes, '^\\/welcome$|^\\/feeds(?:\\/([^/]+))?$')
  toDelete.push(routes)

  server = new TestServer()
  await assetsModule(server, { ...config, assets: true, assetsDir, routes })

  let index1 = await server.fetch('/')
  checkHeaders(index1, {
    'content-security-policy':
      "base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self' z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg==; style-src 'self' WHD6ulkGEqykJOGo6klppzioMxOPVblnfwiGe1TxkCVE5bOc4v6cMqZ9URL5ooT++J3mAgP102MFoDHPaaX10g==",
    'content-type': 'text/html',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff'
  })
  match(await index1.text(), /App/)

  let route1 = await server.fetch('/welcome')
  match(await route1.text(), /App/)

  let route2 = await server.fetch('/welcome/')
  match(await route2.text(), /App/)

  let route3 = await server.fetch('/feeds/X2ZGRL3cXtar4oyuyM7jQ')
  match(await route3.text(), /App/)

  let icon1 = await server.fetch('/favicon.ico')
  checkHeaders(icon1, { 'content-type': 'image/x-icon' })
  equal(await icon1.text(), 'A')

  let icon2 = await server.fetch('/favicon.ico')
  checkHeaders(icon2, { 'content-type': 'image/x-icon' })
  equal(await icon2.text(), 'A')

  let css = await server.fetch('/assets/app-CiUGZyvO.css')
  checkHeaders(css, {
    'cache-control': 'public, immutable',
    'content-type': 'text/css'
  })
  equal(await css.text(), '*{}')

  let story1 = await server.fetch('/ui/')
  checkHeaders(story1, { 'content-type': 'text/html' })
  equal(await story1.text(), '<html>Storybook</html>')

  let story2 = await server.fetch('/ui/')
  checkHeaders(story2, { 'content-type': 'text/html' })
  equal(await story2.text(), '<html>Storybook</html>')

  let data = await server.fetch('/data')
  checkHeaders(data, { 'content-type': 'application/octet-stream' })
  equal(await data.text(), 'D')

  let post = await server.fetch('/', { method: 'POST' })
  equal(post.status, 404)

  let unknown = await server.fetch('/unknown')
  equal(unknown.status, 404)

  let prohibited1 = await server.fetch('/./db.ts')
  equal(prohibited1.status, 404)

  let prohibited2 = await server.fetch(`/../${hidden}`)
  equal(prohibited2.status, 404)
})

test('ignores on missed environment variable', async () => {
  server = new TestServer()
  await assetsModule(server, {
    ...config,
    assets: false,
    assetsDir: undefined,
    routes: undefined
  })

  let index = await server.fetch('/')
  match(await index.text(), /Logux/)

  let icon = await server.fetch('/favicon.ico')
  equal(icon.status, 404)
})
