import {
  createI18n,
  eachMessage,
  type TranslationLoader
} from '@nanostores/i18n'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.ts'

let $locale = atom('en')
let loader: TranslationLoader

/* c8 ignore start */
// TODO: Until we will have real translations
export const i18n = createI18n($locale, {
  get(...args) {
    return loader(...args)
  },
  preprocessors: [
    eachMessage(str => {
      // Use non-breaking hyphen and non-breaking space after prepositions
      return str.replace(/-/g, '‑').replace(/\b(\p{Ll}{1,3})\b\s/gu, '$1 ')
    })
  ]
})

onEnvironment(({ locale, translationLoader }) => {
  loader = translationLoader
  return locale.listen(value => {
    $locale.set(value)
  })
})
/* c8 ignore stop */
