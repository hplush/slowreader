import { request } from '../utils'

export function signIn (wsUrl: string, userId: string, accessPassword: string) {
  return request(wsUrl, 'signin', { userId, accessPassword })
}

export function signUp (wsUrl: string, userId: string, accessPassword: string) {
  return request(wsUrl, 'signup', { userId, accessPassword })
}
