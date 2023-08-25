import { atom, keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { i18n, setLocale, setTranslationLoader } from '../index.js'

test('sets locale and loader', async () => {
  let loaded: string[][] = []
  let locale = atom('fr')

  setTranslationLoader(async (code, components) => {
    loaded.push([code, ...components])
    return {}
  })
  setLocale(locale)
  equal(loaded, [])

  let messages = i18n('component', {
    test: 'test'
  })
  keepMount(messages)
  equal(loaded, [['fr', 'component']])

  locale.set('ru')
  equal(loaded, [
    ['fr', 'component'],
    ['ru', 'component']
  ])
})

test.run()
