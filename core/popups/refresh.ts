import { refreshStatus } from '../refresh.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const refresh = definePopup('refresh', () => {
  let unbindStatus = refreshStatus.subscribe(status => {
    if (status === 'refreshingError') {
      refreshStatus.set('refreshing')
    } else if (status === 'error') {
      refreshStatus.set('start')
    }
  })
  return Promise.resolve({
    destroy() {
      unbindStatus()
    }
  })
})

export type RefreshPopup = CreatedLoadedPopup<typeof refresh>
