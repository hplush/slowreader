import '../test/ws.js'

import { spyOn } from 'nanospy'
import { test } from 'uvu'
import { equal, match } from 'uvu/assert'

import { client, userId } from '../index.js'

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

test.run()
