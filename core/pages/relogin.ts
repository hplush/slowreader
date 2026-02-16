import { atom } from 'nanostores'

import { signOut } from '../auth.ts'
import { createPage } from './common.ts'
import { injectSingIn } from './mixins/signin.ts'

export const reloginPage = createPage('relogin', () => {
  return {
    ...injectSingIn(),
    hideMenu: atom(true),
    loading: atom(false),
    params: {},
    signOut
  }
})

export type ReloginPage = ReturnType<typeof reloginPage>
