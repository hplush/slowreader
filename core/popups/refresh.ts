import { definePopup, type LoadedPopup } from './common.ts'

export const refresh = definePopup('refresh', () => {
  return Promise.resolve({
    destroy() {}
  })
})

export type RefreshPopup = LoadedPopup<typeof refresh>
