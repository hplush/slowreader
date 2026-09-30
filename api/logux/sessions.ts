import type { Action } from '@logux/core'

import { hasOnlyKeys, hasStringKey } from '../validators/utils.ts'
import { defineAction } from './utils.ts'

export type SessionValue = {
  createdAt: number
  device: string
  id: string
  online: boolean
  passkeyId: null | string
  usedAt: number
}

export interface DeleteSessionAction {
  id: string
  type: 'sessions/delete'
}

export const deleteSessionAction =
  defineAction<DeleteSessionAction>('sessions/delete')

export function isDeleteSessionAction(
  action: Action
): action is DeleteSessionAction {
  return hasOnlyKeys(action, ['id', 'type']) && hasStringKey(action, 'id')
}

export interface DeleteOtherSessionsAction {
  type: 'sessions/deleteOthers'
}

export const deleteOtherSessions = defineAction<DeleteOtherSessionsAction>(
  'sessions/deleteOthers'
)

export function isDeleteOtherSessionsAction(
  action: Action
): action is DeleteOtherSessionsAction {
  return hasOnlyKeys(action, ['type'])
}

export interface LoadedSessionsAction {
  current: null | string
  sessions: SessionValue[]
  type: 'sessions/loaded'
}

export const loadedSessionsAction =
  defineAction<LoadedSessionsAction>('sessions/loaded')

export type CreatedSessionAction = SessionValue & {
  type: 'sessions/created'
  userId: string
}

export const createdSessionAction =
  defineAction<CreatedSessionAction>('sessions/created')

export interface ChangedSessionAction {
  id: string
  online: boolean
  type: 'sessions/changed'
  usedAt: number
  userId: string
}

export const changedSessionAction =
  defineAction<ChangedSessionAction>('sessions/changed')

export interface DeletedSessionAction {
  id: string
  type: 'sessions/deleted'
  userId: string
}

export const deletedSessionAction =
  defineAction<DeletedSessionAction>('sessions/deleted')
