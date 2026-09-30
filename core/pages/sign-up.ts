import { SIGN_UP_ERRORS } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import {
  generateCredentials,
  signUpByPasskey,
  signUpByPassword
} from '../auth.ts'
import { getEnvironment } from '../environment.ts'
import { UserFacingError } from '../errors.ts'
import { authMessages as t } from '../messages/index.ts'
import { hasCloud, userId } from '../settings.ts'
import { createPage } from './common.ts'
import { createFormSubmit } from './mixins/form.ts'

/**
 * Synced passkey skips the password step, because the account has
 * no password. Device-bound passkey still needs a backup password.
 */
export type SignUpStep =
  | { provider: null | string; type: 'passkey' }
  | { type: 'form' }
  | { type: 'password' }

export const signUpPage = createPage('signUp', () => {
  if (hasCloud.get()) {
    getEnvironment().openRoute({
      params: {},
      popups: [],
      route: 'cloud'
    })
  }

  let { passkeySupport } = getEnvironment()
  let $credentials = atom(generateCredentials(userId.get()))
  let $error = atom<string | undefined>()
  let $signingUp = atom(false)
  let $step = atom<SignUpStep>({ type: 'form' })
  let $usePassword = atom(!passkeySupport)

  let $hideMenu = atom<boolean>(false)

  let $userId = computed($credentials, credentials => credentials.userId)
  let $password = computed($credentials, credentials => credentials.password)
  let $mailTo = computed([$userId, $password], (user, password) => {
    return (
      `mailto:?` +
      `subject=Slow Reader Recovery Pack&` +
      `body=${encodeURIComponent(t.get().email({ password, user }))}`
    )
  })

  let unbindPassword = hasCloud.listen(created => {
    if (created && !$signingUp.get()) {
      finish()
    }
  })

  function regenerate(): void {
    $error.set(undefined)
    $credentials.set(generateCredentials(userId.get()))
  }

  function savePassword(): Promise<void> {
    return getEnvironment().savePassword({
      password: $password.get(),
      userId: $userId.get()
    })
  }

  let createUser = createFormSubmit(
    async () => {
      if ($usePassword.get()) {
        await signUpByPassword($credentials.get())
        $step.set({ type: 'password' })
      } else {
        let result = await signUpByPasskey($credentials.get())
        if (result.type === 'passkey' && result.passkey.synced) {
          finish()
        } else if (result.type === 'passkey') {
          $step.set({ provider: result.passkey.provider, type: 'passkey' })
        } else if (result.type === 'noPrf') {
          throw new UserFacingError(t.get().passkeyNoPrf)
        }
      }
    },
    $signingUp,
    $error,
    SIGN_UP_ERRORS,
    t
  )

  function finish(): void {
    getEnvironment().openRoute({ params: {}, popups: [], route: 'home' })
  }

  return {
    /**
     * Second passkey on another device replaces the backup password
     * for a device-bound passkey.
     */
    addAnotherPasskey(): void {
      getEnvironment().openRoute({ params: {}, popups: [], route: 'cloud' })
    },
    askAgain: savePassword,
    credentials: $credentials,
    error: $error,
    exit() {
      unbindPassword()
    },
    finish,
    hideBusy: computed(
      [$signingUp, $step],
      (signing, step) => signing || step.type !== 'form'
    ),
    hideMenu: $hideMenu,
    mailTo: $mailTo,
    params: {},
    passkeySupport,
    password: $password,
    regenerate,
    signingUp: $signingUp,
    step: $step,
    async submit() {
      if (!userId.get()) $hideMenu.set(true)
      let created = await createUser()
      if (created && $step.get().type === 'password') {
        await savePassword()
      } else if ($step.get().type === 'form') {
        $hideMenu.set(false)
      }
    },
    usePassword: $usePassword,
    userId: $userId
  }
})

export type SignUpPage = ReturnType<typeof signUpPage>
