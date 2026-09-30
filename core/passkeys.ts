import {
  addedPasskeyAction,
  addPasskeyAction,
  deletedPasskeyAction,
  deletePasskeyAction,
  loadedPasskeysAction,
  type PasskeyValue,
  renamePasskeyAction
} from '@slowreader/api'

import { getPasskeyChallenge, type ReauthResult } from './auth.ts'
import { getClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { lockDataKey, passkeyUnlockKey } from './lib/keys.ts'
import { channelList } from './lib/stores.ts'
import {
  createWithPrf,
  filterProof,
  filterRegistration,
  PasskeyNoPrfError
} from './lib/webauthn.ts'
import { userId } from './settings.ts'

export type PasskeyItem = {
  createdAt: Date
  id: string
  lockedKey: string
  name: string
  provider: null | string
  synced: boolean
  usedAt: Date
}

function toItem(value: PasskeyValue): PasskeyItem {
  return {
    createdAt: new Date(value.createdAt),
    id: value.id,
    lockedKey: value.lockedKey,
    name: value.name,
    provider: value.provider,
    synced: value.synced,
    usedAt: new Date(value.usedAt)
  }
}

export const passkeysList = channelList<PasskeyItem>(
  'passkeys',
  (logux, list) => [
    logux.type(loadedPasskeysAction, action => {
      list.set(action.passkeys.map(toItem))
    }),
    logux.type(addedPasskeyAction, action => {
      list.update(items =>
        items.some(i => i.id === action.id) ? items : [...items, toItem(action)]
      )
    }),
    logux.type(renamePasskeyAction, action => {
      list.update(items =>
        items.map(i => (i.id === action.id ? { ...i, name: action.name } : i))
      )
    }),
    logux.type(deletedPasskeyAction, action => {
      list.update(items => items.filter(i => i.id !== action.id))
    })
  ]
)

export function getLoadedPasskeys(): PasskeyItem[] {
  let list = passkeysList.get()
  return list.status === 'ready' ? list.value : []
}

/**
 * Returns `false` if user cancelled the dialog.
 */
export async function addPasskey(
  reauth: ReauthResult,
  conditional?: boolean
): Promise<boolean> {
  let challenge = await getPasskeyChallenge('add')
  let created = await createWithPrf(challenge, userId.get()!, conditional)
  if (created.type === 'cancelled') return false
  if (created.type === 'noPrf') throw new PasskeyNoPrfError()
  let lockedKey = await lockDataKey(
    reauth.dataKey,
    await passkeyUnlockKey(created.prf)
  )
  await getClient().sync(
    addPasskeyAction({
      lockedKey,
      proof: filterProof(reauth.proof),
      response: filterRegistration(created.response)
    })
  )
  return true
}

export async function renamePasskey(id: string, name: string): Promise<void> {
  await getClient().sync(renamePasskeyAction({ id, name }))
}

export async function deletePasskey(
  id: string,
  reauth: ReauthResult,
  left: string[]
): Promise<void> {
  await getClient().sync(
    deletePasskeyAction({ id, proof: filterProof(reauth.proof) })
  )
  signalAcceptedPasskeys(left.filter(i => i !== id))
}

export function signalAcceptedPasskeys(ids: string[]): void {
  getEnvironment().signalPasskeys({
    ids,
    type: 'accepted',
    userId: userId.get()!
  })
}
