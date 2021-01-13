import { signUp, signIn } from '../'

global.fetch = () => Promise.resolve({ status: 200 } as Response)

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

it('sends sign-up request', async () => {
  await signUp('wss://example.com/', 'user_id', 'secret')
  expect(fetch).toHaveBeenCalledWith('https://example.com/signup', {
    method: 'POST',
    body: '{"userId":"user_id","accessPassword":"secret"}'
  })
})

it('sends sign-in request', async () => {
  let result = await signIn('wss://example.com/', 'user_id', 'secret')
  expect(result).toBe(true)
  expect(fetch).toHaveBeenCalledWith('https://example.com/signin', {
    method: 'POST',
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
