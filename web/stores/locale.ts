import { localeFrom, browser } from '@nanostores/i18n'
import { setLocale } from '@slowreader/core'

export let locale = localeFrom(browser({ available: ['en'] as const }))

setLocale(locale)
