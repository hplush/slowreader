import type {
  AuthenticationResponse,
  PasskeyChallengeResponse,
  Proof,
  RegistrationResponse
} from '@slowreader/api'

import { getEnvironment, type PasskeyResult } from '../environment.ts'
import { prfSalt } from './keys.ts'

/**
 * Passkey provider can’t give PRF output, so it can’t protect encrypted data.
 */
export class PasskeyNoPrfError extends Error {
  constructor() {
    super('Passkey provider does not support PRF')
    this.name = 'PasskeyNoPrfError'
  }
}

function pick<Key extends string>(
  from: Record<string, unknown>,
  keys: Key[]
): Record<Key, unknown> {
  let result: Record<string, unknown> = {}
  for (let key of keys) {
    if (typeof from[key] !== 'undefined') result[key] = from[key]
  }
  return result
}

interface CredentialJSON {
  authenticatorAttachment?: null | string
  id: string
  rawId: string
  response: object
  type: string
}

function filterResponse(credential: CredentialJSON, keys: string[]): object {
  let copied = pick(credential as unknown as Record<string, unknown>, [
    'id',
    'rawId',
    'type',
    'authenticatorAttachment'
  ])
  if (copied.authenticatorAttachment === null) {
    delete copied.authenticatorAttachment
  }
  return {
    ...copied,
    clientExtensionResults: {},
    response: pick(credential.response as Record<string, unknown>, keys)
  }
}

/**
 * The only way to prepare a browser’s credential for the server.
 * PRF output lives in `clientExtensionResults` and must never leave
 * the client, so the filter copies only allowed fields.
 */
export function filterRegistration(
  credential: CredentialJSON
): RegistrationResponse {
  return filterResponse(credential, [
    'clientDataJSON',
    'attestationObject',
    'authenticatorData',
    'transports',
    'publicKeyAlgorithm',
    'publicKey'
  ]) as RegistrationResponse
}

export function filterAssertion(
  credential: CredentialJSON
): AuthenticationResponse {
  return filterResponse(credential, [
    'clientDataJSON',
    'authenticatorData',
    'signature',
    'userHandle'
  ]) as AuthenticationResponse
}

export function filterProof(proof: Proof): Proof {
  if ('authKey' in proof) {
    return { authKey: proof.authKey }
  } else {
    return { assertion: filterAssertion(proof.assertion) }
  }
}

function randomChallenge(): string {
  let bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

type CreatedPasskey =
  | { prf: ArrayBuffer; response: RegistrationResponse; type: 'created' }
  | { type: 'cancelled' }
  | { type: 'noPrf' }

/**
 * Some providers give PRF output only on `get()`, so we ask it right after
 * the creation. Local check doesn’t need server’s challenge.
 */
export async function createWithPrf(
  challenge: PasskeyChallengeResponse,
  user: string,
  conditional?: boolean
): Promise<CreatedPasskey> {
  let env = getEnvironment()
  let salt = await prfSalt('encryption')
  let created = await env.createPasskey({
    challenge: challenge.challenge,
    conditional,
    excludeCredentials: challenge.credentials,
    prfSalt: salt,
    rpId: challenge.rpId,
    userId: user
  })
  if (!created) return { type: 'cancelled' }
  let prf = created.prf
  if (!prf) {
    let checked: PasskeyResult<unknown> | undefined = await env.getPasskey({
      allowCredentials: [
        {
          id: created.response.id,
          transports: created.response.response.transports ?? []
        }
      ],
      challenge: randomChallenge(),
      prfSalt: salt,
      rpId: challenge.rpId
    })
    prf = checked?.prf
  }
  if (!prf) {
    env.signalPasskeys({ credentialId: created.response.id, type: 'unknown' })
    return { type: 'noPrf' }
  }
  return { prf, response: created.response, type: 'created' }
}

/**
 * Sign-up skips the password step for synced passkeys.
 * Server checks the same flag by itself.
 */
export function isBackedUp(response: RegistrationResponse): boolean {
  let data = response.response.authenticatorData
  if (!data) return false
  let flags = atob(data.replaceAll('-', '+').replaceAll('_', '/')).charCodeAt(
    32
  )
  // Backup State bit of WebAuthn authenticator data
  return (flags & 0x10) !== 0
}
