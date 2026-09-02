import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const menu = definePopup('menu', () => {
  return Promise.resolve({ destroy() {} })
})

export type MenuPopup = CreatedLoadedPopup<typeof menu>
