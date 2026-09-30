import type { Proof } from '../types/auth.ts'
import { IS_AUTH_KEY } from './auth.ts'
import { hasKey, isObject } from './utils.ts'

export interface RegistrationResponse {
  authenticatorAttachment?: 'cross-platform' | 'platform'
  clientExtensionResults: Record<string, never>
  id: string
  rawId: string
  response: {
    attestationObject: string
    authenticatorData?: string
    clientDataJSON: string
    publicKey?: string
    publicKeyAlgorithm?: number
    transports?: string[]
  }
  type: 'public-key'
}

export interface AuthenticationResponse {
  authenticatorAttachment?: 'cross-platform' | 'platform'
  clientExtensionResults: Record<string, never>
  id: string
  rawId: string
  response: {
    authenticatorData: string
    clientDataJSON: string
    signature: string
    userHandle?: string
  }
  type: 'public-key'
}

const BASE64URL = /^[\w-]*$/

function isBase64(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    BASE64URL.test(value)
  )
}

function isOptional(
  object: object,
  key: string,
  check: (value: unknown) => boolean
): boolean {
  return !hasKey(object, key) || check(object[key])
}

function isTransports(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every(i => typeof i === 'string' && i.length <= 20)
  )
}

function isCommon(value: unknown): value is {
  clientExtensionResults: Record<string, never>
  id: string
  rawId: string
  response: object
  type: 'public-key'
} {
  return (
    isObject(value) &&
    hasKey(value, 'id') &&
    isBase64(value.id, 1400) &&
    hasKey(value, 'rawId') &&
    value.rawId === value.id &&
    hasKey(value, 'type') &&
    value.type === 'public-key' &&
    hasKey(value, 'clientExtensionResults') &&
    isObject(value.clientExtensionResults) &&
    Object.keys(value.clientExtensionResults).length === 0 &&
    hasKey(value, 'response') &&
    isObject(value.response) &&
    isOptional(
      value,
      'authenticatorAttachment',
      i => i === 'cross-platform' || i === 'platform'
    )
  )
}

export function isRegistrationResponse(
  value: unknown
): value is RegistrationResponse {
  if (!isCommon(value)) return false
  let response = value.response
  return (
    hasKey(response, 'clientDataJSON') &&
    isBase64(response.clientDataJSON, 2000) &&
    hasKey(response, 'attestationObject') &&
    isBase64(response.attestationObject, 20000) &&
    isOptional(response, 'authenticatorData', i => isBase64(i, 20000)) &&
    isOptional(response, 'publicKey', i => isBase64(i, 2000)) &&
    isOptional(response, 'publicKeyAlgorithm', i => typeof i === 'number') &&
    isOptional(response, 'transports', isTransports)
  )
}

export function isAuthenticationResponse(
  value: unknown
): value is AuthenticationResponse {
  if (!isCommon(value)) return false
  let response = value.response
  return (
    hasKey(response, 'clientDataJSON') &&
    isBase64(response.clientDataJSON, 2000) &&
    hasKey(response, 'authenticatorData') &&
    isBase64(response.authenticatorData, 2000) &&
    hasKey(response, 'signature') &&
    isBase64(response.signature, 2000) &&
    isOptional(response, 'userHandle', i => isBase64(i, 100))
  )
}

export function isProof(value: unknown): value is Proof {
  if (hasKey(value, 'authKey')) {
    return typeof value.authKey === 'string' && IS_AUTH_KEY.test(value.authKey)
  } else if (hasKey(value, 'assertion')) {
    return isAuthenticationResponse(value.assertion)
  } else {
    return false
  }
}
