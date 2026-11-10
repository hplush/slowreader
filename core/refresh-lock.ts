import {
  refreshLock as lockAction,
  refreshLocked,
  refreshUnlock,
  refreshUnlocked
} from '@slowreader/api'
import { atom } from 'nanostores'

import { client, onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { hasCloud, lastRefresh } from './settings.ts'

export type RefreshLockState = 'free' | 'mine' | 'other' | 'waiting'

/**
 * Only one tab of the user’s devices loads new posts at a time,
 * so devices will not load and save the same posts.
 */
export const refreshLock = atom<RefreshLockState>('free')

let answer: ((holder: string) => void) | undefined
let onLost: (() => void) | undefined
let unwatch: (() => void) | undefined

function stopWatching(): void {
  unwatch?.()
  unwatch = undefined
  onLost = undefined
}

function loseRefreshLock(): void {
  let lost = onLost
  stopWatching()
  refreshLock.set('free')
  lost?.()
}

/**
 * Returns `false` if another tab already loads posts.
 *
 * Without the cloud and without the connection refresh goes without lock,
 * but it stops when the connection comes back. `onLost` is called when
 * the lock or the connection is lost.
 */
export function requestRefreshLock(onLostLock: () => void): Promise<boolean> {
  let logux = client.get()
  if (!logux || !hasCloud.get()) return Promise.resolve(true)
  stopWatching()
  onLost = onLostLock
  if (logux.state === 'disconnected') {
    unwatch = logux.on('state', () => {
      if (logux.state !== 'disconnected') loseRefreshLock()
    })
    return Promise.resolve(true)
  }
  refreshLock.set('waiting')
  return new Promise(resolve => {
    unwatch = logux.on('state', () => {
      if (logux.state === 'disconnected') {
        if (answer) {
          answer = undefined
          stopWatching()
          refreshLock.set('free')
          resolve(false)
        } else {
          loseRefreshLock()
        }
      }
    })
    answer = holder => {
      answer = undefined
      if (holder === logux.nodeId) {
        refreshLock.set('mine')
        resolve(true)
      } else {
        stopWatching()
        refreshLock.set('other')
        resolve(false)
      }
    }
    void logux.log.add(lockAction({}), { sync: true })
  })
}

export function releaseRefreshLock(): void {
  let logux = client.get()
  if (logux && refreshLock.get() === 'mine') {
    void logux.log.add(refreshUnlock({}), { sync: true })
  }
  stopWatching()
  refreshLock.set('free')
}

onClient(logux => {
  // Request sent offline is not a wish to refresh after reconnect
  let unbindPreadd = logux.log.on('preadd', (action, meta) => {
    if (lockAction.match(action) || refreshUnlock.match(action)) {
      meta.reasons = meta.reasons.filter(reason => reason !== 'syncing')
    }
  })
  let unbindLocked = logux.type(refreshLocked, action => {
    if (answer) {
      answer(action.nodeId)
    } else if (action.nodeId !== logux.nodeId) {
      if (refreshLock.get() === 'mine') loseRefreshLock()
      refreshLock.set('other')
    }
  })
  let unbindUnlocked = logux.type(refreshUnlocked, () => {
    if (refreshLock.get() === 'mine') {
      loseRefreshLock()
    } else if (refreshLock.get() === 'other') {
      refreshLock.set('free')
      // Auto refresh should not start right after another device
      lastRefresh.set(Date.now())
    }
  })
  let unbindExit = getEnvironment().onExit(() => {
    if (refreshLock.get() === 'mine') {
      void logux.log.add(refreshUnlock({}), { sync: true })
    }
  })
  return () => {
    unbindPreadd()
    unbindLocked()
    unbindUnlocked()
    unbindExit()
    answer?.('')
    stopWatching()
    refreshLock.set('free')
  }
})
