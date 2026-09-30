import type { Action } from '@logux/core'

import { hasOnlyKeys } from '../validators/utils.ts'
import { defineAction } from './utils.ts'

export interface DeleteUserAction {
  type: 'users/delete'
}

export const deleteUser = defineAction<DeleteUserAction>('users/delete')

export function isDeleteUserAction(action: Action): action is DeleteUserAction {
  return hasOnlyKeys(action, ['type'])
}
