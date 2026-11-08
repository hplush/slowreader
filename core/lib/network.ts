import { persistentAtom } from '@nanostores/persistent'
import { atom, computed, type ReadableAtom } from 'nanostores'

import { type Network, onEnvironment } from '../environment.ts'
import type { NetworkUse } from '../settings.ts'

export type SaveDataMode = 'auto' | 'off' | 'on' | 'paid'

/**
 * Not synced, because only the device knows its network.
 */
export const saveDataMode = persistentAtom<SaveDataMode>(
  'slowreader:saveData',
  'auto'
)

let $network = atom<Network>({ saveData: undefined, type: undefined })

onEnvironment(env => {
  return env.onNetwork(network => {
    if (network.type === 'unknown') {
      // Desktop Chrome has `saveData` without OS setting to change it
      $network.set({ saveData: undefined, type: 'unknown' })
    } else {
      $network.set(network)
    }
  })
})

/**
 * Only some browsers tell Wi-Fi from cellular, so the Wi-Fi option
 * is useless in others.
 */
export function canDetectNetwork(): boolean {
  let { type } = $network.get()
  return type === 'free' || type === 'paid'
}

export function canDetectSaveData(): boolean {
  return $network.get().saveData !== undefined
}

export const saveData: ReadableAtom<boolean> = computed(
  [saveDataMode, $network],
  (mode, network) => {
    if (mode === 'auto') return !!network.saveData
    if (mode === 'paid') return network.type === 'paid'
    return mode === 'on'
  }
)

export function isSaveData(): boolean {
  return saveData.get()
}

export function canUseNetwork(setting: NetworkUse): boolean {
  if (isSaveData()) return false
  if (setting !== 'free') return setting === 'always'
  return $network.get().type !== 'paid'
}
