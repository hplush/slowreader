export type PrfPurpose = 'encryption' | 'private'

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password')
    this.name = 'WrongPasswordError'
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let byte of bytes) binary += String.fromCharCode(byte)
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

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function toBase58(bytes: Uint8Array, length: number): string {
  let value = 0n
  for (let byte of bytes) value = value * 256n + BigInt(byte)
  let result = ''
  for (let i = 0; i < length; i++) {
    result = BASE58.charAt(Number(value % 58n)) + result
    value /= 58n
  }
  return result
}

/**
 * Wrong or too big value gives wrong bytes, so unlock fails later
 * with `WrongPasswordError`.
 */
function fromBase58(text: string, size: number): Uint8Array<ArrayBuffer> {
  let value = 0n
  for (let char of text) value = value * 58n + BigInt(BASE58.indexOf(char))
  let bytes = new Uint8Array(size)
  for (let i = size - 1; i >= 0; i--) {
    bytes[i] = Number(value % 256n)
    value /= 256n
  }
  return bytes
}

function randomBytes(size: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(size))
}

function encode(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text)
}

/**
 * Two independent random values in one string: 128-bit `authKey`
 * for the server and 256-bit unlock part, which never leaves the client.
 * Base58 has no `0`, `O`, `I`, `l`, which look the same on the paper.
 */
export function generatePassword(): string {
  return toBase58(randomBytes(16), 22) + toBase58(randomBytes(32), 44)
}

export function splitPassword(password: string): {
  authKey: string
  unlock: Uint8Array<ArrayBuffer>
} {
  return {
    authKey: password.slice(0, 22),
    unlock: fromBase58(password.slice(22), 32)
  }
}

/**
 * Fixed salt, because discoverable sign-in doesn’t know the user
 * before the assertion.
 */
export async function prfSalt(
  purpose: PrfPurpose
): Promise<Uint8Array<ArrayBuffer>> {
  let hash = await crypto.subtle.digest(
    'SHA-256',
    encode(`slowreader:${purpose}:v1`)
  )
  return new Uint8Array(hash)
}

export function generateDataKey(): Uint8Array<ArrayBuffer> {
  return randomBytes(32)
}

async function hkdf(
  secret: ArrayBuffer | Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>,
  info: string
): Promise<CryptoKey> {
  let base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, [
    'deriveKey'
  ])
  return crypto.subtle.deriveKey(
    { hash: 'SHA-256', info: encode(info), name: 'HKDF', salt },
    base,
    { length: 256, name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export function passwordUnlockKey(
  password: string,
  userId: string
): Promise<CryptoKey> {
  return hkdf(
    splitPassword(password).unlock,
    encode(`slowreader:${userId}`),
    'unlock'
  )
}

export function passkeyUnlockKey(prf: ArrayBuffer): Promise<CryptoKey> {
  return hkdf(prf, new Uint8Array(), 'passkey-unlock')
}

export async function lockDataKey(
  dataKey: Uint8Array<ArrayBuffer>,
  unlockKey: CryptoKey
): Promise<string> {
  let iv = randomBytes(12)
  let encrypted = await crypto.subtle.encrypt(
    { iv, name: 'AES-GCM' },
    unlockKey,
    dataKey
  )
  let result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encrypted), iv.length)
  return toBase64(result)
}

export async function unlockDataKey(
  lockedKey: string,
  unlockKey: CryptoKey
): Promise<Uint8Array<ArrayBuffer>> {
  let bytes = fromBase64(lockedKey)
  try {
    let decrypted = await crypto.subtle.decrypt(
      { iv: bytes.slice(0, 12), name: 'AES-GCM' },
      unlockKey,
      bytes.slice(12)
    )
    return new Uint8Array(decrypted)
  } catch {
    throw new WrongPasswordError()
  }
}

/**
 * Scripts can encrypt and decrypt with the key, but XSS can’t copy
 * key’s bytes for later use.
 */
export function toEncryptionKey(
  dataKey: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', dataKey, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt'
  ])
}
