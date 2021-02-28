import { jest } from '@jest/globals'

import { request } from '.'

global.fetch = () => Promise.resolve({ ok: true } as Response)

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

afterEach(() => {
  jest.clearAllMocks()
})

it('converts URL and stringify params', async () => {
  await request('POST', 'wss://example.com/', 'test', { one: '1' })
  expect(fetch).toHaveBeenCalledWith('https://example.com/test', {
    method: 'POST',
    body: '{"one":"1"}'
  })
})

it('supports HTTP', async () => {
  await request('PUT', 'ws://127.0.0.1/', 'test', { one: '1' })
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1/test', {
    method: 'PUT',
    body: '{"one":"1"}'
  })
})

it('throws on non-2xx response state', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ ok: false, status: 404 } as Response))
  await expect(
    request('POST', 'wss://example.com/', 'test', { one: '1' })
  ).rejects.toEqual(new Error('Response code 404'))
})

it('supports other 2xx statuses', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ ok: true, status: 201 } as Response))
  await request('POST', 'wss://example.com/', 'test', { one: '1' })
})

it('supports body-less requests', async () => {
  await request('POST', 'ws://127.0.0.1/', 'test')
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1/test', {
    method: 'POST',
    body: undefined
  })
})
