import { SIGN_IN_ERRORS } from '@slowreader/api'
import { atom, type ReadableAtom, type WritableAtom } from 'nanostores'

import { type Credentials, signIn } from '../../auth.ts'
import { commonMessages } from '../../messages/index.ts'
import { injectCustomServerField } from './custom-server-field.ts'
import { createFormSubmit } from './form.ts'

export function injectSignIn(): {
  customServer: ReadableAtom<string | undefined>
  exit: () => void
  resetCustomServer: () => void
  secret: WritableAtom<string>
  showCustomServer: () => void
  signError: WritableAtom<string | undefined>
  signIn: () => Promise<boolean>
  signingIn: WritableAtom<boolean>
  userId: WritableAtom<string>
} {
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
    secret: $secret,
    signError: $signError,
    signIn: createFormSubmit(
      () => signIn(validateCredential(), customServerMixin.customServer.get()),
      $signingIn,
      $signError,
      SIGN_IN_ERRORS,
      commonMessages
    ),
    signingIn: $signingIn,
    userId: $userId
  }
}
