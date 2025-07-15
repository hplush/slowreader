import { SIGN_UP_ERRORS } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { generateCredentials, signUp, toSecret } from '../auth.ts'
import { getEnvironment } from '../environment.ts'
import { HTTPRequestError } from '../lib/http.ts'
import { commonMessages, signupMessages as t } from '../messages/index.ts'
import { encryptionKey, hasPassword, userId } from '../settings.ts'
import { createPage } from './common.ts'

export const signupPage = createPage('signup', () => {
  let $credentials = atom(
    generateCredentials(userId.get(), encryptionKey.get())
  )
  let $customServer = atom<string | undefined>()
  let $error = atom<string | undefined>()
  let $signingUp = atom(false)
  let $warningStep = atom(false)

  let $userId = computed($credentials, credentials => credentials.userId)
  let $secret = computed($credentials, credentials => toSecret(credentials))

  let unbindServer = $customServer.listen(() => {
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

  async function submit(): Promise<void> {
    $error.set(undefined)
    $signingUp.set(true)
    try {
      await signUp($credentials.get(), $customServer.get())
      $warningStep.set(true)
    } catch (e: unknown) {
      if (HTTPRequestError.is(e)) {
        if (e.message === SIGN_UP_ERRORS.USER_ID_TAKEN) {
          if (!userId.get()) {
            regenerate()
            await submit()
          } else {
            $error.set(t.get().userIdTaken)
          }
        } else {
          $error.set(e.message)
        }
      } else {
        /* c8 ignore next 3 */
        if (e instanceof Error) getEnvironment().warn(e)
        $error.set(commonMessages.get().internalError)
      }
    } finally {
      $signingUp.set(false)
    }
  }

  function finish(): void {
    getEnvironment().openRoute({ params: {}, popups: [], route: 'home' })
  }

  return {
    customServer: $customServer,
    error: $error,
    exit() {
      unbindServer()
      unbindPassword()
    },
    finish,
    params: {},
    regenerate,
    resetCustomServer() {
      $customServer.set(undefined)
    },
    secret: $secret,
    showCustomServer() {
      $customServer.set('server.slowreader.app')
    },
    signingUp: $signingUp,
    submit,
    userId: $userId,
    warningStep: $warningStep
  }
})

export type SignupPage = ReturnType<typeof signupPage>
