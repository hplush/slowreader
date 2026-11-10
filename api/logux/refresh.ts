import type { Action } from '@logux/core'

import { hasOnlyKeys } from '../validators/utils.ts'
import { defineAction } from './utils.ts'

export interface RefreshLockAction {
  type: 'refresh/lock'
}

export const refreshLock = defineAction<RefreshLockAction>('refresh/lock')

export function isRefreshLockAction(
  action: Action
): action is RefreshLockAction {
  return hasOnlyKeys(action, ['type'])
}

export interface RefreshUnlockAction {
  type: 'refresh/unlock'
}

export const refreshUnlock = defineAction<RefreshUnlockAction>('refresh/unlock')

export function isRefreshUnlockAction(
  action: Action
): action is RefreshUnlockAction {
  return hasOnlyKeys(action, ['type'])
}

export interface RefreshLockedAction {
  nodeId: string
  type: 'refresh/locked'
}

export const refreshLocked = defineAction<RefreshLockedAction>('refresh/locked')

export interface RefreshUnlockedAction {
  type: 'refresh/unlocked'
}

export const refreshUnlocked =
  defineAction<RefreshUnlockedAction>('refresh/unlocked')
