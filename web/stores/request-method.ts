import { extensionState, requestMethod } from '@slowreader/core'
import { computed } from 'nanostores'

export const usedRequestMethod = computed(
  [requestMethod, extensionState],
  (method, extension): 'extension' | 'proxy' => {
    return method !== 'proxy' && extension === 'granted' ? 'extension' : 'proxy'
  }
)
