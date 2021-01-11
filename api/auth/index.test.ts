import { signUp, signIn } from '../'

global.fetch = () => Promise.resolve({} as Response)

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
  await signIn('wss://example.com/', 'user_id', 'secret')
  expect(fetch).toHaveBeenCalledWith('https://example.com/signin', {
    method: 'POST',
    body: '{"userId":"user_id","accessPassword":"secret"}'
  })
})
