import { SIGN_UP_ERRORS } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { generateCredentials, signUp, toSecret } from '../auth.ts'
import { getEnvironment } from '../environment.ts'
import { authMessages as t } from '../messages/index.ts'
import { encryptionKey, hasPassword, userId } from '../settings.ts'
import { createPage } from './common.ts'
import { injectCustomServerField } from './mixins/custom-server-field.ts'
import { createFormSubmit } from './mixins/form.ts'

export const signupPage = createPage('signup', () => {
  if (hasPassword.get()) {
    getEnvironment().openRoute({
      params: {},
      popups: [],
      route: 'profile'
    })
  }

  let $credentials = atom(
    generateCredentials(userId.get(), encryptionKey.get())
  )
  let $error = atom<string | undefined>()
  let $signingUp = atom(false)
  let $warningStep = atom(false)

  let customServerMixin = injectCustomServerField()

  let $hideMenu = atom<boolean>(false)

  let $userId = computed($credentials, credentials => credentials.userId)
  let $secret = computed($credentials, credentials => toSecret(credentials))
  let $mailTo = computed([$userId, $secret], (user, secret) => {
    return (
      `mailto:?` +
      `subject=Slow Reader Recovery Pack&` +
      `body=${encodeURIComponent(t.get().email({ secret, user }))}`
    )
  })

  let unbindServer = customServerMixin.customServer.listen(() => {
    $error.set(undefined)
  })
  let unbindPassword = hasPassword.listen(created => {
    if (created && !$signingUp.get()) {
      finish()
    }
  })

  function regenerate(): void {
    $error.set(undefined)
    $credentials.set(generateCredentials(userId.get(), encryptionKey.get()))
  }

  let createUser = createFormSubmit(
    () => signUp($credentials.get(), customServerMixin.customServer.get()),
    $signingUp,
    $error,
    SIGN_UP_ERRORS,
    t
  )

  function finish(): void {
    getEnvironment().openRoute({ params: {}, popups: [], route: 'home' })
  }

  return {
    ...customServerMixin,
    askAgain() {
      getEnvironment().savePassword({
        secret: $secret.get(),
        userId: $userId.get()
      })
    },
    credentials: $credentials,
    error: $error,
    exit() {
      unbindServer()
      unbindPassword()
    },
    finish,
    hideMenu: $hideMenu,
    mailTo: $mailTo,
    params: {},
    regenerate,
    secret: $secret,
    signingUp: $signingUp,
    async submit() {
      if (!userId.get()) $hideMenu.set(true)
      let created = await createUser()
      if (created) {
        $warningStep.set(true)
        await getEnvironment().savePassword({
          secret: $secret.get(),
          userId: $userId.get()
        })
      }
    },
    userId: $userId,
    warningStep: $warningStep
  }
})

export type SignupPage = ReturnType<typeof signupPage>
