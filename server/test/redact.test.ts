import { signUp } from '@slowreader/api'
import { equal, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { redactLogger } from '../lib/redact.ts'
import { buildTestServer, cleanAllTables, testRequest } from './utils.ts'

describe('server logs', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('marks secrets in logs as redacted', async () => {
    let records: unknown[] = []
    function write(...args: unknown[]): void {
      records.push(args)
    }
    let logger = {
      debug: write,
      error: write,
      fatal: write,
      info: write,
      warn: write
    }
    redactLogger(logger)
    await using server = buildTestServer({ logger })
    server.logger = logger

    let user = await testRequest(server, signUp, {
      password: 'AAAAAAAAAA',
      userId: '0000000000000000'
    })
    await server.connect('0000000000000000', { token: user.session })
    server.logger.error(
      new Error('Failed query: select\nparams: BBBBBBBBBB'),
      'Failed'
    )
    await setTimeout(50)

    let output = JSON.stringify(records, (key, value: unknown) => {
      return value instanceof Error
        ? { ...value, message: value.message }
        : value
    })
    for (let secret of ['AAAAAAAAAA', 'BBBBBBBBBB', user.session]) {
      equal(output.includes(secret), false, `${secret} is in logs`)
    }
    ok(output.includes('"password":"[redacted]"'))
    ok(output.includes('"ipAddress":"[redacted]"'))
    ok(output.includes('params: [redacted]'))
  })
})
