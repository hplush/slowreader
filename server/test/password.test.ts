import { equal, match } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { authKeyMatches, hashAuthKey } from '../lib/password.ts'

describe('password', () => {
  test('hashes auth key', async () => {
    let hash = await hashAuthKey('secret')
    match(hash, /^\$argon2id\$v=19\$m=65536,p=4,t=3\$[\w+/]{22}\$[\w+/]{43}$/)
    equal(await authKeyMatches(hash, 'secret'), true)
    equal(await authKeyMatches(hash, 'wrong'), false)
  })

  test('checks hashes from argon2 package', async () => {
    let hash =
      '$argon2id$v=19$m=65536,p=4,t=3$Ty87kyLO6cMpZEiH7D/vCA$' +
      'DwR0xmXITUdNjgX3T4cVh0k0kUKSOSodR5RLy6VU/XE'
    equal(await authKeyMatches(hash, 'secret'), true)
    equal(await authKeyMatches(hash, 'wrong'), false)
  })

  test('rejects hash with other settings', async () => {
    equal(await authKeyMatches('$argon2id$v=19$m=4096,p=4,t=3$a$b', 'x'), false)
  })
})
