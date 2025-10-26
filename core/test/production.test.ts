import './environment.ts'

import { cleanStores } from 'nanostores'
import { match } from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { client } from '../index.ts'
import { setTestUser } from './utils.ts'

global.WebSocket = function () {} as any

afterEach(() => {
  cleanStores(client)
  setTestUser(false)
})

test('uses real server in production', () => {
  setTestUser()
  match(client.get()!.options.server as string, /^ws:\/\//)
})
