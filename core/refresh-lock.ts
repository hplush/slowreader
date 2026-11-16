import {
  refreshLock as lockAction,
  refreshLocked,
  refreshUnlock,
  refreshUnlocked
} from '@slowreader/api'
import { atom } from 'nanostores'

import { client, isOffline, onClient } from './client.ts'
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
 * Prevents multiple clients to refreshing in the same moment creating
 * a lot of write conflicts.
 */
export function requestRefreshLock(onLostLock: () => void): Promise<boolean> {
  let logux = client.get()
  if (!logux || !hasCloud.get()) return Promise.resolve(true)
  stopWatching()
  answer = undefined
  return new Promise(resolve => {
    let ask = (): void => {
      void logux.log.add(lockAction({}), { sync: true })
    }
    let start = (): void => {
      onLost = onLostLock
      resolve(true)
    }
    let asked = logux.state === 'synchronized'
    unwatch = logux.on('state', () => {
      if (logux.state === 'disconnected') {
        if (isOffline()) {
          answer = undefined
          start()
        }
        // Server unlocks on disconnect. Phone drops the connection of the app
        // in the background, so it must not stop the refresh.
        if (!answer) refreshLock.set('free')
      } else if (logux.state === 'connecting') {
        asked = false
      } else if (!asked && logux.state === 'synchronized') {
        // Request is not saved to the log, so it is lost with the connection
        // or if the leader tab was closed before the answer. New leader
        // connects without `disconnected` state.
        asked = true
        ask()
      }
    })
    if (isOffline()) {
      start()
    } else {
      refreshLock.set('waiting')
      answer = holder => {
        answer = undefined
        if (holder === logux.nodeId) {
          refreshLock.set('mine')
          start()
        } else {
          stopWatching()
          refreshLock.set('other')
          resolve(false)
        }
      }
      if (asked) ask()
    }
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
      if (onLost) loseRefreshLock()
      refreshLock.set('other')
    } else if (onLost) {
      refreshLock.set('mine')
    } else {
      // Refresh was finished before the answer to the request after reconnect
      void logux.log.add(refreshUnlock({}), { sync: true })
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
  // Unlock could be missed offline. Server sends the lock again on reconnect.
  let unbindState = logux.on('state', () => {
    if (logux.state === 'disconnected' && refreshLock.get() === 'other') {
      refreshLock.set('free')
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
    unbindState()
    unbindExit()
    answer?.('')
    stopWatching()
    refreshLock.set('free')
  }
})
