import './environment.js'

import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { match } from 'uvu/assert'

import { client, userId } from '../index.js'

global.WebSocket = function () {} as any

test.after.each(() => {
  cleanStores(client)
  userId.set(undefined)
})

test('uses real server in production', () => {
  userId.set('10')
  match(client.get()!.options.server as string, /^ws:\/\//)
})

test.run()
