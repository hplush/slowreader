import { TestServer } from '@logux/server'
import { nanoid } from 'nanoid'
import { equal, match } from 'node:assert'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'

import assetsModule from '../modules/assets.ts'

let assets: string | undefined
let server: TestServer | undefined
let originEnv = { ...process.env }

beforeEach(() => {})

afterEach(async () => {
  process.env = originEnv
  await server?.destroy()
  server = undefined
  if (assets) await rm(assets, { recursive: true })
  assets = undefined
})

test('serves static pages', async () => {
  assets = join(tmpdir(), nanoid())
  await mkdir(assets)
  server = new TestServer()
  process.env.ASSETS_DIR = assets
  assetsModule(server)

  await writeFile(join(assets, 'index.html'), '<html>Hi</html>')
  await writeFile(join(assets, 'favicon.ico'), 'A')

  let index1 = await server.fetch('/')
  equal(index1.headers.get('Content-Type'), 'text/html')
  equal(await index1.text(), '<html>Hi</html>')

  let index2 = await server.fetch('/')
  equal(index2.headers.get('Content-Type'), 'text/html')
  equal(await index2.text(), '<html>Hi</html>')

  let index3 = await server.fetch('/index.html')
  equal(index3.headers.get('Content-Type'), 'text/html')
  equal(await index3.text(), '<html>Hi</html>')

  let icon1 = await server.fetch('/favicon.ico')
  equal(icon1.headers.get('Content-Type'), 'image/x-icon')
  equal(await icon1.text(), 'A')

  let icon2 = await server.fetch('/favicon.ico')
  equal(icon2.headers.get('Content-Type'), 'image/x-icon')
  equal(await icon2.text(), 'A')
})

test('ignores on missed environment variable', async () => {
  server = new TestServer()
  assetsModule(server)

  let index = await server.fetch('/')
  match(await index.text(), /Logux/)

  let icon = await server.fetch('/favicon.ico')
  equal(icon.status, 404)
})
