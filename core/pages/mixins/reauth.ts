import { atom, type WritableAtom } from 'nanostores'

import {
  type ReauthResult,
  reauthByPasskey,
  reauthByPassword
} from '../../auth.ts'
import { errorToMessage } from '../../errors.ts'
import { WrongPasswordError } from '../../lib/keys.ts'
import { PasskeyNoPrfError } from '../../lib/webauthn.ts'
import { cloudMessages as t } from '../../messages/index.ts'
import { getLoadedPasskeys } from '../../passkeys.ts'

/**
 * Asks the proof by an existing sign-in method before changes, which
 * a stolen session must not be able to do.
 */
export function injectReauth<Request extends { passwordOnly: boolean }>(
  run: (request: Request, proof: ReauthResult) => Promise<void>
): {
  askReauth: (request: Request) => void
  cancelReauth: () => void
  confirmByPasskey: () => Promise<void>
  confirmByPassword: () => Promise<void>
  reauth: WritableAtom<Request | undefined>
  reauthError: WritableAtom<string | undefined>
  reauthing: WritableAtom<boolean>
  reauthPassword: WritableAtom<string>
} {
  let $reauth = atom<Request | undefined>()
  let $reauthPassword = atom('')
  let $reauthError = atom<string | undefined>()
  let $reauthing = atom(false)

  async function confirm(
    getProof: () => Promise<ReauthResult | undefined>
  ): Promise<void> {
    let request = $reauth.get()
    if (!request) return
    $reauthError.set(undefined)
    $reauthing.set(true)
    try {
      let proof = await getProof()
      if (!proof) return
      $reauth.set(undefined)
      await run(request, proof)
    } catch (e) {
      $reauth.set(request)
      if (e instanceof WrongPasswordError) {
        $reauthError.set(t.get().wrongPassword)
      } else if (e instanceof PasskeyNoPrfError) {
        $reauthError.set(t.get().passkeyNoPrf)
      } else if (e instanceof Error && e.name === 'LoguxUndoError') {
        $reauthError.set(t.get().wrongProof)
      } else {
        $reauthError.set(errorToMessage(e))
      }
    } finally {
      $reauthing.set(false)
    }
  }

  return {
    askReauth(request) {
      $reauthError.set(undefined)
      $reauthPassword.set('')
      $reauth.set(request)
    },
    cancelReauth() {
      $reauth.set(undefined)
    },
    async confirmByPasskey() {
      if ($reauth.get()?.passwordOnly) return
      await confirm(() => reauthByPasskey(getLoadedPasskeys()))
    },
    confirmByPassword() {
      return confirm(() => reauthByPassword($reauthPassword.get()))
    },
    reauth: $reauth,
    reauthError: $reauthError,
    reauthing: $reauthing,
    reauthPassword: $reauthPassword
  }
}
