import {
  addPasskeyAction,
  deletePasskeyAction,
  deleteUser,
  newPassword,
  signIn
} from '@slowreader/api'
import { equal, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { redactLogger } from '../lib/redact.ts'
import {
  authKey,
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator,
  getChallenge,
  LOCKED_KEY,
  PASSKEY_LOCKED_KEY,
  signUpUser,
  testRequest
} from './utils.ts'

describe('server logs', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('never logs secrets', async () => {
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

    let passkey = new FakeAuthenticator()
    let user = await signUpUser(server, '0000000000000000', passkey)
    let signed = await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let prfs: ArrayBuffer[] = []
    let assertion = passkey.get({
      challenge: await getChallenge(server, 'signIn'),
      prfSalt: new Uint8Array(32)
    })
    prfs.push(assertion.prf!)
    let byPasskey = await testRequest(server, signIn, {
      passkey: assertion.response
    })
    let client = await server.connect('0000000000000000', {
      token: byPasskey.session
    })
    let added = passkey.create({
      challenge: await getChallenge(server, 'add', byPasskey.session),
      prfSalt: new Uint8Array(32),
      userId: '0000000000000000'
    })
    prfs.push(added.prf!)
    await client.process(
      addPasskeyAction({
        lockedKey: 'A'.repeat(80),
        proof: { authKey: user.key },
        response: added.response
      })
    )
    await client.process(
      deletePasskeyAction({
        id: added.response.id,
        proof: { authKey: user.key }
      })
    )
    let changed = await testRequest(server, newPassword, {
      authKey: authKey('N'),
      lockedKey: 'N'.repeat(80),
      proof: { authKey: user.key },
      session: byPasskey.session
    })
    let last = await server.connect('0000000000000000', {
      token: changed.session
    })
    await last.process(deleteUser({}))
    server.logger.error(
      new Error(`Failed query: select\nparams: ${LOCKED_KEY}`),
      'Failed'
    )
    await setTimeout(50)

    ok(records.length > 10)
    let output = JSON.stringify(records, (key, value: unknown) => {
      return value instanceof Error
        ? { ...value, message: value.message }
        : value
    })
    let secrets = [
      user.key,
      user.session,
      signed.session,
      byPasskey.session,
      changed.session,
      authKey('N'),
      LOCKED_KEY,
      PASSKEY_LOCKED_KEY,
      'A'.repeat(80),
      'N'.repeat(80),
      ...prfs.map(i => Buffer.from(i).toString('base64url'))
    ]
    for (let secret of secrets) {
      equal(output.includes(secret), false, `${secret} is in logs`)
    }
    ok(output.includes('passkeys/add'))
    ok(output.includes('"proof":"[redacted]"'))
  })
})
