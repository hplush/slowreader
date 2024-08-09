import { keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  generateCredentials,
  preloadImages,
  signOut,
  theme,
  userId
} from '../index.ts'
import { cleanClientTest, enableClientTest } from '../test/utils.ts'

let restarts = 0

beforeEach(() => {
  enableClientTest({
    restartApp() {
      restarts += 1
    }
  })
})

afterEach(async () => {
  await cleanClientTest()
  restarts = 0
})

test('generates user data', () => {
  userId.set(undefined)
  keepMount(userId)

  generateCredentials()
  equal(typeof userId.get(), 'string')
})

test('signs out', async () => {
  userId.set('10')
  keepMount(userId)
  equal(restarts, 0)

  await signOut()
  equal(userId.get(), undefined)
  equal(restarts, 1)
})

test('has store for theme', () => {
  equal(theme.get(), 'system')
})

test('has store for images preload settings', () => {
  equal(preloadImages.get(), 'always')
})
