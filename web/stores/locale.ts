import { browser, localeFrom } from '@nanostores/i18n'

export const locale = localeFrom(browser({ available: ['en'] as const }))
