import { refreshIcon } from '../refresh.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const refresh = definePopup('refresh', () => {
  if (refreshIcon.get() === 'error') {
    refreshIcon.set('start')
  } else if (refreshIcon.get() === 'refreshingError') {
    refreshIcon.set('refreshing')
  }
  return Promise.resolve({
    destroy() {}
  })
})

export type RefreshPopup = CreatedLoadedPopup<typeof refresh>
