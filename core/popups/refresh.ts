import { atom } from 'nanostores'

import { refreshPosts, refreshStatus } from '../refresh.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

/**
 * Refresh icon opens the popup, which starts the refresh, so the user will
 * see if another device is already checking for new posts.
 */
export const refreshRequested = atom(false)

export const refresh = definePopup('refresh', () => {
  let unbindStatus = refreshStatus.subscribe(status => {
    if (status === 'refreshingError') {
      refreshStatus.set('refreshing')
    } else if (status === 'error') {
      refreshStatus.set('start')
    }
  })
  let unbindRequest = refreshRequested.subscribe(requested => {
    if (requested) {
      refreshRequested.set(false)
      void refreshPosts()
    }
  })
  return Promise.resolve({
    destroy() {
      unbindStatus()
      unbindRequest()
    }
  })
})

export type RefreshPopup = CreatedLoadedPopup<typeof refresh>
