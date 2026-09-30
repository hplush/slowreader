import { IS_PASSWORD, IS_USER_ID } from '@slowreader/api'

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

export function validPassword(value: string): string | undefined {
  if (!IS_PASSWORD.test(value)) return t.get().invalidPassword
}
