import { atom } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import { getFeeds } from '../feed.ts'
import { createPage } from './common.ts'

export const home = createPage('home', () => {
  let unbindFeeds = getFeeds().subscribe(feeds => {
    if (!feeds.isLoading) {
      getEnvironment().openRoute({
        params: {},
        popups: [],
        route: feeds.isEmpty ? 'welcome' : 'slow'
      })
    }
  })

  return {
    exit() {
      unbindFeeds()
    },
    loading: atom(true),
    params: {}
  }
})

export type HomePage = ReturnType<typeof home>
