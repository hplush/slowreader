import { SIGN_IN_ERRORS } from '@slowreader/api'
import { atom } from 'nanostores'

import {
  type Credentials,
  generateCredentials,
  signIn,
  useCredentials
} from '../auth.ts'
import { commonMessages as t } from '../messages/index.ts'
import { createPage } from './common.ts'
import { injectCustomServerField } from './mixins/custom-server-field.ts'
import { createFormSubmit } from './mixins/form.ts'

export const startPage = createPage('start', () => {
  let $userId = atom('')
  let $secret = atom('')
  let $signingIn = atom(false)
  let $signError = atom<string | undefined>()

  let customServerMixin = injectCustomServerField()

  let unbindServer = customServerMixin.customServer.listen(() => {
    $signError.set(undefined)
  })
  let unbindUserId = $userId.listen(() => {
    $signError.set(undefined)
  })
  let unbindSecret = $secret.listen(() => {
    $signError.set(undefined)
  })

  function validateCredential(): Credentials {
    let [password, encryptionKey] = $secret.get().split(' ')
    let userId = $userId.get()
    /* node:coverage ignore next 3 */
    if (!password || !encryptionKey || !userId) {
      throw new Error('Invalid data')
    }
    return {
      encryptionKey,
      password,
      userId
    }
  }

  return {
    ...customServerMixin,
    exit() {
      unbindServer()
      unbindUserId()
      unbindSecret()
    },
    params: {},
    secret: $secret,
    signError: $signError,
    signIn: createFormSubmit(
      () => signIn(validateCredential(), customServerMixin.customServer.get()),
      $signingIn,
      $signError,
      SIGN_IN_ERRORS,
      t
    ),
    signingIn: $signingIn,
    startLocal(): void {
      useCredentials(generateCredentials())
    },
    userId: $userId
  }
})

export type StartPage = ReturnType<typeof startPage>
