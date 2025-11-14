import { atom } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import { needOnboarding } from '../feed.ts'
import { createPage } from './common.ts'

export const homePage = createPage('home', () => {
  let unbindOnboarding = needOnboarding.subscribe(onboarding => {
    if (typeof onboarding !== 'undefined') {
      getEnvironment().openRoute(
        {
          params: {},
          popups: [],
          route: onboarding ? 'welcome' : 'slow'
        },
        true
      )
    }
  })

  return {
    exit() {
      unbindOnboarding()
    },
    loading: atom(true),
    params: {}
  }
})

export type HomePage = ReturnType<typeof homePage>
