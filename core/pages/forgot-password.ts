import { atom } from 'nanostores'

import {
  generateCredentials,
  RECOVERY_SUBJECT,
  startLocalUser
} from '../auth.ts'
import { navigate, toRoute } from '../router.ts'
import { createPage } from './common.ts'

export const forgotPasswordPage = createPage('forgotPassword', () => {
  return {
    exit() {},
    hideMenu: atom(true),
    params: {},
    recoverySubject: RECOVERY_SUBJECT,
    async startLocal() {
      await startLocalUser(generateCredentials())
      navigate(toRoute('home'))
    }
  }
})

export type ForgotPasswordPage = ReturnType<typeof forgotPasswordPage>
