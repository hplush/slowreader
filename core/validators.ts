import { commonMessages as t } from './messages/index.ts'

export interface Validator<Value = string> {
  (
    value: Value,
    event: 'blur' | 'change' | 'init' | 'keyup'
  ): string | undefined
}

function onValue(validator: (value: string) => string | undefined): Validator {
  return (value, event) => {
    if (event === 'init' && value.trim() === '') return undefined
    return validator(value)
  }
}

export const notEmpty = onValue(value => {
  if (value.trim() === '') return t.get().empty
})

export const validUrl = onValue(value => {
  if (!URL.canParse(value)) return t.get().invalidUrl
})

export const validUserId = onValue(value => {
  if (!/^\d{16}$/.test(value)) return t.get().invalidUserId
})

export const validSecret = onValue(value => {
  if (!/^[^\s]{10} [^\s]{10}$/.test(value)) return t.get().invalidSecret
})

export const validServer = onValue(value => {
  let withProtocol = `https://${value}`
  if (!URL.canParse(withProtocol)) return t.get().invalidServer
  if (/^[a-zA-Z]+:/.test(value)) return t.get().invalidServer
  if (new URL(withProtocol).username) return t.get().invalidServer
})
