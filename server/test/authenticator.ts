import { isoCBOR } from '@simplewebauthn/server/helpers'
import type {
  AuthenticationResponse,
  RegistrationResponse
} from '@slowreader/api'
import {
  createHash,
  createHmac,
  generateKeyPairSync,
  type KeyObject,
  randomBytes,
  sign
} from 'node:crypto'

import { config } from '../lib/config.ts'

interface Credential {
  counter: number
  privateKey: KeyObject
  secret: Buffer
  userId: string
}

export interface FakePasskey<Response> {
  prf: ArrayBuffer | undefined
  response: Response
}

export interface FakeAuthenticatorOptions {
  aaguid?: string
  origin?: string
  /**
   * Some providers return PRF output only on `get()` or never.
   */
  prf?: 'always' | 'get' | 'never'
  rpId?: string
  synced?: boolean
}

function sha256(data: Buffer | string): Buffer {
  return createHash('sha256').update(data).digest()
}

function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll('-', ''), 'hex')
}

function toBuffer(data: ArrayBuffer | Uint8Array): Buffer {
  return Buffer.from(new Uint8Array(data))
}

/**
 * Software passkey provider to test WebAuthn flows without a browser.
 */
export class FakeAuthenticator {
  aaguid: string
  credentials = new Map<string, Credential>()
  origin: string
  prf: 'always' | 'get' | 'never'
  rpId: string
  synced: boolean

  constructor(opts: FakeAuthenticatorOptions = {}) {
    this.aaguid = opts.aaguid ?? 'fbfc3007-154e-4ecc-8c0b-6e020557d7bd'
    this.origin = opts.origin ?? config.webOrigin
    this.prf = opts.prf ?? 'always'
    this.rpId = opts.rpId ?? new URL(config.webOrigin).hostname
    this.synced = opts.synced ?? true
  }

  #authData(credential: Credential, attested?: Buffer): Buffer {
    let flags = 0x01 | 0x04 | 0x08
    if (this.synced) flags |= 0x10
    if (attested) flags |= 0x40
    let counter = Buffer.alloc(4)
    counter.writeUInt32BE(credential.counter)
    return Buffer.concat([
      sha256(this.rpId),
      Buffer.from([flags]),
      counter,
      attested ?? Buffer.alloc(0)
    ])
  }

  #clientData(type: string, challenge: string): Buffer {
    return Buffer.from(
      JSON.stringify({
        challenge,
        crossOrigin: false,
        origin: this.origin,
        type
      })
    )
  }

  #prf(credential: Credential, salt: ArrayBuffer | Uint8Array): ArrayBuffer {
    let output = createHmac('sha256', credential.secret)
      .update(toBuffer(salt))
      .digest()
    return output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength
    )
  }

  create(opts: {
    challenge: string
    prfSalt?: ArrayBuffer | Uint8Array
    userId: string
  }): FakePasskey<RegistrationResponse> {
    let { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256'
    })
    let jwk = publicKey.export({ format: 'jwk' })
    let cose = new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, 'base64url')],
      [-3, Buffer.from(jwk.y!, 'base64url')]
    ])
    let id = randomBytes(16)
    let credential: Credential = {
      counter: 0,
      privateKey,
      secret: randomBytes(32),
      userId: opts.userId
    }
    this.credentials.set(id.toString('base64url'), credential)
    let idLength = Buffer.alloc(2)
    idLength.writeUInt16BE(id.length)
    let attested = Buffer.concat([
      uuidBytes(this.aaguid),
      idLength,
      id,
      Buffer.from(isoCBOR.encode(cose))
    ])
    let authData = this.#authData(credential, attested)
    let attestationObject = isoCBOR.encode(
      new Map<string, Map<string, string> | string | Uint8Array>([
        ['fmt', 'none'],
        ['attStmt', new Map<string, string>()],
        ['authData', authData]
      ])
    )
    let prf =
      this.prf === 'always' && opts.prfSalt
        ? this.#prf(credential, opts.prfSalt)
        : undefined
    return {
      prf,
      response: {
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
        id: id.toString('base64url'),
        rawId: id.toString('base64url'),
        response: {
          attestationObject:
            Buffer.from(attestationObject).toString('base64url'),
          authenticatorData: Buffer.from(authData).toString('base64url'),
          clientDataJSON: this.#clientData(
            'webauthn.create',
            opts.challenge
          ).toString('base64url'),
          transports: ['internal']
        },
        type: 'public-key'
      }
    }
  }

  get(opts: {
    challenge: string
    id?: string
    prfSalt?: ArrayBuffer | Uint8Array
    userHandle?: null | string
  }): FakePasskey<AuthenticationResponse> {
    let id = opts.id ?? this.credentials.keys().next().value
    let credential = id ? this.credentials.get(id) : undefined
    if (!id || !credential) throw new Error('No credential')
    credential.counter += 1
    let authData = this.#authData(credential)
    let clientData = this.#clientData('webauthn.get', opts.challenge)
    let signature = sign(
      'sha256',
      Buffer.concat([authData, sha256(clientData)]),
      credential.privateKey
    )
    let response: AuthenticationResponse['response'] = {
      authenticatorData: authData.toString('base64url'),
      clientDataJSON: clientData.toString('base64url'),
      signature: signature.toString('base64url')
    }
    let userHandle =
      typeof opts.userHandle === 'undefined'
        ? Buffer.from(credential.userId).toString('base64url')
        : opts.userHandle
    if (userHandle) response.userHandle = userHandle
    let prf =
      this.prf !== 'never' && opts.prfSalt
        ? this.#prf(credential, opts.prfSalt)
        : undefined
    return {
      prf,
      response: {
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
        id,
        rawId: id,
        response,
        type: 'public-key'
      }
    }
  }
}
