import { atom } from 'nanostores'

import { createPage } from './common.ts'

export const startPage = createPage('start', () => {
  let $userId = atom('')
  let $secret = atom('')
  let $customServer = atom<false | string>(false)

  return {
    customServer: $customServer,
    exit() {},
    params: {},
    secret: $secret,
    userId: $userId
  }
})

export type StartPage = ReturnType<typeof startPage>
