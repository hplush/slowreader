import { createI18n } from '@nanostores/i18n'

import { onEnvironment } from './setup.js'

export let i18n: ReturnType<typeof createI18n>

onEnvironment(({ locale, translationLoader }) => {
  i18n = createI18n(locale, {
    get: translationLoader
  })
})
