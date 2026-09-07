import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import healthModule from '../modules/health.ts'
import { emptyTestServer } from './utils.ts'

describe('server health', () => {
  test('returns ok when db is healthy', async () => {
    await using server = emptyTestServer()
    healthModule(server)

    let response = await server.fetch('/health')
    equal(response.status, 200)
    equal(await response.text(), 'OK\n')
  })
})
