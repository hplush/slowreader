import {
  changedSessionAction,
  createdSessionAction,
  deletedSessionAction,
  deleteOtherSessions,
  deleteSessionAction,
  loadedSessionsAction,
  type SessionValue
} from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { getClient } from './client.ts'
import { channelList, type Loadable } from './lib/stores.ts'
import { cloudMessages } from './messages/index.ts'
import { passkeysList } from './passkeys.ts'

/**
 * ID of the session of this device. Server sends it with the sessions list.
 */
export const currentSessionId = atom<string | undefined>()

export type SessionMethod =
  | { name: string; type: 'passkey' }
  | { type: 'deleted' }
  | { type: 'password' }

export type SessionItem = {
  browser: string
  createdAt: Date
  current: boolean
  id: string
  method: SessionMethod
  name: string
  online: boolean
  os: string
  usedAt: Date
}

let rawSessions = channelList<SessionValue>('sessions', (logux, list) => [
  logux.type(loadedSessionsAction, action => {
    currentSessionId.set(action.current ?? undefined)
    list.set(action.sessions)
  }),
  logux.type(createdSessionAction, action => {
    list.update(items =>
      items.some(i => i.id === action.id) ? items : [...items, action]
    )
  }),
  logux.type(changedSessionAction, action => {
    list.update(items =>
      items.map(i =>
        i.id === action.id
          ? { ...i, online: action.online, usedAt: action.usedAt }
          : i
      )
    )
  }),
  logux.type(deletedSessionAction, action => {
    list.update(items => items.filter(i => i.id !== action.id))
  }),
  () => {
    currentSessionId.set(undefined)
  }
])

/**
 * Current device first, then by last usage.
 */
export const sessionsList = computed(
  [rawSessions, passkeysList, currentSessionId, cloudMessages],
  (list, keys, current, t): Loadable<SessionItem[]> => {
    if (list.status === 'loading') return list
    let value = list.value
      .map((session): SessionItem => {
        let [browser = '', os = ''] = session.device.split('|')
        let method: SessionMethod = { type: 'password' }
        if (session.passkeyId) {
          let passkey =
            keys.status === 'ready'
              ? keys.value.find(i => i.id === session.passkeyId)
              : undefined
          method = passkey
            ? { name: passkey.name, type: 'passkey' }
            : { type: 'deleted' }
        }
        return {
          browser,
          createdAt: new Date(session.createdAt),
          current: session.id === current,
          id: session.id,
          method,
          name:
            browser && os
              ? t.device({ browser, os })
              : browser || os || t.unknownDevice,
          online: session.online,
          os,
          usedAt: new Date(session.usedAt)
        }
      })
      .toSorted((a, b) => {
        if (a.current !== b.current) return a.current ? -1 : 1
        return b.usedAt.getTime() - a.usedAt.getTime()
      })
    return { status: 'ready', value }
  }
)

export async function deleteSession(id: string): Promise<void> {
  await getClient().sync(deleteSessionAction({ id }))
}

export async function signOutOtherDevices(): Promise<void> {
  await getClient().sync(deleteOtherSessions({}))
}
