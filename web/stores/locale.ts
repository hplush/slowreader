import { browser, localeFrom } from '@nanostores/i18n'
import { setLocale } from '@slowreader/core'

export const locale = localeFrom(browser({ available: ['en'] as const }))

setLocale(locale)
