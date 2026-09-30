export const IS_USER_ID = /^\d{16}$/

export const IS_PASSWORD = /^[1-9A-HJ-NP-Za-km-z]{66}$/

export const IS_AUTH_KEY = /^[1-9A-HJ-NP-Za-km-z]{22}$/

export const IS_LOCKED_KEY = /^[\w-]{80}$/

export function isPasskeyName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 100
}
