import { IS_AUTH_KEY, IS_PASSWORD } from '@slowreader/api'
import { deepEqual, equal, notEqual, ok, rejects } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  generateDataKey,
  generatePassword,
  lockDataKey,
  passkeyUnlockKey,
  passwordUnlockKey,
  prfSalt,
  splitPassword,
  toEncryptionKey,
  unlockDataKey,
  WrongPasswordError
} from '../../lib/keys.ts'

describe('keys', () => {
  test('generates password from two parts', () => {
    let password = generatePassword()
    ok(IS_PASSWORD.test(password))
    let { authKey, unlock } = splitPassword(password)
    ok(IS_AUTH_KEY.test(authKey))
    equal(unlock.length, 32)
    notEqual(generatePassword(), password)
    deepEqual(splitPassword('1'.repeat(66)).unlock, new Uint8Array(32))
  })

  test('locks data key by password', async () => {
    let dataKey = generateDataKey()
    let password = generatePassword()
    let locked = await lockDataKey(
      dataKey,
      await passwordUnlockKey(password, '1000000000000000')
    )
    equal(locked.length, 80)
    deepEqual(
      await unlockDataKey(
        locked,
        await passwordUnlockKey(password, '1000000000000000')
      ),
      dataKey
    )
    await rejects(
      unlockDataKey(
        locked,
        await passwordUnlockKey(password, '1000000000000001')
      ),
      WrongPasswordError
    )
    let otherUnlock = password.slice(0, 22) + generatePassword().slice(22)
    await rejects(
      unlockDataKey(
        locked,
        await passwordUnlockKey(otherUnlock, '1000000000000000')
      ),
      WrongPasswordError
    )
  })

  test('locks data key by passkey', async () => {
    let dataKey = generateDataKey()
    let prf = crypto.getRandomValues(new Uint8Array(32)).buffer
    let locked = await lockDataKey(dataKey, await passkeyUnlockKey(prf))
    deepEqual(await unlockDataKey(locked, await passkeyUnlockKey(prf)), dataKey)
  })

  test('has fixed PRF salt per purpose', async () => {
    deepEqual(await prfSalt('encryption'), await prfSalt('encryption'))
    notEqual(
      Buffer.from(await prfSalt('encryption')).toString('hex'),
      Buffer.from(await prfSalt('private')).toString('hex')
    )
  })

  test('converts data key to non-extractable encryption key', async () => {
    let key = await toEncryptionKey(generateDataKey())
    equal(key.extractable, false)
    await rejects(crypto.subtle.exportKey('raw', key))
  })
})
