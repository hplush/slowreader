import { TestServer } from '@logux/server'
import { equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import healthModule from '../modules/health.ts'

describe('server health', () => {
  let server: TestServer | undefined

  afterEach(async () => {
    await server?.destroy()
    server = undefined
  })

  test('returns ok when db is healthy', async () => {
    server = new TestServer()
    healthModule(server)

    let response = await server.fetch('/health')
    equal(response.status, 200)
    equal(await response.text(), 'ok\n')
  })
})
