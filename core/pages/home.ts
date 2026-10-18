import { atom } from 'nanostores'

import { navigate } from '../router.ts'
import { needWelcome } from '../welcome.ts'
import { createPage } from './common.ts'

export const homePage = createPage('home', () => {
  let unbindWelcome = needWelcome.subscribe(welcome => {
    if (typeof welcome !== 'undefined') {
      navigate(
        {
          params: {},
          popups: [],
          route: welcome ? 'welcome' : 'slow'
        },
        true
      )
    }
  })

  return {
    exit() {
      unbindWelcome()
    },
    loading: atom(true),
    params: {}
  }
})

export type HomePage = ReturnType<typeof homePage>
