import { SIGN_IN_ERRORS } from '@slowreader/api'
import { atom } from 'nanostores'

import {
  type Credentials,
  generateCredentials,
  signIn,
  useCredentials
} from '../auth.ts'
import { getEnvironment } from '../environment.ts'
import { HTTPRequestError } from '../lib/http.ts'
import { commonMessages, startMessages as t } from '../messages/index.ts'
import { createPage } from './common.ts'

export const startPage = createPage('start', () => {
  let $userId = atom('')
  let $secret = atom('')
  let $signingIn = atom(false)
  let $signError = atom<string | undefined>()
  let $customServer = atom<string | undefined>()

  let unbindServer = $customServer.listen(() => {
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
    if (!password || !encryptionKey || !userId) {
      /* c8 ignore next 2 */
      throw new Error('Invalid data')
    }
    return {
      encryptionKey,
      password,
      userId
    }
  }

  return {
    customServer: $customServer,
    exit() {
      unbindServer()
      unbindUserId()
      unbindSecret()
    },
    params: {},
    resetCustomServer() {
      $customServer.set(undefined)
    },
    secret: $secret,
    showCustomServer() {
      $customServer.set('server.slowreader.app')
    },
    signError: $signError,
    async signIn(): Promise<void> {
      $signError.set(undefined)
      $signingIn.set(true)
      try {
        await signIn(validateCredential(), $customServer.get())
      } catch (e: unknown) {
        if (HTTPRequestError.is(e)) {
          if (e.message === SIGN_IN_ERRORS.INVALID_CREDENTIALS) {
            $signError.set(t.get().invalidCredentials)
          } else {
            $signError.set(e.message)
          }
        } else {
          /* c8 ignore next 3 */
          if (e instanceof Error) getEnvironment().warn(e)
          $signError.set(commonMessages.get().internalError)
        }
      } finally {
        $signingIn.set(false)
      }
    },
    signingIn: $signingIn,
    startLocal(): void {
      useCredentials(generateCredentials())
    },
    userId: $userId
  }
})

export type StartPage = ReturnType<typeof startPage>
