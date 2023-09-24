import { keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  generateCredentials,
  preloadImages,
  signOut,
  theme,
  userId
} from '../index.js'
import { cleanClientTest, enableClientTest } from '../test/utils.js'

let restarts = 0

test.before.each(() => {
  enableClientTest({
    restartApp() {
      restarts += 1
    }
  })
})

test.after.each(async () => {
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

test.run()
