import { signOut, signUp, signIn } from '../'

global.fetch = () => Promise.resolve({ status: 200 } as Response)

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

it('sends sign-up request', async () => {
  await signUp('wss://example.com/', 'user_id', 'secret')
  expect(fetch).toHaveBeenCalledWith('https://example.com/users', {
    method: 'POST',
    body: '{"userId":"user_id","accessPassword":"secret"}'
  })
})

it('sends sign-out request', async () => {
  await signOut('wss://example.com/')
  expect(fetch).toHaveBeenCalledWith('https://example.com/token', {
    method: 'DELETE',
    body: undefined
  })
})

it('sends sign-in request', async () => {
  let result = await signIn('wss://example.com/', 'user_id', 'secret')
  expect(result).toBe(true)
  expect(fetch).toHaveBeenCalledWith('https://example.com/token', {
    method: 'PUT',
    body: '{"userId":"user_id","accessPassword":"secret"}'
  })
})

it('returns false on wrong user/password', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ status: 404 } as Response))
  let result = await signIn('wss://example.com/', 'user_id', 'secret')
  expect(result).toBe(false)
})

it('throws received error', async () => {
  let error = new Error('test')
  jest.spyOn(global, 'fetch').mockReturnValue(Promise.reject(error))
  await expect(
    signIn('wss://example.com/', 'user_id', 'secret')
  ).rejects.toThrow(error)
})
