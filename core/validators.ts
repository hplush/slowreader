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
  if (!URL.canParse(value)) return t.get().noUrl
})
