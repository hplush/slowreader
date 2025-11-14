import { atom } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import { needWelcome } from '../feed.ts'
import { createPage } from './common.ts'

export const homePage = createPage('home', () => {
  let unbindWelcome = needWelcome.subscribe(welcome => {
    if (typeof welcome !== 'undefined') {
      getEnvironment().openRoute(
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
