/**
 * Client’s protocol version
 */
export const SUBPROTOCOL = 0
export const SUBPROTOCOL_ERROR_MESSAGE = 'Outdated client'

/**
 * Project’s version to use in UI.
 */
export const VERSION = '0.20240101.0'

export * from './http/signin.ts'
export * from './http/signout.ts'
export * from './http/signup.ts'
export type { Endpoint, Requester } from './http/utils.ts'
export * from './logux/password.ts'
export * from './logux/users.ts'
export * from './validators/auth.ts'
