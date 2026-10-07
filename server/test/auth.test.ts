import {
  COMMON_ERRORS,
  newPassword,
  passwordLockedKey,
  signIn,
  signOut,
  signUp
} from '@slowreader/api'
import { sql } from 'drizzle-orm'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { challenges, db } from '../db/index.ts'
import { config } from '../lib/config.ts'
import { createCounter, resetLimits } from '../lib/limits.ts'
import { hashToken } from '../lib/sessions.ts'
import {
  authKey,
  buildTestServer,
  cleanAllTables,
  FakeAuthenticator,
  getChallenge,
  LOCKED_KEY,
  PASSKEY_LOCKED_KEY,
  signUpUser,
  testRequest,
  throws
} from './utils.ts'

function post(
  body: unknown,
  headers: Record<string, string> = {}
): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
    method: 'POST'
  }
}

describe('server auth', () => {
  afterEach(async () => {
    await cleanAllTables()
  })

  test('creates users and check credentials', async () => {
    await using server = buildTestServer()
    let start = Date.now()

    let sessionCookie: string | undefined
    let userA = await testRequest(
      server,
      signUp,
      {
        password: { authKey: authKey('A'), lockedKey: LOCKED_KEY },
        userId: '0000000000000000'
      },
      res => {
        sessionCookie = res.headers.get('Set-Cookie')!
      }
    )
    equal(userA.userId, '0000000000000000')
    equal(typeof userA.session, 'string')
    equal(userA.passkey, undefined)
    ok(sessionCookie?.includes(`session=${userA.session}`))
    ok(sessionCookie?.includes('Max-Age=315360000'))

    let userB = await testRequest(server, signUp, {
      password: { authKey: authKey('B'), lockedKey: LOCKED_KEY },
      userId: '0000000000000001'
    })
    notEqual(userB.session, userA.session)

    let session1 = await db.query.sessions.findFirst({
      where: { tokenHash: hashToken(userA.session) }
    })
    ok(session1!.createdAt.valueOf() >= start)
    ok(session1!.usedAt.valueOf() >= start)
    ok(!JSON.stringify(session1).includes(userA.session))
    equal(session1!.passkeyId, null)

    await setTimeout(100)
    await server.expectWrongCredentials(userA.userId)
    await server.expectWrongCredentials(userA.userId, {
      cookie: { session: userB.session }
    })
    await server.connect(userA.userId, {
      cookie: { session: userA.session }
    })
    let session2 = await db.query.sessions.findFirst({
      where: { tokenHash: hashToken(userA.session) }
    })
    equal(session1!.createdAt.valueOf(), session2!.createdAt.valueOf())
    ok(session2!.usedAt.valueOf() > session1!.usedAt.valueOf())

    let signOutResponse = await server.fetch('/session', {
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${userA.session}`
      },
      method: 'DELETE'
    })
    equal(signOutResponse.status, 200)
    ok(signOutResponse.headers.get('Set-Cookie')?.includes(`session=;`))
    ok(signOutResponse.headers.get('Set-Cookie')?.includes('Max-Age=0'))
    await server.expectWrongCredentials(userA.userId, {
      cookie: { session: userA.session }
    })
    let sessions1 = await db.query.sessions.findMany({
      where: { userId: userA.userId }
    })
    deepEqual(sessions1, [])

    await throws(async () => {
      await testRequest(server, signIn, {
        password: { authKey: authKey('B') },
        userId: userA.userId
      })
    }, 'Invalid credentials')

    await setTimeout(100)
    let token1 = await testRequest(server, signIn, {
      password: { authKey: authKey('A') },
      userId: userA.userId
    })
    equal(token1.lockedKey, LOCKED_KEY)
    await server.connect(userA.userId, { token: token1.session })
    let session3 = await db.query.sessions.findFirst({
      where: { tokenHash: hashToken(token1.session) }
    })
    ok(session3!.usedAt.valueOf() > session2!.usedAt.valueOf())
  })

  test('stores device without versions', async () => {
    await using server = buildTestServer()
    let agent =
      'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'
    let response = await server.fetch('/users/0000000000000000', {
      ...post(
        {
          password: { authKey: authKey('A'), lockedKey: LOCKED_KEY },
          userId: '0000000000000000'
        },
        { 'User-Agent': agent }
      ),
      method: 'PUT'
    })
    equal(response.status, 200)
    let session = await db.query.sessions.findFirst()
    equal(session!.device, 'Firefox|Linux')

    let other = [
      [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) ' +
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 ' +
          'Mobile/15E148 Safari/604.1',
        'Safari|iOS'
      ],
      [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
        'Edge|Windows'
      ],
      [
        'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
        'Chrome|Android'
      ],
      ['curl/8.0', '|']
    ]
    for (let [userAgent, device] of other) {
      await server.fetch(
        '/sessions',
        post(
          { password: { authKey: authKey('A') }, userId: '0000000000000000' },
          { 'User-Agent': userAgent! }
        )
      )
      let last = await db.query.sessions.findMany({
        orderBy: { createdAt: 'desc' }
      })
      ok(last.some(i => i.device === device))
    }
  })

  test('disconnects all clients of session on signOut', async () => {
    await using server = buildTestServer()
    let userA = await signUpUser(server, '0000000000000000')
    let session1 = await testRequest(server, signIn, {
      password: { authKey: userA.key },
      userId: '0000000000000000'
    })
    let client1 = await server.connect('0000000000000000', {
      token: session1.session
    })
    let client1b = await server.connect('0000000000000000', {
      cookie: { session: session1.session }
    })
    let session2 = await testRequest(server, signIn, {
      password: { authKey: userA.key },
      userId: '0000000000000000'
    })
    let client2 = await server.connect('0000000000000000', {
      cookie: { session: session2.session }
    })

    await signOut({ session: session1.session }, { fetch: server.fetch })
    equal(client1.pair.right.connected, false)
    equal(client1b.pair.right.connected, false)
    equal(client2.pair.right.connected, true)
  })

  test('does not allow clients to set password', async () => {
    await using server = buildTestServer()
    await signUpUser(server, '0000000000000000')
    let userB = await signUpUser(server, '0000000000000001')
    let clientB = await server.connect('0000000000000001', {
      token: userB.session
    })
    await server.expectError(/does not have callbacks/, async () => {
      await clientB.process({
        authKey: authKey('H'),
        lockedKey: LOCKED_KEY,
        type: 'passwords/set',
        userId: '0000000000000000'
      })
    })
    await server.expectError(/does not have callbacks/, async () => {
      await clientB.process({ type: 'passwords/delete' })
    })
  })

  test('does not allow to redefine user', async () => {
    await using server = buildTestServer()
    await signUpUser(server, '0000000000000000')
    await throws(async () => {
      await testRequest(server, signUp, {
        password: { authKey: authKey('B'), lockedKey: LOCKED_KEY },
        userId: '0000000000000000'
      })
    }, 'User ID was already taken')
  })

  test('has non-cookie API', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    await server.connect('0000000000000000', { token: user.session })
    await signOut({ session: user.session }, { fetch: server.fetch })
    await server.expectWrongCredentials('0000000000000000', {
      token: user.session
    })
  })

  test('validates request body', async () => {
    await using server = buildTestServer()
    let response1 = await server.fetch('/users', { method: 'PUT' })
    equal(await response1.text(), 'Not found\n')
    let response2 = await server.fetch('/users/1', { method: 'PUT' })
    equal(await response2.text(), 'Wrong content type')
    let response3 = await server.fetch('/users/1', {
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT'
    })
    equal(await response3.text(), 'Invalid JSON')
    let response4 = await server.fetch('/users/1', {
      body: '{',
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT'
    })
    equal(await response4.text(), 'Invalid JSON')
    let response5 = await server.fetch('/users/1', {
      body: '{"id":"1"}',
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT'
    })
    equal(await response5.text(), 'Invalid body')
    let response6 = await server.fetch('/users/1', {
      body: JSON.stringify({
        authKey: authKey('A'),
        lockedKey: LOCKED_KEY,
        userId: '2'
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT'
    })
    equal(await response6.text(), 'Invalid body')
    let response7 = await server.fetch('/sessions', {
      body: JSON.stringify({
        password: { authKey: 'short' },
        userId: '0000000000000000'
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    equal(await response7.text(), 'Invalid body')
    await throws(async () => {
      await testRequest(server, signOut, {})
    }, 'Invalid request')

    let big = await server.fetch(
      '/sessions',
      post({
        password: { authKey: 'A'.repeat(70 * 1024) },
        userId: '0000000000000000'
      })
    )
    equal(big.status, 413)
  })

  test('supports CORS only for web client', async () => {
    await using server = buildTestServer()
    let option = await server.fetch('/users/1', {
      headers: { Origin: config.webOrigin },
      method: 'OPTIONS'
    })
    equal(option.headers.get('Access-Control-Allow-Origin'), config.webOrigin)
    let real = await server.fetch(
      '/sessions',
      post({}, { Origin: config.webOrigin })
    )
    equal(real.headers.get('Access-Control-Allow-Origin'), config.webOrigin)
    let other = await server.fetch('/users/1', {
      headers: { Origin: 'https://evil.slowreader.app' },
      method: 'OPTIONS'
    })
    equal(other.headers.get('Access-Control-Allow-Origin'), null)
  })

  test('rejects old clients', async () => {
    await using server = buildTestServer()
    server.options.minSubprotocol = 2

    let response = await server.fetch('/users/1', {
      headers: {
        'Content-Type': 'application/json',
        'X-Subprotocol': '0'
      },
      method: 'POST'
    })
    equal(response.status, 400)
    let text = await response.text()
    equal(text, COMMON_ERRORS.OUTDATED_CLIENT)
  })

  test('limits failed sign-in attempts per user', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    for (let i = 0; i < 10; i++) {
      let response = await server.fetch(
        '/sessions',
        post({
          password: { authKey: authKey('X') },
          userId: '0000000000000000'
        })
      )
      equal(response.status, 400)
    }
    let blocked = await server.fetch(
      '/sessions',
      post({ password: { authKey: user.key }, userId: '0000000000000000' })
    )
    equal(blocked.status, 429)
  })

  test('limits failed sign-in attempts per IP', async () => {
    await using server = buildTestServer()
    await signUpUser(server, '0000000000000000')
    let user = await signUpUser(server, '0000000000000001')
    for (let i = 0; i < 10; i++) {
      await server.fetch(
        '/sessions',
        post(
          { password: { authKey: authKey('X') }, userId: '0000000000000000' },
          { 'X-Forwarded-For': `10.0.0.${i}, 1.1.1.1` }
        )
      )
    }
    let blocked = await server.fetch(
      '/sessions',
      post(
        { password: { authKey: user.key }, userId: '0000000000000001' },
        { 'X-Forwarded-For': '10.0.0.100, 1.1.1.1' }
      )
    )
    equal(blocked.status, 429)
    let other = await server.fetch(
      '/sessions',
      post(
        { password: { authKey: user.key }, userId: '0000000000000001' },
        { 'X-Forwarded-For': '1.1.1.1, 2.2.2.2' }
      )
    )
    equal(other.status, 200)
  })

  test('forgets counters after window', async () => {
    let counter = createCounter(1, 10)
    counter.add('a')
    equal(counter.isOver('a'), true)
    await setTimeout(20)
    equal(counter.isOver('a'), false)
    counter.add('a')
    equal(counter.isOver('a'), true)
  })

  test('signs up and signs in with passkey', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator({ synced: false })
    let challenge1 = await getChallenge(server, 'signUp')
    let created = passkey.create({
      challenge: challenge1,
      userId: '0000000000000000'
    })
    let user = await testRequest(server, signUp, {
      password: { authKey: authKey('A'), lockedKey: LOCKED_KEY },
      passkey: { lockedKey: PASSKEY_LOCKED_KEY, response: created.response },
      userId: '0000000000000000'
    })
    deepEqual(user.passkey, { provider: 'Apple Passwords', synced: false })
    let stored = await db.query.passkeys.findFirst()
    equal(stored!.name, 'Apple Passwords')
    equal(stored!.userId, '0000000000000000')
    let session1 = await db.query.sessions.findFirst()
    equal(session1!.passkeyId, created.response.id)

    let challenge2 = await getChallenge(server, 'signIn')
    let assertion = passkey.get({ challenge: challenge2 })
    let answer = await testRequest(server, signIn, {
      passkey: assertion.response
    })
    equal(answer.userId, '0000000000000000')
    equal(answer.lockedKey, PASSKEY_LOCKED_KEY)
    await server.connect('0000000000000000', { token: answer.session })

    await throws(async () => {
      await testRequest(server, signIn, { passkey: assertion.response })
    }, 'Invalid credentials')
  })

  test('rejects wrong passkey responses', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    await signUpUser(server, '0000000000000000', passkey)

    let unknown = new FakeAuthenticator()
    unknown.create({ challenge: 'x', userId: '0000000000000000' })
    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: unknown.get({
          challenge: await getChallenge(server, 'signIn')
        }).response
      })
    }, 'Unknown passkey')

    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: passkey.get({
          challenge: await getChallenge(server, 'signIn'),
          userHandle: Buffer.from('0000000000000001').toString('base64url')
        }).response
      })
    }, 'Unknown passkey')

    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: passkey.get({
          challenge: await getChallenge(server, 'signIn'),
          userHandle: null
        }).response
      })
    }, 'Unknown passkey')

    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: passkey.get({ challenge: 'unknown' }).response
      })
    }, 'Invalid credentials')

    let broken = passkey.get({
      challenge: await getChallenge(server, 'signIn')
    }).response
    broken.response.clientDataJSON = Buffer.from('{').toString('base64url')
    await throws(async () => {
      await testRequest(server, signIn, { passkey: broken })
    }, 'Invalid credentials')

    let expired = await getChallenge(server, 'signIn')
    await db.update(challenges).set({ expiresAt: new Date(Date.now() - 1000) })
    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: passkey.get({ challenge: expired }).response
      })
    }, 'Invalid credentials')

    for (let origin of [
      'https://evil.slowreader.app',
      'https://preview-1.slowreader.hplush.dev'
    ]) {
      passkey.origin = origin
      await throws(async () => {
        await testRequest(server, signIn, {
          passkey: passkey.get({
            challenge: await getChallenge(server, 'signIn')
          }).response
        })
      }, 'Invalid credentials')
    }
    passkey.origin = config.webOrigin

    passkey.rpId = 'slowreader.app'
    await throws(async () => {
      await testRequest(server, signIn, {
        passkey: passkey.get({
          challenge: await getChallenge(server, 'signIn')
        }).response
      })
    }, 'Invalid credentials')
  })

  test('rejects wrong passkey on sign up', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator({
      origin: 'https://evil.slowreader.app'
    })
    await throws(async () => {
      await signUpUser(server, '0000000000000000', passkey)
    }, 'Invalid passkey')
    equal(await db.query.users.findFirst(), undefined)

    let good = new FakeAuthenticator()
    let reauth = await signUpUser(server, '0000000000000001')
    let challenge = await getChallenge(server, 'reauth', reauth.session)
    await throws(async () => {
      await testRequest(server, signUp, {
        password: { authKey: authKey('A'), lockedKey: LOCKED_KEY },
        passkey: {
          lockedKey: PASSKEY_LOCKED_KEY,
          response: good.create({ challenge, userId: '0000000000000000' })
            .response
        },
        userId: '0000000000000000'
      })
    }, 'Invalid passkey')
  })

  test('rejects PRF output in requests', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    let { response } = passkey.create({
      challenge: await getChallenge(server, 'signUp'),
      userId: '0000000000000000'
    })
    let answer = await server.fetch('/users/0000000000000000', {
      ...post({
        authKey: authKey('A'),
        lockedKey: LOCKED_KEY,
        passkey: {
          lockedKey: PASSKEY_LOCKED_KEY,
          response: {
            ...response,
            clientExtensionResults: { prf: { results: { first: 'AAAA' } } }
          }
        },
        userId: '0000000000000000'
      }),
      method: 'PUT'
    })
    equal(await answer.text(), 'Invalid body')
  })

  test('uses challenge only once', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    await signUpUser(server, '0000000000000000', passkey)
    let { response } = passkey.get({
      challenge: await getChallenge(server, 'signIn')
    })
    let results = await Promise.all([
      signIn({ passkey: response }, { fetch: server.fetch }),
      signIn({ passkey: response }, { fetch: server.fetch })
    ])
    deepEqual(
      results.map(i => i.status).toSorted((a, b) => a - b),
      [200, 400]
    )
  })

  test('limits challenges', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    for (let i = 0; i < 5; i++) {
      await getChallenge(server, 'reauth', user.session)
    }
    await throws(async () => {
      await getChallenge(server, 'reauth', user.session)
    }, 'Too many requests')

    for (let i = 0; i < 20; i++) await getChallenge(server, 'signIn')
    await throws(async () => {
      await getChallenge(server, 'signUp')
    }, 'Too many requests')

    await throws(async () => {
      await getChallenge(server, 'add')
    }, 'Invalid request')
    await throws(async () => {
      await getChallenge(server, 'add', 'wrong')
    }, 'Invalid request')

    await db.execute(
      sql`INSERT INTO "challenges" ("challenge", "expiresAt", "type")
        SELECT 'c' || i, now() + interval '1 minute', 'authentication'
        FROM generate_series(1, 10000) AS i`
    )
    resetLimits()
    await getChallenge(server, 'signIn')
    let rows = await db.query.challenges.findMany({
      where: { userId: { isNull: true } }
    })
    equal(rows.length, 10000)
    ok(!rows.some(i => i.challenge === 'c1'))
    let other = await signUpUser(server, '0000000000000001')
    await getChallenge(server, 'reauth', other.session)
  })

  test('returns password’s locked key only for the right password', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    await throws(async () => {
      await testRequest(server, passwordLockedKey, { authKey: user.key })
    }, 'Invalid request')
    let answer = await testRequest(server, passwordLockedKey, {
      authKey: user.key,
      session: user.session
    })
    equal(answer.lockedKey, LOCKED_KEY)
    for (let i = 0; i < 10; i++) {
      await throws(async () => {
        await testRequest(server, passwordLockedKey, {
          authKey: authKey('W'),
          session: user.session
        })
      }, 'Wrong proof')
    }
    await throws(async () => {
      await testRequest(server, passwordLockedKey, {
        authKey: user.key,
        session: user.session
      })
    }, 'Too many requests')
  })

  test('generates new password', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    let other = await testRequest(server, signIn, {
      password: { authKey: user.key },
      userId: '0000000000000000'
    })
    let client1 = await server.connect('0000000000000000', {
      token: user.session
    })
    let client2 = await server.connect('0000000000000000', {
      token: other.session
    })

    await throws(async () => {
      await testRequest(server, newPassword, {
        authKey: authKey('N'),
        lockedKey: 'N'.repeat(80),
        proof: { authKey: authKey('W') },
        session: user.session
      })
    }, 'Wrong proof')
    await throws(async () => {
      await testRequest(server, newPassword, {
        authKey: authKey('N'),
        lockedKey: 'N'.repeat(80),
        proof: { authKey: user.key }
      })
    }, 'Invalid request')

    let cookie: string | undefined
    let answer = await testRequest(
      server,
      newPassword,
      {
        authKey: authKey('N'),
        lockedKey: 'N'.repeat(80),
        proof: { authKey: user.key },
        session: user.session
      },
      res => {
        cookie = res.headers.get('Set-Cookie')!
      }
    )
    ok(cookie?.includes(`session=${answer.session}`))
    equal(client1.pair.right.connected, false)
    equal(client2.pair.right.connected, false)
    await server.expectWrongCredentials('0000000000000000', {
      token: user.session
    })
    await server.expectWrongCredentials('0000000000000000', {
      token: other.session
    })
    await server.connect('0000000000000000', { token: answer.session })
    let sessions = await db.query.sessions.findMany()
    equal(sessions.length, 1)

    await throws(async () => {
      await testRequest(server, signIn, {
        password: { authKey: user.key },
        userId: '0000000000000000'
      })
    }, 'Invalid credentials')
    let signed = await testRequest(server, signIn, {
      password: { authKey: authKey('N') },
      userId: '0000000000000000'
    })
    equal(signed.lockedKey, 'N'.repeat(80))
  })

  test('generates new password by passkey', async () => {
    await using server = buildTestServer()
    let passkey = new FakeAuthenticator()
    let user = await signUpUser(server, '0000000000000000', passkey)
    let assertion = passkey.get({
      challenge: await getChallenge(server, 'reauth', user.session)
    })
    let answer = await testRequest(server, newPassword, {
      authKey: authKey('N'),
      lockedKey: 'N'.repeat(80),
      proof: { assertion: assertion.response },
      session: user.session
    })
    let session = await db.query.sessions.findFirst()
    equal(session!.tokenHash, hashToken(answer.session))
    equal(session!.passkeyId, user.passkeyId)

    let otherPasskey = new FakeAuthenticator()
    await signUpUser(server, '0000000000000001', otherPasskey)
    await throws(async () => {
      await testRequest(server, newPassword, {
        authKey: authKey('M'),
        lockedKey: 'M'.repeat(80),
        proof: {
          assertion: otherPasskey.get({
            challenge: await getChallenge(server, 'reauth', answer.session)
          }).response
        },
        session: answer.session
      })
    }, 'Wrong proof')
  })

  test('limits re-auth attempts', async () => {
    await using server = buildTestServer()
    let user = await signUpUser(server, '0000000000000000')
    for (let i = 0; i < 10; i++) {
      await throws(async () => {
        await testRequest(server, newPassword, {
          authKey: authKey('N'),
          lockedKey: 'N'.repeat(80),
          proof: { authKey: authKey('W') },
          session: user.session
        })
      }, 'Wrong proof')
    }
    await throws(async () => {
      await testRequest(server, newPassword, {
        authKey: authKey('N'),
        lockedKey: 'N'.repeat(80),
        proof: { authKey: user.key },
        session: user.session
      })
    }, 'Too many requests')
  })
})
