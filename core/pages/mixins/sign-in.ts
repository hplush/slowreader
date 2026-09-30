import { SIGN_IN_ERRORS } from '@slowreader/api'
import { atom, type WritableAtom } from 'nanostores'

import {
  reauthByPassword,
  signInByPasskey,
  signInByPassword
} from '../../auth.ts'
import { getEnvironment } from '../../environment.ts'
import { UserFacingError } from '../../errors.ts'
import { PasskeyNoPrfError } from '../../lib/webauthn.ts'
import { commonMessages } from '../../messages/index.ts'
import { addPasskey } from '../../passkeys.ts'
import { createFormSubmit } from './form.ts'

/**
 * Passkey after password sign-in by the password manager without a dialog.
 */
async function offerPasskey(password: string): Promise<void> {
  try {
    await addPasskey(await reauthByPassword(password), true)
  } catch {}
}

export function injectSignIn(): {
  exit: () => void
  passkeySupport: boolean
  password: WritableAtom<string>
  signError: WritableAtom<string | undefined>
  signInByPasskey: () => Promise<boolean>
  signInByPassword: () => Promise<boolean>
  signingIn: WritableAtom<boolean>
  startAutofill: () => void
  usePassword: WritableAtom<boolean>
  userId: WritableAtom<string>
} {
  let { passkeySupport } = getEnvironment()
  let $userId = atom('')
  let $password = atom('')
  let $signingIn = atom(false)
  let $signError = atom<string | undefined>()
  let $usePassword = atom(!passkeySupport)
  let $autofillError = atom<string | undefined>()
  let autofill: AbortController | undefined

  let unbindUserId = $userId.listen(() => {
    $signError.set(undefined)
  })
  // Password manager fills the hidden field of passkey mode
  let unbindPassword = $password.listen(value => {
    $signError.set(undefined)
    if (value) $usePassword.set(true)
  })
  // User didn’t ask for autofill, so there is no reason to show network errors
  let unbindAutofill = $autofillError.listen(error => {
    if (error && error !== commonMessages.get().networkError) {
      $signError.set(error)
    }
  })

  function stopAutofill(): void {
    autofill?.abort()
    autofill = undefined
  }

  function submitByPasskey(conditional: boolean): () => Promise<boolean> {
    return createFormSubmit(
      async () => {
        try {
          let signal = conditional ? autofill?.signal : undefined
          await signInByPasskey({ conditional, signal })
        } catch (e) {
          if (e instanceof PasskeyNoPrfError) {
            $usePassword.set(true)
            throw new UserFacingError(commonMessages.get().passkeyNoPrf, {
              cause: e
            })
          }
          throw e
        }
      },
      conditional ? atom(false) : $signingIn,
      conditional ? $autofillError : $signError,
      SIGN_IN_ERRORS,
      commonMessages
    )
  }

  let byPasskey = submitByPasskey(false)
  let byAutofill = submitByPasskey(true)

  let byPassword = createFormSubmit(
    async () => {
      let password = $password.get()
      await signInByPassword($userId.get(), password)
      if (passkeySupport) void offerPasskey(password)
    },
    $signingIn,
    $signError,
    SIGN_IN_ERRORS,
    commonMessages
  )

  return {
    exit() {
      stopAutofill()
      unbindUserId()
      unbindPassword()
      unbindAutofill()
    },
    passkeySupport,
    password: $password,
    signError: $signError,
    signInByPasskey() {
      stopAutofill()
      return byPasskey()
    },
    signInByPassword() {
      stopAutofill()
      return byPassword()
    },
    signingIn: $signingIn,
    startAutofill() {
      if (!passkeySupport || autofill) return
      autofill = new AbortController()
      void byAutofill()
    },
    usePassword: $usePassword,
    userId: $userId
  }
}
