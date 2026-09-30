import {
  commonMessages,
  type Environment,
  type PasskeyCreation,
  type PasskeyCredential,
  type PasskeyRequest,
  type PasskeySignal,
  UserFacingError
} from '@slowreader/core'

type Created = Awaited<ReturnType<Environment['createPasskey']>>
type Got = Awaited<ReturnType<Environment['getPasskey']>>
type RegistrationResponse = Exclude<Created, undefined>['response']

function toBase64(buffer: ArrayBuffer): string {
  let binary = ''
  for (let byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  let binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  let bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toUserHandle(userId: string): string {
  return toBase64(new TextEncoder().encode(userId).buffer)
}

function toDescriptors(
  list: PasskeyCredential[]
): PublicKeyCredentialDescriptor[] {
  return list.map(i => ({
    id: fromBase64(i.id),
    transports: i.transports as AuthenticatorTransport[],
    type: 'public-key'
  }))
}

function prfOf(credential: PublicKeyCredential): ArrayBuffer | undefined {
  let first = credential.getClientExtensionResults().prf?.results?.first
  if (!first) return undefined
  return first instanceof ArrayBuffer
    ? first
    : new Uint8Array(first.buffer, first.byteOffset, first.byteLength).slice()
        .buffer
}

function isCancel(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'NotAllowedError' || e.name === 'AbortError')
  )
}

function attachment(
  credential: PublicKeyCredential
): Pick<RegistrationResponse, 'authenticatorAttachment'> {
  let value = credential.authenticatorAttachment
  return value === 'platform' || value === 'cross-platform'
    ? { authenticatorAttachment: value }
    : {}
}

export const passkeySupport =
  window.isSecureContext && typeof PublicKeyCredential !== 'undefined'

async function supportsConditionalCreate(): Promise<boolean> {
  let capabilities = await PublicKeyCredential.getClientCapabilities?.()
  return !!capabilities?.conditionalCreate
}

export async function createPasskey(
  options: PasskeyCreation
): Promise<Created> {
  if (options.conditional && !(await supportsConditionalCreate())) {
    return undefined
  }
  let credential
  try {
    credential = await navigator.credentials.create({
      mediation: options.conditional ? 'conditional' : undefined,
      publicKey: {
        attestation: 'none',
        authenticatorSelection: {
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'required'
        },
        challenge: fromBase64(options.challenge),
        excludeCredentials: toDescriptors(options.excludeCredentials),
        extensions: { prf: { eval: { first: options.prfSalt } } },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -8, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        rp: { id: options.rpId, name: 'Slow Reader' },
        user: {
          displayName: options.userId,
          id: new TextEncoder().encode(options.userId),
          name: options.userId
        }
      }
    })
  } catch (e) {
    if (isCancel(e)) return undefined
    if (e instanceof DOMException && e.name === 'InvalidStateError') {
      throw new UserFacingError(commonMessages.get().passkeyExists, {
        cause: e
      })
    }
    throw e
  }
  if (!(credential instanceof PublicKeyCredential)) return undefined
  let response = credential.response as AuthenticatorAttestationResponse
  let publicKey = response.getPublicKey()
  return {
    prf: prfOf(credential),
    response: {
      ...attachment(credential),
      clientExtensionResults: {},
      id: credential.id,
      rawId: toBase64(credential.rawId),
      response: {
        attestationObject: toBase64(response.attestationObject),
        authenticatorData: toBase64(response.getAuthenticatorData()),
        clientDataJSON: toBase64(response.clientDataJSON),
        publicKeyAlgorithm: response.getPublicKeyAlgorithm(),
        transports: response.getTransports(),
        ...(publicKey ? { publicKey: toBase64(publicKey) } : {})
      },
      type: 'public-key'
    }
  }
}

export async function getPasskey(options: PasskeyRequest): Promise<Got> {
  if (
    options.conditional &&
    !(await PublicKeyCredential.isConditionalMediationAvailable?.())
  ) {
    return undefined
  }
  let credential
  try {
    credential = await navigator.credentials.get({
      mediation: options.conditional ? 'conditional' : undefined,
      publicKey: {
        allowCredentials: toDescriptors(options.allowCredentials),
        challenge: fromBase64(options.challenge),
        extensions: { prf: { eval: { first: options.prfSalt } } },
        rpId: options.rpId,
        userVerification: 'required'
      },
      signal: options.signal
    })
  } catch (e) {
    if (isCancel(e)) return undefined
    throw e
  }
  if (!(credential instanceof PublicKeyCredential)) return undefined
  let response = credential.response as AuthenticatorAssertionResponse
  return {
    prf: prfOf(credential),
    response: {
      ...attachment(credential),
      clientExtensionResults: {},
      id: credential.id,
      rawId: toBase64(credential.rawId),
      response: {
        authenticatorData: toBase64(response.authenticatorData),
        clientDataJSON: toBase64(response.clientDataJSON),
        signature: toBase64(response.signature),
        ...(response.userHandle
          ? { userHandle: toBase64(response.userHandle) }
          : {})
      },
      type: 'public-key'
    }
  }
}

export function signalPasskeys(signal: PasskeySignal): void {
  if (!passkeySupport) return
  let rpId = location.hostname
  let request: Promise<void> | undefined
  if (signal.type === 'unknown') {
    request = PublicKeyCredential.signalUnknownCredential?.({
      credentialId: signal.credentialId,
      rpId
    })
  } else if (signal.type === 'accepted') {
    request = PublicKeyCredential.signalAllAcceptedCredentials?.({
      allAcceptedCredentialIds: signal.ids,
      rpId,
      userId: toUserHandle(signal.userId)
    })
  } else {
    request = PublicKeyCredential.signalCurrentUserDetails?.({
      displayName: signal.userId,
      name: signal.userId,
      rpId,
      userId: toUserHandle(signal.userId)
    })
  }
  request?.catch(() => {})
}
