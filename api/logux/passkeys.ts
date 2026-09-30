import type { Action } from '@logux/core'

import type { Proof } from '../types/auth.ts'
import { IS_LOCKED_KEY, isPasskeyName } from '../validators/auth.ts'
import { hasKey, hasOnlyKeys, hasStringKey } from '../validators/utils.ts'
import {
  isProof,
  isRegistrationResponse,
  type RegistrationResponse
} from '../validators/webauthn.ts'
import { defineAction } from './utils.ts'

export type PasskeyValue = {
  createdAt: number
  id: string
  lockedKey: string
  name: string
  provider: null | string
  synced: boolean
  usedAt: number
}

export interface AddPasskeyAction {
  lockedKey: string
  proof: Proof
  response: RegistrationResponse
  type: 'passkeys/add'
}

export const addPasskeyAction = defineAction<AddPasskeyAction>('passkeys/add')

export function isAddPasskeyAction(action: Action): action is AddPasskeyAction {
  return (
    hasOnlyKeys(action, ['lockedKey', 'proof', 'response', 'type']) &&
    hasStringKey(action, 'lockedKey') &&
    IS_LOCKED_KEY.test(action.lockedKey) &&
    hasKey(action, 'proof') &&
    isProof(action.proof) &&
    hasKey(action, 'response') &&
    isRegistrationResponse(action.response)
  )
}

export type AddedPasskeyAction = PasskeyValue & {
  type: 'passkeys/added'
  userId: string
}

export const addedPasskeyAction =
  defineAction<AddedPasskeyAction>('passkeys/added')

export interface RenamePasskeyAction {
  id: string
  name: string
  type: 'passkeys/rename'
}

export const renamePasskeyAction =
  defineAction<RenamePasskeyAction>('passkeys/rename')

export function isRenamePasskeyAction(
  action: Action
): action is RenamePasskeyAction {
  return (
    hasOnlyKeys(action, ['id', 'name', 'type']) &&
    hasStringKey(action, 'id') &&
    hasStringKey(action, 'name') &&
    isPasskeyName(action.name)
  )
}

export interface DeletePasskeyAction {
  id: string
  proof: Proof
  type: 'passkeys/delete'
}

export const deletePasskeyAction =
  defineAction<DeletePasskeyAction>('passkeys/delete')

export function isDeletePasskeyAction(
  action: Action
): action is DeletePasskeyAction {
  return (
    hasOnlyKeys(action, ['id', 'proof', 'type']) &&
    hasStringKey(action, 'id') &&
    hasKey(action, 'proof') &&
    isProof(action.proof)
  )
}

export interface DeletedPasskeyAction {
  id: string
  type: 'passkeys/deleted'
  userId: string
}

export const deletedPasskeyAction =
  defineAction<DeletedPasskeyAction>('passkeys/deleted')

export interface LoadedPasskeysAction {
  passkeys: PasskeyValue[]
  type: 'passkeys/loaded'
}

export const loadedPasskeysAction =
  defineAction<LoadedPasskeysAction>('passkeys/loaded')
