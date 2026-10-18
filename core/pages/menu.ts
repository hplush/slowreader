import { effect } from 'nanostores'

import { layoutType } from '../environment.ts'
import { navigate } from '../router.ts'
import { createPage } from './common.ts'

export const menuPage = createPage('menu', () => {
  let unbindLayout = effect(layoutType, layout => {
    if (layout === 'desktop') {
      navigate({ params: {}, popups: [], route: 'add' }, true)
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
