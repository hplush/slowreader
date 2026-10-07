import { deleteUser } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { generateNewPassword, signOut } from '../auth.ts'
import { getClient, syncStatus } from '../client.ts'
import { getEnvironment } from '../environment.ts'
import { authMessages } from '../messages/index.ts'
import {
  addPasskey,
  deletePasskey,
  getLoadedPasskeys,
  passkeysList,
  signalAcceptedPasskeys
} from '../passkeys.ts'
import { router } from '../router.ts'
import { sessionsList, signOutOtherDevices } from '../sessions.ts'
import { hasCloud, passkeyOnly, userId } from '../settings.ts'
import { createPage } from './common.ts'
import { injectReauth } from './mixins/reauth.ts'

export type CloudRequest =
  | { passkeyId: string; passwordOnly: boolean; type: 'deletePasskey' }
  | { passwordOnly: false; type: 'addPasskey' | 'newPassword' }

export const cloudPage = createPage('cloud', () => {
  let { passkeySupport } = getEnvironment()
  let $deletingAccount = atom(false)
  let $newPassword = atom<string | undefined>()
  let $firstPassword = atom(false)

  function saveNewPassword(): Promise<void> {
    return getEnvironment().savePassword({
      password: $newPassword.get() ?? '',
      userId: userId.get() ?? ''
    })
  }

  let reauth = injectReauth<CloudRequest>(async (request, proof) => {
    if (request.type === 'addPasskey') {
      await addPasskey(proof)
    } else if (request.type === 'deletePasskey') {
      await deletePasskey(
        request.passkeyId,
        proof,
        getLoadedPasskeys().map(i => i.id)
      )
    } else {
      let first = passkeyOnly.get()
      $newPassword.set(await generateNewPassword(proof))
      $firstPassword.set(first)
      void saveNewPassword()
    }
  })

  let signaled = false
  let unbinds = [
    passkeysList.subscribe(list => {
      if (list.status === 'ready' && !signaled) {
        signaled = true
        signalAcceptedPasskeys(list.value.map(i => i.id))
      }
    }),
    sessionsList.listen(() => {})
  ]

  return {
    ...reauth,
    addPasskey(): void {
      reauth.askReauth({ passwordOnly: false, type: 'addPasskey' })
    },
    async deleteAccount(): Promise<void> {
      $deletingAccount.set(true)
      await getClient().sync(deleteUser({}))
      await signOut()
    },
    deleteOtherSessions: signOutOtherDevices,
    deletingAccount: $deletingAccount,
    /**
     * The last passkey can be deleted only with the password proof,
     * so the user will not lock themselves out.
     */
    deletePasskey(id: string): void {
      reauth.askReauth({
        passkeyId: id,
        passwordOnly: getLoadedPasskeys().length <= 1,
        type: 'deletePasskey'
      })
    },
    exit() {
      for (let unbind of unbinds) unbind()
    },
    /**
     * Account had no password before, so there is no old password
     * to warn about.
     */
    firstPassword: $firstPassword,
    finishNewPassword(): void {
      $newPassword.set(undefined)
    },
    generateNewPassword(): void {
      reauth.askReauth({ passwordOnly: false, type: 'newPassword' })
    },
    hasCloud,
    newPassword: $newPassword,
    newPasswordMailTo: computed([userId, $newPassword], (user, password) => {
      return (
        `mailto:?` +
        `subject=Slow Reader Recovery Pack&` +
        `body=${encodeURIComponent(
          authMessages
            .get()
            .email({ password: password ?? '', user: user ?? '' })
        )}`
      )
    }),
    /**
     * ID of the passkey or session in the opened popup.
     */
    opened: computed(router, route => route.popups[0]?.param),
    params: {},
    passkeys: passkeysList,
    passkeyOnly,
    passkeySupport,
    sessions: sessionsList,
    stagingServer: getEnvironment().server === 'dev.slowreader.app',
    suggestSecondPasskey: computed(passkeysList, list => {
      return (
        list.status === 'ready' &&
        list.value.length === 1 &&
        !list.value[0]!.synced
      )
    }),
    unsavedData: computed(syncStatus, status => /wait/i.test(status)),
    userId
  }
})

export type CloudPage = ReturnType<typeof cloudPage>
