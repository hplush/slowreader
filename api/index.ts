/**
 * Client’s protocol version
 */
export const SUBPROTOCOL = 0

/**
 * Project’s version to use in UI.
 */
export const VERSION = '0.20240101.0'

export * from './http/common.ts'
export * from './http/new-password.ts'
export * from './http/passkey-challenge.ts'
export * from './http/password-locked-key.ts'
export * from './http/sign-in.ts'
export * from './http/sign-out.ts'
export * from './http/sign-up.ts'
export type { Endpoint, Requester } from './http/utils.ts'
export * from './logux/db.ts'
export * from './logux/passkeys.ts'
export * from './logux/sessions.ts'
export * from './logux/users.ts'
export * from './types/auth.ts'
export * from './validators/auth.ts'
export * from './validators/webauthn.ts'
