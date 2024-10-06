import { spyOn } from 'nanospy'
import { cleanStores, keepMount } from 'nanostores'
import { equal, match, throws } from 'node:assert'
import { afterEach, test } from 'node:test'

import { client, getClient, userId } from '../index.ts'
import { enableClientTest } from './utils.ts'

enableClientTest()

afterEach(() => {
  cleanStores(client)
})

test('re-create client on user ID changes', () => {
  userId.set(undefined)
  keepMount(client)
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
  }, 'Error: No Slow Reader client')

  userId.set('10')
  match(getClient().clientId, /^10:/)
})
