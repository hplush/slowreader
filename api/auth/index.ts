import { request } from '../utils'

export async function signIn (
  wsUrl: string,
  userId: string,
  accessPassword: string
) {
  try {
    await request('PUT', wsUrl, `token`, { userId, accessPassword })
  } catch (e) {
    if (e.message === 'Response code 404') {
      return false
    } else {
      throw e
    }
  }
  return true
}

export async function signUp (
  wsUrl: string,
  userId: string,
  accessPassword: string
) {
  await request('POST', wsUrl, `users`, { userId, accessPassword })
}

export async function signOut (wsUrl: string) {
  await request('DELETE', wsUrl, 'token')
}
