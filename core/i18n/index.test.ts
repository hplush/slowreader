import { equal } from 'uvu/assert'
import { atom } from 'nanostores'
import { test } from 'uvu'

import { setLocale, setTranslationLoader, i18n } from '../index.js'

test('sets locale and loader', () => {
  let loaded: string[] = []
  let locale = atom('fr')

  setTranslationLoader(async code => {
    loaded.push(code)
    return {}
  })
  setLocale(locale)
  equal(loaded, ['fr'])

  let messages = i18n('component', {
    test: 'test'
  })
  messages.listen(() => {})

  locale.set('ru')
  equal(loaded, ['fr', 'ru'])
})

test.run()
