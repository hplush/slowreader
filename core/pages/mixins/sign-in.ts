import { SIGN_IN_ERRORS } from '@slowreader/api'
import { atom, type WritableAtom } from 'nanostores'

import { type Credentials, signIn } from '../../auth.ts'
import { commonMessages } from '../../messages/index.ts'
import { createFormSubmit } from './form.ts'

export function injectSignIn(): {
  exit: () => void
  secret: WritableAtom<string>
  signError: WritableAtom<string | undefined>
  signIn: () => Promise<boolean>
  signingIn: WritableAtom<boolean>
  userId: WritableAtom<string>
} {
  let $userId = atom('')
  let $secret = atom('')
  let $signingIn = atom(false)
  let $signError = atom<string | undefined>()

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
    exit() {
      unbindUserId()
      unbindSecret()
    },
    secret: $secret,
    signError: $signError,
    signIn: createFormSubmit(
      () => signIn(validateCredential()),
      $signingIn,
      $signError,
      SIGN_IN_ERRORS,
      commonMessages
    ),
    signingIn: $signingIn,
    userId: $userId
  }
}
