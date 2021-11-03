import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { mockFetch } from '../index.js'
import { request } from './index.js'

let requests: object[] = []

test.before.each(() => {
  requests = mockFetch()
})

test('converts URL and stringify params', async () => {
  await request('POST', 'wss://example.com/', 'test', { one: '1' })
  equal(requests, [
    {
      url: 'https://example.com/test',
      method: 'POST',
      body: '{"one":"1"}'
    }
  ])
})

test('supports HTTP', async () => {
  await request('PUT', 'ws://127.0.0.1/', 'test', { one: '1' })
  equal(requests, [
    {
      url: 'http://127.0.0.1/test',
      method: 'PUT',
      body: '{"one":"1"}'
    }
  ])
})

test('throws on non-2xx response state', async () => {
  mockFetch(404)
  let catched
  try {
    await request('POST', 'wss://example.com/', 'test', { one: '1' })
  } catch (e) {
    catched = e
  }
  equal(catched, new Error('Response code 404'))
})

test('supports other 2xx statuses', async () => {
  mockFetch(201)
  await request('POST', 'wss://example.com/', 'test', { one: '1' })
})

test('supports body-less requests', async () => {
  await request('POST', 'ws://127.0.0.1/', 'test')
  equal(requests, [
    {
      url: 'http://127.0.0.1/test',
      method: 'POST',
      body: undefined
    }
  ])
})

test.run()
