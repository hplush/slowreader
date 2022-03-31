import type { TranslationLoader } from '@nanostores/i18n'
import type { ReadableAtom } from 'nanostores'
import { createI18n } from '@nanostores/i18n'
import { atom } from 'nanostores'

let localeProxy = atom('en')

let translationLoader: TranslationLoader = async () => ({})

export function setLocale(locale: ReadableAtom<string>): void {
  locale.subscribe(code => {
    localeProxy.set(code)
  })
}

export function setTranslationLoader(loader: TranslationLoader): void {
  translationLoader = loader
}

export let i18n = createI18n(localeProxy, {
  get(code, components) {
    return translationLoader(code, components)
  }
})
