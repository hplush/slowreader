import { generateCredentials, useCredentials } from '../auth.ts'
import { createPage } from './common.ts'
import { injectSignIn } from './mixins/sign-in.ts'

export const startPage = createPage('start', () => {
  return {
    ...injectSignIn(),
    params: {},
    startLocal(): void {
      useCredentials(generateCredentials())
    }
  }
})

export type StartPage = ReturnType<typeof startPage>
