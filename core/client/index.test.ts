import '../test/ws.js'

import { spyOn } from 'nanospy'
import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal, match, throws } from 'uvu/assert'

import { client, getClient, userId } from '../index.js'

test.after.each(() => {
  cleanStores(userId, client)
})

test('re-create client on user ID changes', () => {
  client.listen(() => {})
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
  throws(() => {
    getClient()
  }, /SlowReaderError: SlowReaderNoClient/)

  userId.set('10')
  match(getClient().clientId, /^10:/)
})

test.run()
