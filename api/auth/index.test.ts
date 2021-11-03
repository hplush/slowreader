import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import { sendSignOut, sendSignUp, sendSignIn, mockFetch } from '../index.js'

let requests: object[] = []

test.before.each(() => {
  requests = mockFetch()
})

test('sends sign-up request', async () => {
  await sendSignUp('wss://example.com/', 'user_id', 'secret')
  equal(requests, [
    {
      url: 'https://example.com/users',
      method: 'POST',
      body: '{"userId":"user_id","accessSecret":"secret"}'
    }
  ])
})

test('sends sign-out request', async () => {
  await sendSignOut('wss://example.com/')
  equal(requests, [
    {
      url: 'https://example.com/token',
      method: 'DELETE',
      body: undefined
    }
  ])
})

test('sends sign-in request', async () => {
  let result = await sendSignIn('wss://example.com/', 'user_id', 'secret')
  is(result, true)
  equal(requests, [
    {
      url: 'https://example.com/token',
      method: 'PUT',
      body: '{"userId":"user_id","accessSecret":"secret"}'
    }
  ])
})

test('returns false on wrong user/password', async () => {
  mockFetch(400)
  let result = await sendSignIn('wss://example.com/', 'user_id', 'secret')
  is(result, false)
})

test('throws received error', async () => {
  let error = new Error('test')
  global.fetch = async () => {
    throw error
  }
  let catched
  try {
    await sendSignIn('wss://example.com/', 'user_id', 'secret')
  } catch (e) {
    catched = e
  }
  equal(catched, error)
})

test.run()
