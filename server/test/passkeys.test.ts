import type { TestServer } from '@logux/server'
import {
  addedPasskeyAction,
  addPasskeyAction,
  deletedPasskeyAction,
  deletePasskeyAction,
  deleteUser,
  loadedPasskeysAction,
  newPassword,
  passwordLockedKey,
  type Proof,
  renamePasskeyAction,
  signIn,
  signUp
} from '@slowreader/api'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { db } from '../db/index.ts'
import {
  authKey,
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator,
  getChallenge,
  PASSKEY_LOCKED_KEY,
  signUpUser,
  testRequest,
  throws
} from './utils.ts'

async function passkeyProof(
  server: TestServer,
  passkey: FakeAuthenticator,
  session: string,
  id?: string
): Promise<Proof> {
  let challenge = await getChallenge(server, 'reauth', session)
  return { assertion: passkey.get({ challenge, id }).response }
}

async function newPasskey(
  server: TestServer,
  passkey: FakeAuthenticator,
  session: string,
  userId: string
): Promise<ReturnType<FakeAuthenticator['create']>> {
  let challenge = await getChallenge(server, 'add', session)
  return passkey.create({ challenge, userId })
}

async function names(): Promise<string[]> {
  let rows = await db.query.passkeys.findMany({ orderBy: { createdAt: 'asc' } })
  return rows.map(i => i.name)
}

describe('server passkeys', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('signs up without password and creates it later', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    let created = passkey.create({
      challenge: await getChallenge(server, 'signUp'),
      userId: '0000000000000000'
    })
    let halfPassword = await server.fetch('/users/0000000000000000', {
      body: JSON.stringify({
        passkey: { lockedKey: PASSKEY_LOCKED_KEY, response: created.response },
        password: { authKey: authKey('A') },
        userId: '0000000000000000'
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT'
    })
    equal(await halfPassword.text(), 'Invalid body')
    let user = await testRequest(server, signUp, {
      passkey: { lockedKey: PASSKEY_LOCKED_KEY, response: created.response },
      userId: '0000000000000000'
    })
    let signed = await testRequest(server, signIn, {
      passkey: passkey.get({ challenge: await getChallenge(server, 'signIn') })
        .response
    })
    equal(signed.hasPassword, false)
    await throws(async () => {
      await testRequest(server, passwordLockedKey, {
        authKey: authKey('A'),
        session: user.session
      })
    }, 'Wrong proof')

    let answer = await testRequest(server, newPassword, {
      authKey: authKey('N'),
      lockedKey: 'N'.repeat(80),
      proof: await passkeyProof(server, passkey, signed.session),
      session: signed.session
    })
    let password = await testRequest(server, passwordLockedKey, {
      authKey: authKey('N'),
      session: answer.session
    })
    equal(password.lockedKey, 'N'.repeat(80))
    let again = await testRequest(server, signIn, {
      passkey: passkey.get({ challenge: await getChallenge(server, 'signIn') })
        .response
    })
    equal(again.hasPassword, true)
    await testRequest(server, signIn, {
      password: { authKey: authKey('N') },
      userId: '0000000000000000'
    })
  })

  test('adds passkeys with re-auth', async () => {
    await using server = buildTestServer()
    let yubikey = new FakeAuthenticator({
      aaguid: '00000000-0000-0000-0000-000000000000'
    })
    let user = await signUpUser(server, '0000000000000000', yubikey)
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    let list = await client.subscribe('users/0000000000000000/passkeys')
    deepEqual(
      list.map(i => i.type),
      ['passkeys/loaded']
    )
    ok(JSON.stringify(list).includes('"name":"Passkey"'))

    let other = await server.connect('0000000000000000', {
      token: user.session
    })
    await other.subscribe('users/0000000000000000/passkeys')

    let created = await newPasskey(
      server,
      yubikey,
      user.session,
      '0000000000000000'
    )
    await server.expectDenied(async () => {
      await client.process(
        addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: { authKey: authKey('X') },
          response: created.response
        })
      )
    })

    await server.expectDenied(async () => {
      await client.process(
        addPasskeyAction({
          lockedKey: 'short',
          proof: { authKey: user.key },
          response: created.response
        })
      )
    })
    await server.expectDenied(async () => {
      await client.process({
        ...addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: { authKey: user.key },
          response: created.response
        }),
        extra: 1
      })
    })

    let second = await newPasskey(
      server,
      yubikey,
      user.session,
      '0000000000000000'
    )
    let received = await other.collect(async () => {
      await client.process(
        addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: { authKey: user.key },
          response: second.response
        })
      )
    })
    deepEqual(
      received.map(i => i.type),
      ['passkeys/added']
    )

    let third = await newPasskey(
      server,
      yubikey,
      user.session,
      '0000000000000000'
    )
    await client.process(
      addPasskeyAction({
        lockedKey: PASSKEY_LOCKED_KEY,
        proof: await passkeyProof(
          server,
          yubikey,
          user.session,
          user.passkeyId
        ),
        response: third.response
      })
    )
    deepEqual(await names(), ['Passkey', 'Passkey 1', 'Passkey 2'])

    let fourth = await newPasskey(
      server,
      yubikey,
      user.session,
      '0000000000000000'
    )
    await server.expectDenied(async () => {
      await client.process(
        addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: {
            assertion: yubikey.get({
              challenge: await getChallenge(server, 'reauth', user.session),
              id: fourth.response.id
            }).response
          },
          response: fourth.response
        })
      )
    })

    await server.expectDenied(async () => {
      await client.process(
        addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: { authKey: user.key },
          response: third.response
        })
      )
    })
  })

  test('renames and deletes passkeys', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    let user = await signUpUser(server, '0000000000000000', passkey)
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    await client.subscribe('users/0000000000000000/passkeys')
    let second = await newPasskey(
      server,
      passkey,
      user.session,
      '0000000000000000'
    )
    await client.process(
      addPasskeyAction({
        lockedKey: PASSKEY_LOCKED_KEY,
        proof: { authKey: user.key },
        response: second.response
      })
    )

    let other = await server.connect('0000000000000000', {
      token: user.session
    })
    await other.subscribe('users/0000000000000000/passkeys')
    let renamed = await other.collect(async () => {
      await client.process(
        renamePasskeyAction({ id: user.passkeyId!, name: 'Work' })
      )
    })
    deepEqual(renamed, [
      { id: user.passkeyId!, name: 'Work', type: 'passkeys/rename' }
    ])
    deepEqual(await names(), ['Work', 'Apple Passwords 1'])

    await server.expectDenied(async () => {
      await client.process(
        renamePasskeyAction({ id: user.passkeyId!, name: ' ' })
      )
    })
    await server.expectDenied(async () => {
      await client.process({
        ...renamePasskeyAction({ id: user.passkeyId!, name: 'Home' }),
        extra: 1
      })
    })
    await server.expectDenied(async () => {
      await client.process(
        renamePasskeyAction({ id: user.passkeyId!, name: 'X'.repeat(101) })
      )
    })
    await server.expectDenied(async () => {
      await client.process(
        addedPasskeyAction({
          createdAt: 0,
          id: 'new',
          lockedKey: PASSKEY_LOCKED_KEY,
          name: 'Hack',
          provider: null,
          synced: false,
          usedAt: 0,
          userId: '0000000000000000'
        })
      )
    })
    await server.expectDenied(async () => {
      await client.process(loadedPasskeysAction({ passkeys: [] }))
    })
    await server.expectDenied(async () => {
      await client.process(
        deletedPasskeyAction({ id: 'new', userId: '0000000000000000' })
      )
    })
    await server.expectError(/does not have callbacks/, async () => {
      await client.process({
        fields: { name: 'Hack' },
        id: 'new',
        type: 'passkeys/create'
      })
    })

    await server.expectDenied(async () => {
      await client.process(
        deletePasskeyAction({ id: user.passkeyId!, proof: { authKey: 'x' } })
      )
    })
    await server.expectDenied(async () => {
      await client.process({
        ...deletePasskeyAction({
          id: user.passkeyId!,
          proof: { authKey: user.key }
        }),
        extra: 1
      })
    })
    await client.process(
      deletePasskeyAction({
        id: user.passkeyId!,
        proof: await passkeyProof(server, passkey, user.session, user.passkeyId)
      })
    )
    deepEqual(await names(), ['Apple Passwords 1'])

    await client.process(
      deletePasskeyAction({
        id: second.response.id,
        proof: await passkeyProof(
          server,
          passkey,
          user.session,
          second.response.id
        )
      })
    )
    deepEqual(await names(), [])
    equal((await db.query.sessions.findMany()).length, 1)
  })

  test('does not allow to change passkeys of another user', async () => {
    await using server = buildTestServer()
    let passkeyA = new FakeAuthenticator()
    let passkeyB = new FakeAuthenticator()
    let userA = await signUpUser(server, '0000000000000000', passkeyA)
    let userB = await signUpUser(server, '0000000000000001', passkeyB)
    let clientA = await server.connect('0000000000000000', {
      token: userA.session
    })

    await server.expectDenied(async () => {
      await clientA.process(
        renamePasskeyAction({ id: userB.passkeyId!, name: 'Hacked' })
      )
    })
    await server.expectDenied(async () => {
      await clientA.process(
        deletePasskeyAction({
          id: userB.passkeyId!,
          proof: { authKey: userA.key }
        })
      )
    })
    await server.expectDenied(async () => {
      await clientA.subscribe('users/0000000000000001/passkeys')
    })
    let list = await clientA.subscribe('users/0000000000000000/passkeys')
    ok(!JSON.stringify(list).includes(userB.passkeyId!))
    ok(JSON.stringify(list).includes(userA.passkeyId!))

    await server.expectDenied(async () => {
      await clientA.process(
        addPasskeyAction({
          lockedKey: PASSKEY_LOCKED_KEY,
          proof: await passkeyProof(
            server,
            passkeyB,
            userA.session,
            userB.passkeyId
          ),
          response: (
            await newPasskey(
              server,
              passkeyA,
              userA.session,
              '0000000000000000'
            )
          ).response
        })
      )
    })
    let rowB = await db.query.passkeys.findFirst({
      where: { id: userB.passkeyId! }
    })
    equal(rowB!.name, 'Apple Passwords')
  })

  test('limits re-auth attempts', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(
      server,
      '0000000000000000',
      new FakeAuthenticator()
    )
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    for (let i = 0; i < 10; i++) {
      await server.expectDenied(async () => {
        await client.process(
          deletePasskeyAction({
            id: user.passkeyId!,
            proof: { authKey: authKey('X') }
          })
        )
      })
    }
    await server.expectDenied(async () => {
      await client.process(
        deletePasskeyAction({
          id: user.passkeyId!,
          proof: { authKey: user.key }
        })
      )
    })
    ok(await db.query.passkeys.findFirst())
  })

  test('deletes user with passkeys', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(
      server,
      '0000000000000000',
      new FakeAuthenticator()
    )
    let client = await server.connect('0000000000000000', {
      token: user.session
    })
    await client.process(deleteUser({}))
    equal(await db.query.passkeys.findFirst(), undefined)
    equal(await db.query.users.findFirst(), undefined)
  })
})
