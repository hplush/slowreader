import './environment.ts'

import { atom } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'

import { i18n, settingsMessages } from '../index.ts'
import { enableClientTest } from './utils.ts'

test('has i18n', async () => {
  equal(typeof i18n, 'function')
  equal(typeof settingsMessages.get().theme, 'string')

  let locale = atom('en')
  let loading: string[] = []
  enableClientTest({
    locale,
    async translationLoader(lang) {
      loading.push(lang)
      return {}
    }
  })
  locale.set('es')
  deepStrictEqual(loading, ['es'])
})
