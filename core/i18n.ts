import { createI18n, type TranslationLoader } from '@nanostores/i18n'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.ts'

let $locale = atom('en')

let loader: TranslationLoader

/* c8 ignore start */
// TODO: Until we will have real translations
export const i18n = createI18n($locale, {
  get(...args) {
    return loader(...args)
  }
})

onEnvironment(({ locale, translationLoader }) => {
  loader = translationLoader
  return locale.listen(value => {
    $locale.set(value)
  })
})
/* c8 ignore stop */
