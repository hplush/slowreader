import { getEnvironment } from '../environment.ts'
import type { NetworkUse } from '../settings.ts'

/**
 * Only some browsers tell Wi-Fi from cellular, so the Wi-Fi option
 * is useless in others.
 */
export function canDetectNetwork(): boolean {
  let { type } = getEnvironment().networkType()
  return type === 'free' || type === 'paid'
}

export function canUseNetwork(setting: NetworkUse): boolean {
  if (setting !== 'free') return setting === 'always'
  let network = getEnvironment().networkType()
  return network.type !== 'paid' && !network.saveData
}
