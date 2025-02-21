import './environment.ts'

import { atom } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'

import { i18n, settingsMessages } from '../index.ts'
import { enableClientTest } from './utils.ts'

test('has i18n', () => {
  equal(typeof i18n, 'function')
  equal(typeof settingsMessages.get().theme, 'string')

  let locale = atom('en')
  let loading: string[] = []
  enableClientTest({
    locale,
    translationLoader(lang) {
      loading.push(lang)
      return Promise.resolve({})
    }
  })
  locale.set('es')
  deepStrictEqual(loading, ['es'])
})
