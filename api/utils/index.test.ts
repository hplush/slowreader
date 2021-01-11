import { request } from './'

global.fetch = () => Promise.resolve({} as Response)

beforeEach(() => {
  jest.spyOn(global, 'fetch')
})

it('converts URL and stringify params', async () => {
  await request('wss://example.com/', 'test', { one: '1' })
  expect(global.fetch).toHaveBeenCalledWith('https://example.com/test', {
    method: 'POST',
    body: '{"one":"1"}'
  })
})

it('supports HTTP', async () => {
  await request('ws://127.0.0.1/', 'test', { one: '1' })
  expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1/test', {
    method: 'POST',
    body: '{"one":"1"}'
  })
})

it('throws on non-2xx response state', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ status: 404 } as Response))
  await expect(
    request('wss://example.com/', 'test', { one: '1' })
  ).rejects.toEqual(new Error('Response code 404'))
})

it('supports other 2xx statuses', async () => {
  jest
    .spyOn(global, 'fetch')
    .mockReturnValue(Promise.resolve({ status: 201 } as Response))
  await request('wss://example.com/', 'test', { one: '1' })
})
