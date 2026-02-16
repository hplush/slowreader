import { atom } from 'nanostores'

import { signOut } from '../auth.ts'
import { createPage } from './common.ts'
import { injectSignIn } from './mixins/sign-in.ts'

export const reloginPage = createPage('relogin', () => {
  return {
    ...injectSignIn(),
    hideMenu: atom(true),
    loading: atom(false),
    params: {},
    signOut
  }
})

export type ReloginPage = ReturnType<typeof reloginPage>
