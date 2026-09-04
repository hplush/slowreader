import { effect } from 'nanostores'

import { getEnvironment, layoutType } from '../environment.ts'
import { createPage } from './common.ts'

export const menuPage = createPage('menu', () => {
  let unbindLayout = effect(layoutType, layout => {
    if (layout === 'desktop') {
      getEnvironment().openRoute({ params: {}, popups: [], route: 'add' }, true)
    }
  })

  return {
    exit() {
      unbindLayout()
    },
    params: {}
  }
})

export type MenuPage = ReturnType<typeof menuPage>
