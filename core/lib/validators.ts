import { IS_SECRET, IS_USER_ID } from '@slowreader/api'

import { commonMessages as t } from '../messages/index.ts'

export interface Validator {
  (value: string): string | undefined
}

export function notEmpty(value: string): string | undefined {
  if (value.trim() === '') return t.get().empty
}

export function validUrl(value: string): string | undefined {
  if (!URL.canParse(value)) return t.get().invalidUrl
}

export function validUserId(value: string): string | undefined {
  if (!IS_USER_ID.test(value)) return t.get().invalidUserId
}

export function validSecret(value: string): string | undefined {
  if (!IS_SECRET.test(value)) return t.get().invalidSecret
}

export function validServer(value: string): string | undefined {
  let withProtocol = `https://${value}`
  if (!URL.canParse(withProtocol)) return t.get().invalidServer
  if (/^[a-zA-Z]+:/.test(value)) return t.get().invalidServer
  if (new URL(withProtocol).username) return t.get().invalidServer
}
