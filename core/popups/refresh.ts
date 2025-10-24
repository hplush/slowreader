import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const refresh = definePopup('refresh', () => {
  return Promise.resolve({
    destroy() {}
  })
})

export type RefreshPopup = CreatedLoadedPopup<typeof refresh>
