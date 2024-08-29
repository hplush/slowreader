import { defineAction } from '@logux/actions'

export interface SetPasswordAction {
  password: string
  type: 'passwords/set'
  userId?: string
}

export const setPassword = defineAction<SetPasswordAction>('passwords/set')

export interface DeletePasswordAction {
  type: 'passwords/delete'
}

export const deletePassword =
  defineAction<DeletePasswordAction>('passwords/delete')
