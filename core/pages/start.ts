import { generateCredentials, useCredentials } from '../auth.ts'
import { createPage } from './common.ts'
import { injectSingIn } from './mixins/signin.ts'

export const startPage = createPage('start', () => {
  return {
    ...injectSingIn(),
    params: {},
    startLocal(): void {
      useCredentials(generateCredentials())
    }
  }
})

export type StartPage = ReturnType<typeof startPage>
