import { defineAction } from './utils.ts'

export interface DeleteUserAction {
  type: 'users/delete'
}

export const deleteUser = defineAction<DeleteUserAction>('users/delete')
