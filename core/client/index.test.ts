import { MemoryStore } from '@logux/core'
import { spyOn } from 'nanospy'
import { cleanStores, keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal, match, throws } from 'uvu/assert'

import {
  client,
  enableClientTest,
  getClient,
  setLogStore,
  userId
} from '../index.js'

test.before.each(() => {
  enableClientTest()
})

test.after.each(() => {
  cleanStores(userId, client)
  setLogStore(() => new MemoryStore())
})

test('re-create client on user ID changes', () => {
  keepMount(client)
  userId.set(undefined)
  equal(client.get(), undefined)

  userId.set('10')
  match(client.get()!.clientId, /^10:/)

  let destroy10 = spyOn(client.get()!, 'destroy')
  userId.set('11')
  match(client.get()!.clientId, /^11:/)
  equal(destroy10.callCount, 1)

  let destroy11 = spyOn(client.get()!, 'destroy')
  userId.set(undefined)
  equal(client.get(), undefined)
  equal(destroy11.callCount, 1)
})

test('has helper for client area', () => {
  userId.set(undefined)
  throws(() => {
    getClient()
  }, 'SlowReaderNoClient')

  userId.set('10')
  match(getClient().clientId, /^10:/)
})

test('changes log store', () => {
  userId.set('10')
  let store = new MemoryStore()

  setLogStore(() => store)

  equal(getClient().log.store, store)
})

test.run()
