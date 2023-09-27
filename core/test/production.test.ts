import './environment.js'

import { cleanStores } from 'nanostores'
import { match } from 'node:assert'
import { afterEach, test } from 'node:test'

import { client, userId } from '../index.js'

global.WebSocket = function () {} as any

afterEach(() => {
  cleanStores(client)
  userId.set(undefined)
})

test('uses real server in production', () => {
  userId.set('10')
  match(client.get()!.options.server as string, /^ws:\/\//)
})
