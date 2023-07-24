import { createI18n, type TranslationLoader } from '@nanostores/i18n'
import { atom, type ReadableAtom } from 'nanostores'

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

export const i18n = createI18n(localeProxy, {
  get(code, components) {
    return translationLoader(code, components)
  }
})
