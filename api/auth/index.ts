import { request } from '../utils'

export async function signIn (
  wsUrl: string,
  userId: string,
  accessPassword: string
) {
  try {
    await request(wsUrl, 'signin', { userId, accessPassword })
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
  await request(wsUrl, 'signup', { userId, accessPassword })
}
