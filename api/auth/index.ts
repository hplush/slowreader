import { request } from '../utils'

export async function sendSignIn(
  wsUrl: string,
  userId: string,
  accessSecret: string
): Promise<boolean> {
  try {
    await request('PUT', wsUrl, `token`, { userId, accessSecret })
  } catch (e) {
    if (e instanceof Error && e.message === 'Response code 400') {
      return false
    } else {
      throw e
    }
  }
  return true
}

export async function sendSignUp(
  wsUrl: string,
  userId: string,
  accessSecret: string
): Promise<void> {
  await request('POST', wsUrl, `users`, { userId, accessSecret })
}

export async function sendSignOut(wsUrl: string): Promise<void> {
  await request('DELETE', wsUrl, 'token')
}
