/**
 * Client’s protocol version
 */
export const SUBPROTOCOL = 0

/**
 * Project’s version to use in UI.
 */
export const VERSION = '0.20240101.0'

export * from './http/common.ts'
export * from './http/sign-in.ts'
export * from './http/sign-out.ts'
export * from './http/sign-up.ts'
export type { Endpoint, Requester } from './http/utils.ts'
export * from './logux/password.ts'
export * from './logux/users.ts'
export * from './validators/auth.ts'
