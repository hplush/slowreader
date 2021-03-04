import { jest } from '@jest/globals'

import { sendSignOut, sendSignUp, sendSignIn } from '../'

global.fetch = () => Promise.resolve({ ok: true } as Response)

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

it('sends sign-up request', async () => {
  await sendSignUp('wss://example.com/', 'user_id', 'secret')
  expect(fetch).toHaveBeenCalledWith('https://example.com/users', {
    method: 'POST',
    body: '{"userId":"user_id","accessSecret":"secret"}'
  })
})

it('sends sign-out request', async () => {
  await sendSignOut('wss://example.com/')
  expect(fetch).toHaveBeenCalledWith('https://example.com/token', {
    method: 'DELETE',
    body: undefined
  })
})

it('sends sign-in request', async () => {
  let result = await sendSignIn('wss://example.com/', 'user_id', 'secret')
  expect(result).toBe(true)
  expect(fetch).toHaveBeenCalledWith('https://example.com/token', {
    method: 'PUT',
    body: '{"userId":"user_id","accessSecret":"secret"}'
  })
})

it('returns false on wrong user/password', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ status: 400 } as Response))
  let result = await sendSignIn('wss://example.com/', 'user_id', 'secret')
  expect(result).toBe(false)
})

it('throws received error', async () => {
  let error = new Error('test')
  jest.spyOn(global, 'fetch').mockReturnValue(Promise.reject(error))
  await expect(
    sendSignIn('wss://example.com/', 'user_id', 'secret')
  ).rejects.toThrow(error)
})
