import { argon2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

let argon2Async = promisify(argon2)

// Same format and defaults as `argon2` npm package, so old hashes still work
const PREFIX = '$argon2id$v=19$m=65536,p=4,t=3$'

function derive(authKey: string, salt: Buffer): Promise<Buffer> {
  return argon2Async('argon2id', {
    memory: 65536,
    message: authKey,
    nonce: salt,
    parallelism: 4,
    passes: 3,
    tagLength: 32
  })
}

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64').replace(/=+$/, '')
}

export async function hashAuthKey(authKey: string): Promise<string> {
  let salt = randomBytes(16)
  return `${PREFIX}${toBase64(salt)}$${toBase64(await derive(authKey, salt))}`
}

export async function authKeyMatches(
  phc: string,
  authKey: string
): Promise<boolean> {
  if (!phc.startsWith(PREFIX)) return false
  let [salt = '', hash = ''] = phc.slice(PREFIX.length).split('$')
  let actual = await derive(authKey, Buffer.from(salt, 'base64'))
  return timingSafeEqual(actual, Buffer.from(hash, 'base64'))
}
