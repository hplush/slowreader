import type { NetworkTypeDetector } from '@slowreader/core'

export const detectNetworkType: NetworkTypeDetector = () => {
  if (!navigator.connection) {
    return 'undetectable'
  } else if (navigator.connection.type === 'cellular') {
    return 'paid'
  } else if (
    navigator.connection.type === 'wifi' ||
    navigator.connection.type === 'ethernet'
  ) {
    return 'free'
  } else {
    return 'unknown'
  }
}
