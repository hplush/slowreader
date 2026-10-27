import { atom, computed } from 'nanostores'

import { nightLockState, unlockCurrentPage } from '../night-lock.ts'
import { nightLock } from '../settings.ts'
import { createPage } from './common.ts'

export const coachPage = createPage('coach', () => {
  let $nightLockEnabled = atom(false)

  let unbindNightLock = nightLock.subscribe(value => {
    $nightLockEnabled.set(value.enabled)
  })

  let unbindNightLockEnabled = $nightLockEnabled.listen(enabled => {
    if (enabled === nightLock.get().enabled) return
    // User, who has just enabled the lock, still needs to fix the period
    if (enabled) unlockCurrentPage()
    nightLock.set({ ...nightLock.get(), enabled })
  })

  return {
    changeNightLockFrom(hour: number) {
      nightLock.set({ ...nightLock.get(), from: hour })
    },
    changeNightLockTo(hour: number) {
      nightLock.set({ ...nightLock.get(), to: hour })
    },
    exit() {
      unbindNightLock()
      unbindNightLockEnabled()
    },
    locked: nightLockState,
    nightLockEnabled: $nightLockEnabled,
    nightLockFrom: computed(nightLock, lock => lock.from),
    nightLockTo: computed(nightLock, lock => lock.to),
    params: {}
  }
})

export type CoachPage = ReturnType<typeof coachPage>
